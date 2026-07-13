// @import url('./ugc-form.css');

function validateField(input) {
  const wrapper = input.closest('.ugc-form-field-wrapper');
  if (!wrapper) return false;

  let errorMsg = wrapper.querySelector('.ugc-error-message');
  const value = input.value.trim();
  const labelText = wrapper.querySelector('strong')?.textContent.replace('*', '').trim() || 'This field';
  
  // 1. Required field validation
  if (input.required && !value) {
    wrapper.classList.add('has-error');
    if (!errorMsg) {
      errorMsg = document.createElement('span');
      errorMsg.className = 'ugc-error-message';
      wrapper.appendChild(errorMsg);
    }
    errorMsg.textContent = `Error: ${labelText} is required`;
    return false;
  }

  // 2. Character length limit validation
  const maxLimit = input.dataset.maxlength;
  if (maxLimit && value.length > parseInt(maxLimit, 10)) {
    wrapper.classList.add('has-error');
    if (!errorMsg) {
      errorMsg = document.createElement('span');
      errorMsg.className = 'ugc-error-message';
      wrapper.appendChild(errorMsg);
    }
    errorMsg.textContent = `Error: ${labelText} is too long: ${value.length}/${maxLimit}`;
    return false;
  }

  // Clear tracking styles if validations pass
  wrapper.classList.remove('has-error');
  if (errorMsg) errorMsg.remove();
  return true;
}

function handleBlur(e) {
  validateField(e.target);
}

function handleInput(e) {
  const input = e.target;
  const wrapper = input.closest('.ugc-form-field-wrapper');
  if (wrapper && (wrapper.classList.contains('has-error') || input.dataset.maxlength)) {
    validateField(input);
  }
}

function createField(label, id, type = 'text', required = true, extraText = '', maxLength = null) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ugc-form-field-wrapper';
  
  const labelElem = document.createElement('label');
  labelElem.setAttribute('for', id);
  labelElem.innerHTML = `<strong>${label}${required ? '*' : ''}</strong>`;
  
  if (extraText) {
    const extraSpan = document.createElement('span');
    extraSpan.className = 'field-extra-text';
    extraSpan.textContent = extraText;
    labelElem.appendChild(document.createTextNode(' '));
    labelElem.appendChild(extraSpan);
  }
  wrapper.appendChild(labelElem);

  let inputElement;
  if (type === 'textarea') {
    inputElement = document.createElement('textarea');
    inputElement.setAttribute('rows', '6');
  } else {
    inputElement = document.createElement('input');
    inputElement.setAttribute('type', type);
  }
  
  inputElement.id = id;
  inputElement.name = id;

  if (maxLength) {
    inputElement.setAttribute('data-maxlength', maxLength);
  }

  inputElement.addEventListener('blur', handleBlur);
  inputElement.addEventListener('input', handleInput);
  
  if (required) inputElement.required = true;
  
  wrapper.appendChild(inputElement);
  return wrapper;
}

function createUploadRow() {
  const rowContainer = document.createElement('div');
  rowContainer.className = 'ugc-upload-row';

  const previewBox = document.createElement('div');
  previewBox.className = 'ugc-preview-box';
  previewBox.innerHTML = `
    <svg class="ugc-placeholder-icon" viewBox="0 0 24 24" width="32" height="32" stroke="#D1D1D1" stroke-width="2" fill="none">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
    </svg>
  `;
  rowContainer.appendChild(previewBox);

  const controlsContainer = document.createElement('div');
  controlsContainer.className = 'ugc-upload-controls';

  const fileLabel = document.createElement('p');
  fileLabel.className = 'ugc-file-label';
  fileLabel.textContent = 'Please upload your file(s)';

  const fileInput = document.createElement('input');
  fileInput.setAttribute('type', 'file');
  fileInput.className = 'ugc-file-input';
  fileInput.setAttribute('accept', '.png,.gif,.mov,.jpg,.jpeg,.mp4,.mpg,.mpeg,.avi,.wmv,.m4v');

  controlsContainer.appendChild(fileLabel);
  controlsContainer.appendChild(fileInput);
  rowContainer.appendChild(controlsContainer);

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    previewBox.innerHTML = '';
    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.alt = 'Preview';
      previewBox.appendChild(img);
    } else {
      const videoIcon = document.createElement('div');
      videoIcon.className = 'ugc-video-preview-icon';
      videoIcon.textContent = '🎬';
      previewBox.appendChild(videoIcon);
    }

    controlsContainer.innerHTML = '';
    
    const nameLink = document.createElement('a');
    nameLink.className = 'ugc-file-name-link';
    nameLink.href = '#';
    nameLink.innerHTML = `.../${file.name} <span class="external-icon">↗</span>`;
    nameLink.addEventListener('click', (event) => event.preventDefault());

    const removeBtn = document.createElement('button');
    removeBtn.setAttribute('type', 'button');
    removeBtn.className = 'ugc-remove-media-btn';
    removeBtn.innerHTML = '✕ Remove';
    
    removeBtn.addEventListener('click', () => {
      rowContainer.remove();
    });

    controlsContainer.appendChild(nameLink);
    controlsContainer.appendChild(removeBtn);
  });

  return rowContainer;
}

export default function decorate(block) {
  const config = {};
  [...block.children].forEach((row) => {
    const key = row.children[0]?.textContent?.trim().toLowerCase();
    const val = row.children[1]?.innerHTML;
    if (key && val) config[key] = val;
  });

  block.textContent = '';
  
  const form = document.createElement('form');
  form.className = 'ugc-form-container';
  form.setAttribute('novalidate', '');

  form.addEventListener('submit', (e) => {
    const inputs = form.querySelectorAll('input[type="text"], input[type="email"], textarea');
    let isValid = true;
    inputs.forEach((input) => {
      if (!validateField(input)) isValid = false;
    });
    if (!isValid) {
      e.preventDefault();
      form.querySelector('.has-error')?.scrollIntoView({ behavior: 'smooth' });
    }
  });

  if (config.title) {
    const title = document.createElement('h2');
    title.className = 'ugc-form-title';
    title.innerHTML = config.title;
    form.appendChild(title);
  }
  
  if (config.description) {
    const desc = document.createElement('p');
    desc.className = 'ugc-form-description';
    desc.innerHTML = config.description;
    form.appendChild(desc);
  }
  
  const requiredNote = document.createElement('p');
  requiredNote.className = 'ugc-form-required-note';
  requiredNote.innerHTML = '<em>All fields are required.</em>';
  form.appendChild(requiredNote);

  // Core Fields Creation
  form.appendChild(createField('First name', 'firstName', 'text', true));
  form.appendChild(createField('Last name', 'lastName', 'text', true, 'We will not display your last name'));
  form.appendChild(createField('Email address', 'email', 'email', true));
  form.appendChild(createField('Write your story', 'story', 'textarea', true, '(500 character limit)', 500));

  if (config['before-submit']) {
    const info = document.createElement('div');
    info.className = 'ugc-form-info';
    info.innerHTML = config['before-submit'];
    form.appendChild(info);
  }

  // File Upload Dynamic Segment
  if (config['upload-instructions']) {
    const uploadGroup = document.createElement('div');
    uploadGroup.className = 'ugc-form-upload-group';
    
    const instructions = document.createElement('div');
    instructions.className = 'ugc-upload-instructions-text';
    instructions.innerHTML = config['upload-instructions'];
    uploadGroup.appendChild(instructions);
    
    const rowsWrapper = document.createElement('div');
    rowsWrapper.className = 'ugc-upload-rows-wrapper';
    
    rowsWrapper.appendChild(createUploadRow());
    uploadGroup.appendChild(rowsWrapper);
    
    const addMoreBtn = document.createElement('button');
    addMoreBtn.setAttribute('type', 'button');
    addMoreBtn.className = 'ugc-add-more';
    addMoreBtn.textContent = 'Add More Media';
    addMoreBtn.addEventListener('click', () => {
      rowsWrapper.appendChild(createUploadRow());
    });
    
    uploadGroup.appendChild(addMoreBtn);
    form.appendChild(uploadGroup);
  }

  // Consent Segment
  if (config['checkbox-text']) {
    const consentGroup = document.createElement('div');
    consentGroup.className = 'ugc-form-consent';
    
    const checkbox = document.createElement('input');
    checkbox.setAttribute('type', 'checkbox');
    checkbox.id = 'ugcConsent';
    checkbox.name = 'consent';
    checkbox.required = true;
    
    const label = document.createElement('label');
    label.setAttribute('for', 'ugcConsent');
    label.innerHTML = config['checkbox-text'];
    
    consentGroup.appendChild(checkbox);
    consentGroup.appendChild(label);
    form.appendChild(consentGroup);
  }

    if (config['optional-checkbox-text']) {
    const consentGroup = document.createElement('div');
    consentGroup.className = 'ugc-form-consent';
    
    const checkbox = document.createElement('input');
    checkbox.setAttribute('type', 'checkbox');
    checkbox.id = 'ugcConsentOpt';
    checkbox.name = 'consent';
    checkbox.required = true;
    
    const label = document.createElement('label');
    label.setAttribute('for', 'ugcConsentOpt');
    label.innerHTML = config['optional-checkbox-text'];
    
    consentGroup.appendChild(checkbox);
    consentGroup.appendChild(label);
    form.appendChild(consentGroup);
  }

  const submitBtn = document.createElement('button');
  submitBtn.setAttribute('type', 'submit');
  submitBtn.className = 'ugc-form-submit';
  submitBtn.textContent = 'Submit';
  form.appendChild(submitBtn);
  
  block.appendChild(form);

//   // Accordion Drawer Injection
//   if (config['terms-accordion-title'] && config['terms-accordion-content']) {
//     const accordion = document.createElement('details');
//     accordion.className = 'ugc-form-terms-accordion';
    
//     const summary = document.createElement('summary');
//     summary.innerHTML = `<strong>${config['terms-accordion-title']}</strong>`;
    
//     const content = document.createElement('div');
//     content.className = 'accordion-content';
//     content.innerHTML = config['terms-accordion-content'];
    
//     accordion.appendChild(summary);
//     accordion.appendChild(content);
//     block.appendChild(accordion);
//   }
}