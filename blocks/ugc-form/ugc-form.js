import { FORM_BLOCK_PATH, FORM_CONFIGS } from './constants.js';
import { initializeUpload } from './upload-handler.js';
import { initValidationListeners } from './validation.js';
import { submitForm } from './submission.js';

export default async function decorate(block) {
  populateConfig(block);

  try {
    const module = await import(FORM_BLOCK_PATH);
    if (typeof module.default === 'function') {
      await module.default(block);
    }
  } catch (error) {
    console.error('Failed to load form block:',error);
  }

  
  initValidationListeners(() => {
    submitForm(getConfig());
  });

  const observer = new MutationObserver(() => {
    const form = document.querySelector('.ugc-form form');

    if (!form) {
      return;
    }

    init();
    fixMarkdownLinks();
    enhanceLabels();

    observer.disconnect();
  });

  observer.observe(document.querySelector('.ugc-form form'), {
    childList: true,
    subtree: true,
  });

  init();
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

      if (!label.textContent.includes('|')) {
        return;
      }

      label.dataset.labelEnhanced = 'true';
      const [labelText, helperText] = label.textContent.split('|');
      label.innerHTML = `<span class="ugc-label-text"> ${labelText}  </span><span class="ugc-label-helper"> &nbsp;${helperText} </span>`;
    });
}

function init() {
  document.querySelectorAll('.ugc-form form')
    .forEach((form) => {
      form.setAttribute('novalidate', '');
    });

  document.querySelectorAll('.ugc-file.field-wrapper.file-wrapper').forEach(initializeUpload);
}


function populateConfig(block) {
  [...block.children].slice(-3).forEach((row) => {
    const text = row.textContent.trim();
    const [key, value] = text.split(':');

    if (key && value) {
      FORM_CONFIGS[key.trim()] = value.trim();
    }

    row.remove();
  });
}

function getConfig() {
  return FORM_CONFIGS;
}