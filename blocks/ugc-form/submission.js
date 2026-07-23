import { SELECTORS } from './constants.js';

export function collectFormData(config) {
  return {
    id: config.id,
    a: config.a,
    g: config.g,

    firstName: document.querySelector(SELECTORS.firstName)?.value || '',
    lastName: document.querySelector(SELECTORS.lastName)?.value || '',
    email: document.querySelector(SELECTORS.email)?.value || '',
    story: document.querySelector(SELECTORS.story)?.value || '',
    terms: document.querySelector(SELECTORS.terms)?.checked || false,
    emailConsent: document.querySelector(SELECTORS.optionalTerms)?.checked || false,

    files: [...document.querySelectorAll(SELECTORS.fileInputs)]
      .filter((input) => input.files?.length)
      .map((input) => ({
        name: input.files[0].name,
        type: input.files[0].type,
        size: input.files[0].size,
      })),
  };
}

export function submitForm(config) {
  const payload = collectFormData(config);
  console.log('UGC Form Payload', payload);
  return payload;
}