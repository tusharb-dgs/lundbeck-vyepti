let config = {};
export default async function decorate(block) {

  [...block.children].slice(-3).forEach((row) => {
    const text = row.textContent.trim();
    const [key, value] = text.split(':');
    config[key.trim()] = value.trim();
    row.remove(); // hide/remove config row
  });
                                  
  try {
    const targetBlockModule = await import('../form/form.js');
  
    // Extract the default decoration function
    const decorateTargetBlock = targetBlockModule.default;
    if (typeof decorateTargetBlock === 'function') {
      // Pass your block element (or a specific child element) to the target block's decorator
      await decorateTargetBlock(block);
    }
  } catch (error) {
    console.error('Failed to load the target block JS:', error);
  }
}

/* ==========================================
  Multiple Media Upload Handling
========================================== */

function createUploadRow(isFirst = false) {
  const row = document.createElement('div');
  row.className = 'ugc-upload-row';

  row.innerHTML = `
    <div class="ugc-preview-container">
      <div class="ugc-preview-placeholder"><img    src="/icons/wrong.svg"4    alt="Upload placeholder"5    class="ugc-placeholder-icon"/></div>
      <img class="ugc-preview-image" hidden alt="Preview">
    </div>

    <div class="ugc-upload-content">
      <div class="ugc-upload-label">
        Please upload your file(s)
      </div>

      <input
        type="file"
        class="ugc-file-input"
        accept=".png,.gif,.mov,.jpg,.jpeg,.mp4,.mpg,.mpeg,.avi,.wmv,.m4v"
      />
    </div>

    ${
      !isFirst
  ? `<button
        type="button"
        class="ugc-remove-upload"
        aria-label="Remove upload">
        <img src="/icons/cross.svg"          alt="Remove"
          class="ugc-remove-upload-icon"
        />
      </button>`
  : ''
    }
  `;

  const input = row.querySelector('.ugc-file-input');
  const image = row.querySelector('.ugc-preview-image');
  const placeholder = row.querySelector('.ugc-preview-placeholder');

  input.addEventListener('change', () => {
    const file = input.files?.[0];

    if (!file) {
      image.hidden = true;
      placeholder.style.display = 'block';
      return;
    }
    const fileError = document.querySelector('.ugc-file-error');
    
    if (file) {  fileError?.remove();}

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();

      reader.onload = (e) => {
        image.src = e.target.result;
        image.hidden = false;
        placeholder.style.display = 'none';
      };

      reader.readAsDataURL(file);
    } else {
      image.hidden = true;
      placeholder.style.display = 'block';
    }
  });

  const removeButton = row.querySelector('.ugc-remove-upload');

  if (removeButton) {
    removeButton.addEventListener('click', () => {
      row.remove();

      const addButton = document.querySelector('.ugc-add-more-media');

      if (document.querySelectorAll('.ugc-upload-row').length < 3) {
        addButton.disabled = false;
      }
    });
  }

  return row;
}

function initializeUpload(wrapper) {
  if (wrapper.dataset.ugcInitialized === 'true') {
    return;
  }

  wrapper.dataset.ugcInitialized = 'true';

  wrapper.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'ugc-upload-container';

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'ugc-add-more-media';
  addButton.textContent = 'Add More Media';

  container.appendChild(createUploadRow(true));

  addButton.addEventListener('click', () => {
    const count = container.querySelectorAll('.ugc-upload-row').length;

    if (count >= 3) {
      addButton.disabled = true;
      return;
    }

    container.appendChild(createUploadRow());

    if (
      container.querySelectorAll('.ugc-upload-row').length >= 3
    ) {
      addButton.disabled = true;
    }
  });

  wrapper.appendChild(container);
  wrapper.appendChild(addButton);
}

/* ==========================================
   VALIDATIONS
========================================== */

function removeError(field) {
  field.classList.remove('field-error');
  const wrapper = field.closest('.field-wrapper');
  if (!wrapper) {
    return;
  }

  const error = wrapper.querySelector('.ugc-error');
  if (error) {
    error.remove();
  }
}

function showError(field, message) {
  removeError(field);
  field.classList.add('field-error');
  const wrapper = field.closest('.field-wrapper');
  if (!wrapper) {
    return;
  }

  const error = document.createElement('div');
  error.className = 'ugc-error';
  error.textContent = message;
  wrapper.appendChild(error);
}

function validateField(field) {
  const value = field?.value?.trim?.() || '';

  switch (field.name) {
    case 'firstName':
      if (!value) {
        showError(field, 'Error: First name is required');
      } else {
        removeError(field);
      }
      break;

    case 'lastName':
      if (!value) {
        showError(field, 'Error: Last name is required');
      } else {
        removeError(field);
      }
      break;

    case 'email': {
      if (!value) {
        showError(field, 'Error: Email address is required');
        return;
      }

      const validEmail =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!validEmail.test(value)) {
        showError(field, 'Error: Please enter a valid email address' );
      } else {
        removeError(field);
      }

      break;
    }

    case 'story': {
      if (!value) {
        showError(field, 'Error: Write your story is required');
        return;
      }

      const count = value.length;

      if (count > 500) {
        showError(field,`Error: Write your story is too long: ${count}/500`);
      } else {
        removeError(field);
      }

      break;
    }

    case 'upload': {
      const wrapper = document.querySelector(
        '.ugc-file.field-wrapper.file-wrapper',
      );

      const hasFile = [...document.querySelectorAll('.ugc-file-input')]
        .some((input) => input.files?.length);

      const error = wrapper?.nextElementSibling?.classList.contains(
        'ugc-file-error',
      )
        ? wrapper.nextElementSibling
        : null;

      if (!hasFile) {
        if (!error) {
          const fileError = document.createElement('div');

          fileError.className = 'ugc-error ugc-file-error';

          fileError.textContent =
            'Error: Upload your video or image is required';

          wrapper?.insertAdjacentElement(
            'afterend',
            fileError,
          );
        }
      } else {
        error?.remove();
      }

      break;
    }

    case 'terms': {
      const checkbox = document.querySelector(
        'input[name="terms"]',
      );

      const wrapper = checkbox?.closest('.field-wrapper');

      const error = wrapper?.nextElementSibling?.classList.contains(
        'ugc-checkbox-error',
      )
        ? wrapper.nextElementSibling
        : null;

      if (!checkbox?.checked) {
        if (!error) {
          const checkboxError = document.createElement('div');

          checkboxError.className =
            'ugc-error ugc-checkbox-error';

          checkboxError.textContent =
            'Error: Checkbox is required';

          wrapper?.insertAdjacentElement(
            'afterend',
            checkboxError,
          );
        }
      } else {
        error?.remove();
      }

      break;
    }
    default:
      break;
  }
}



function initValidationListeners() {
  if (document.body.dataset.validationBound === 'true') {
    return;
  }

  document.body.dataset.validationBound = 'true';

  document.addEventListener(
    'blur',
    (event) => {
      const field = event.target;

      if (
        field.matches(
          'input[name="firstName"], input[name="lastName"], input[name="email"], textarea[name="story"]',
        )
      ) {
        validateField(field);
      }
    },
    true,
  );

  document.addEventListener('input', (event) => {
    const field = event.target;

    if (
      field.matches(
        'input[name="firstName"], input[name="lastName"], input[name="email"], textarea[name="story"]',
      )
    ) {
        validateField(field);
    }
  });

  document.addEventListener(
    'submit',
    (event) => {
      validateField(
        document.querySelector('input[name="firstName"]'),
      );

      validateField(
        document.querySelector('input[name="lastName"]'),
      );

      validateField(
        document.querySelector('input[name="email"]'),
      );

      validateField(
        document.querySelector('textarea[name="story"]'),
      );

      validateField({ name: 'upload' });
      validateField({ name: 'terms' });

      const hasErrors = document.querySelector('.field-error') ||
        document.querySelector('.ugc-file-error') ||
        document.querySelector('.ugc-checkbox-error');

      if (hasErrors) {
        event.preventDefault();
        return;
      }

/* Collect form data */
      const formData = {
        id:config.id,
        a:config.a,
        g:config.g,
        firstName:document.querySelector('input[name="firstName"]')?.value || '',
        lastName:document.querySelector('input[name="lastName"]')?.value || '',
        email:document.querySelector('input[name="email"]')?.value || '',
        story:document.querySelector('textarea[name="story"]')?.value || '',
        terms:document.querySelector('input[name="terms"]')?.checked || false,
        emailConsent:document.querySelector('input[name="optional-terms"]')?.checked || false,
        files: [...document.querySelectorAll('.ugc-file-input')]
          .filter((input) => input.files?.length)
          .map((input) => ({
            name: input.files[0].name,
            type: input.files[0].type,
            size: input.files[0].size,
          })),
      };
      console.log('UGC Form Payload', formData);
    },
    true,
  );

  document.addEventListener('change', (event) => {
    if (event.target.name === 'terms') {
      validateField({ name: 'terms' });
    }
  });
}

/* ==========================================
   Adding Markdown Links in Plain Text
========================================== */

function fixMarkdownLinks() {
  document.querySelectorAll('.ugc-terms.field-wrapper p').forEach(el => {
    const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    if (regex.test(el.innerHTML)) {
      el.innerHTML = el.innerHTML.replace(regex, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    }
  });
}

/* ==========================================
   Adding Helper Text to Labels
========================================== */

function enhanceLabels() {
  document.querySelectorAll('.field-wrapper label')
    .forEach((label) => {
      if (label.dataset.labelEnhanced === 'true') {
        return;
      }

      const text = label.textContent;
      if (!text.includes('|')) {
        return;
      }
      
      label.dataset.labelEnhanced = 'true';
      const [labelText, helperText] = text.split('|');
      label.innerHTML = `
        <span class="ugc-label-text">${labelText}</span>
        <span class="ugc-label-helper"> &nbsp${helperText}</span>
      `;
    });
}

function init() {
  document.querySelectorAll('.form form').forEach((form) => {
    form.setAttribute('novalidate', '');
  });
  document.querySelectorAll('.ugc-file.field-wrapper.file-wrapper').forEach(initializeUpload);
  initValidationListeners();
}

const observer = new MutationObserver(() => {
  init();
  fixMarkdownLinks();
  enhanceLabels();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

init();