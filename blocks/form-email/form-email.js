const PRIVACY_POLICY_PATH = '/us/privacy-policy';
const PRIVACY_POLICY_HOST = 'https://www.lundbeck.com';

// Default copy — used as-is until an author overrides it in the block's config rows.
const DEFAULT_COPY = {
  title: 'Email this resource',
  requiredNote: 'All fields are required',
  firstNameLabel: 'First Name',
  lastNameLabel: 'Last Name',
  emailLabel: 'Email address',
  submitLabel: 'Send',
  successTitle: 'Thank you!',
  successText: 'Your resource is on its way to your inbox.',
  privacyText: 'Lundbeck will not save your personal information. See our ',
  privacyLinkLabel: 'Privacy Policy',
};

function getPrivacyPolicyUrl() {
  return new URL(PRIVACY_POLICY_PATH, PRIVACY_POLICY_HOST).href;
}

// Reads authored key/value rows (label | text) into the copy object, keeping
// defaults for any key an author left out. Missing block or keys fall back cleanly.
function parseCopy(block) {
  const copy = { ...DEFAULT_COPY };

  const overrides = new Map();
  block.querySelectorAll(':scope > div').forEach((row) => {
    const cells = [...row.children];
    if (cells.length < 2) return;
    overrides.set(cells[0].textContent.trim(), cells[1].textContent.trim());
  });

  Object.keys(DEFAULT_COPY).forEach((key) => {
    const value = overrides.get(key);
    // key is a literal from DEFAULT_COPY, not user input — no pollution risk
    // eslint-disable-next-line secure-coding/detect-object-injection
    if (value) copy[key] = value;
  });

  const privacyLink = block.querySelector('a[href]');
  if (privacyLink) copy.privacyHref = privacyLink.href;

  return copy;
}

function normalizeName(value) {
  return value.replace(/['‘’]/g, "'").trim();
}

function isValidName(value) {
  if (!value || value.length > 20) return false;
  let hasLetter = false;
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    const code = value.charCodeAt(i);
    const isLetter = (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
    if (isLetter) hasLetter = true;
    if (!(isLetter || char === ' ' || char === "'" || char === '-')) return false;
  }
  return hasLetter;
}

function isValidEmail(value) {
  if (!value || value.length < 6 || value.length > 50) return false;
  const probe = document.createElement('input');
  probe.type = 'email';
  probe.value = value;
  return probe.checkValidity();
}

function showFieldError(input, message) {
  const errorEl = input.closest('.form-email-field')?.querySelector('.form-email-field-error');
  if (errorEl instanceof HTMLElement) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
  input.setAttribute('aria-invalid', 'true');
}

function clearFieldError(input) {
  const errorEl = input.closest('.form-email-field')?.querySelector('.form-email-field-error');
  if (errorEl instanceof HTMLElement) {
    errorEl.hidden = true;
    errorEl.textContent = '';
  }
  input.removeAttribute('aria-invalid');
}

function validateForm(form) {
  let valid = true;
  const firstName = form.querySelector('input[name="FirstName"]');
  const lastName = form.querySelector('input[name="LastName"]');
  const email = form.querySelector('input[name="Email"]');

  [firstName, lastName, email].forEach((input) => {
    if (input instanceof HTMLInputElement) clearFieldError(input);
  });

  if (firstName instanceof HTMLInputElement) {
    const value = normalizeName(firstName.value);
    if (!value) {
      showFieldError(firstName, 'Please enter your first name');
      valid = false;
    } else if (!isValidName(value)) {
      showFieldError(firstName, 'Please enter a valid first name');
      valid = false;
    }
  }

  if (lastName instanceof HTMLInputElement) {
    const value = normalizeName(lastName.value);
    if (!value) {
      showFieldError(lastName, 'Please enter your last name');
      valid = false;
    } else if (!isValidName(value)) {
      showFieldError(lastName, 'Please enter a valid last name');
      valid = false;
    }
  }

  if (email instanceof HTMLInputElement) {
    const value = email.value.trim();
    if (!isValidEmail(value)) {
      showFieldError(email, 'Please enter a valid email address');
      valid = false;
    }
  }

  return valid;
}

function createField(id, labelText, inputName, inputType, autocomplete) {
  const field = document.createElement('div');
  field.className = 'form-email-field';

  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = labelText;

  const input = document.createElement('input');
  input.id = id;
  input.name = inputName;
  input.type = inputType;
  input.maxLength = inputName === 'Email' ? 50 : 20;
  input.autocomplete = autocomplete;
  input.required = true;

  const error = document.createElement('p');
  error.className = 'form-email-field-error';
  error.hidden = true;

  field.append(label, input, error);
  return field;
}

export default function decorate(block) {
  const copy = parseCopy(block);

  const title = document.createElement('h2');
  title.className = 'form-email-title';
  title.textContent = copy.title;

  const body = document.createElement('div');
  body.className = 'form-email-body';

  const form = document.createElement('form');
  form.className = 'form-email-form';
  form.noValidate = true;

  const requiredNote = document.createElement('p');
  requiredNote.className = 'form-email-required-note';
  requiredNote.textContent = copy.requiredNote;

  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.className = 'form-email-submit';
  submitButton.append(document.createTextNode(`${copy.submitLabel} `));
  const submitIcon = document.createElement('span');
  submitIcon.className = 'form-email-submit-icon';
  submitIcon.setAttribute('aria-hidden', 'true');
  submitButton.append(submitIcon);

  form.append(
    requiredNote,
    createField('form-email-first-name', copy.firstNameLabel, 'FirstName', 'text', 'given-name'),
    createField('form-email-last-name', copy.lastNameLabel, 'LastName', 'text', 'family-name'),
    createField('form-email-address', copy.emailLabel, 'Email', 'email', 'email'),
    submitButton,
  );

  const terms = document.createElement('div');
  terms.className = 'form-email-terms';
  const termsParagraph = document.createElement('p');
  termsParagraph.append(document.createTextNode(copy.privacyText));
  const privacyLink = document.createElement('a');
  privacyLink.href = copy.privacyHref || getPrivacyPolicyUrl();
  privacyLink.target = '_blank';
  privacyLink.rel = 'noopener noreferrer';
  privacyLink.textContent = copy.privacyLinkLabel;
  termsParagraph.append(privacyLink, document.createTextNode('.'));
  terms.append(termsParagraph);

  body.append(form, terms);

  const success = document.createElement('div');
  success.className = 'form-email-success';
  success.hidden = true;
  const successTitle = document.createElement('p');
  successTitle.className = 'form-email-success-title';
  successTitle.textContent = copy.successTitle;
  const successText = document.createElement('p');
  successText.className = 'form-email-success-text';
  successText.textContent = copy.successText;
  success.append(successTitle, successText);

  // Placeholder submit: the live endpoint is wired up separately. For now a valid
  // form transitions straight to the success state.
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validateForm(form)) return;
    title.hidden = true;
    body.hidden = true;
    success.hidden = false;
  });

  block.textContent = '';
  block.append(title, body, success);
}
