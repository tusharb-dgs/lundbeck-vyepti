import { ERROR_MESSAGES, SELECTORS } from './constants.js';

export function removeError(field) {
  field.classList.remove('field-error');
  const wrapper = field.closest('.field-wrapper');
  if (!wrapper) {return;}
  wrapper.querySelector('.ugc-error')?.remove();
}

export function showError(field, message) {
  removeError(field);
  field.classList.add('field-error');
  const wrapper = field.closest('.field-wrapper');
  if (!wrapper) {return;}

  const error = document.createElement('div');
  error.className = 'ugc-error';
  error.textContent = message;
  wrapper.appendChild(error);
}

export function validateField(field) {
  const value = field?.value?.trim?.() || '';

  switch (field.name) {
    case 'firstName': value ? removeError(field) : showError(field, ERROR_MESSAGES.firstName);
      break;

    case 'lastName': value ? removeError(field) : showError(field, ERROR_MESSAGES.lastName);
      break;

    case 'email': {
      if (!value) {
        showError(field, ERROR_MESSAGES.emailRequired);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        showError(field, ERROR_MESSAGES.emailInvalid);
      } else {
        removeError(field);
      }
      break;
    }

    case 'story': {
      if (!value) {
        showError(field, ERROR_MESSAGES.storyRequired);
        return;
      }

      if (value.length > 500) {
        showError(field, `${ERROR_MESSAGES.storyTooLong} ${value.length}/500`);
      } else {
        removeError(field);
      }

      break;
    }

    case 'upload': {
      const wrapper = document.querySelector(
        SELECTORS.uploadWrapper,
      );

      const hasFile = [...document.querySelectorAll(SELECTORS.fileInputs)].some((input) => input.files?.length);
      const existing = document.querySelector('.ugc-file-error');

      if (!hasFile && !existing) {
        const error = document.createElement('div');
        error.className = 'ugc-error ugc-file-error';
        error.textContent = ERROR_MESSAGES.uploadRequired;
        wrapper?.insertAdjacentElement('afterend', error);
      }

      if (hasFile) {
        existing?.remove();
      }

      break;
    }

    case 'terms': {
      const checkbox = document.querySelector(SELECTORS.terms);
      const wrapper = checkbox?.closest('.field-wrapper');
      const existing = document.querySelector('.ugc-checkbox-error');

      if (!checkbox?.checked && !existing) {
        const error = document.createElement('div');
        error.className = 'ugc-error ugc-checkbox-error';
        error.textContent = ERROR_MESSAGES.termsRequired;
        wrapper?.insertAdjacentElement('afterend', error);
      }

      if (checkbox?.checked) {
        existing?.remove();
      }

      break;
    }

    default:
      break;
  }
}

export function initValidationListeners(onValidSubmit) {
  if (document.body.dataset.validationBound === 'true') {
    return;
  }

  document.body.dataset.validationBound = 'true';

  document.addEventListener('blur',
    (event) => {
      const field = event.target;

      if (field.matches(`${SELECTORS.firstName}, ${SELECTORS.lastName}, ${SELECTORS.email}, ${SELECTORS.story}`)) {
        validateField(field);
      }
    },
    true,
  );

  document.addEventListener('input', (event) => {
    const field = event.target;

    if (field.matches(`${SELECTORS.firstName}, ${SELECTORS.lastName}, ${SELECTORS.email}, ${SELECTORS.story}`)) {
      validateField(field);
    }
  });

  document.addEventListener('change', (event) => {
    if (event.target.name === 'terms') {
      validateField({ name: 'terms' });
    }
  });

  document.addEventListener('submit',
    (event) => {
      validateField(document.querySelector(SELECTORS.firstName));
      validateField(document.querySelector(SELECTORS.lastName));
      validateField(document.querySelector(SELECTORS.email));
      validateField(document.querySelector(SELECTORS.story));
      validateField({ name: 'upload' });
      validateField({ name: 'terms' });

      const hasErrors = document.querySelector('.field-error') || document.querySelector('.ugc-file-error') || document.querySelector('.ugc-checkbox-error');
      if (hasErrors) {
        event.preventDefault();
        return;
      }

      onValidSubmit?.();
    },
    true,
  );
}