export default async function decorate(block) {
  block.classList.add('my-custom-wrapper');
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
    const count =
      container.querySelectorAll('.ugc-upload-row').length;

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
  const value = field.value.trim();

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
        showError(
          field,
          'Error: Please enter a valid email address',
        );
      } else {
        removeError(field);
      }

      break;
    }

    case 'story': {
      if (!value) {
        showError(
          field,
          'Error: Write your story is required',
        );
        return;
      }

      const count = value.length;

      if (count > 500) {
        showError(
          field,
          `Error: Write your story is too long: ${count}/500`,
        );
      } else {
        removeError(field);
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
}

function fixMarkdownLinks() {
  document.querySelectorAll('.ugc-terms.field-wrapper p').forEach(el => {
    const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    if (regex.test(el.innerHTML)) {
      el.innerHTML = el.innerHTML.replace(regex, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    }
  });
}

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