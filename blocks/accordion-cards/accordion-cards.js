import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const SCROLL_OFFSET_TOKEN = 'accordion-cards-scroll-offset';
const SCROLL_DURATION_TOKEN = 'accordion-cards-scroll-duration';
const SCROLL_OFFSET_FALLBACK = 40;
const SCROLL_DURATION_FALLBACK = 500;

function optimizeCardImage(imageCol) {
  const img = imageCol.querySelector('img');
  if (!(img instanceof HTMLImageElement) || !img.src) return;
  const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '400' }]);
  const optimizedImg = optimizedPic.querySelector('img');
  if (optimizedImg instanceof HTMLImageElement) moveInstrumentation(img, optimizedImg);
  img.closest('picture')?.replaceWith(optimizedPic);
}

function isActionText(text) {
  const normalized = text.replace(/:icon-[a-z0-9-]+:/gi, '').replace(/\s+/g, ' ').trim();
  return normalized.length <= 40
    && /^(download|email|sign up|signup|find a location)\b/i.test(normalized);
}

function isActionParagraph(node) {
  if (!(node instanceof Element) || !node.matches('p')) return false;
  if (node.querySelector('.icon, span[class*="icon-"]')) return true;
  if (/:icon-[a-z0-9-]+:/i.test(node.textContent)) return true;
  if (node.querySelector('picture, img')) return false;
  const text = node.textContent.replace(/\s+/g, ' ').trim();
  if (isActionText(text)) return true;
  return false;
}

function getFollowingIcon(anchor) {
  let node = anchor.nextSibling;
  while (node) {
    if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) {
      node = node.nextSibling;
    } else if (node instanceof Element && node.matches('.icon, span[class*="icon-"]')) {
      return node;
    } else {
      break;
    }
  }
  return null;
}

function getActionLinkLabel(anchor) {
  return anchor.textContent.replace(/:icon-[a-z0-9-]+:/gi, '').replace(/\s+/g, ' ').trim();
}

function isDownloadActionLink(anchor) {
  const label = getActionLinkLabel(anchor);
  if (/^download$/i.test(label)) return true;
  try {
    const { pathname } = new URL(anchor.href, window.location.href);
    return /\.pdf$/i.test(pathname);
  } catch {
    return false;
  }
}

function isEmailActionLink(anchor) {
  return /^email$/i.test(getActionLinkLabel(anchor));
}

function buildActionLink(anchor) {
  anchor.classList.add('accordion-cards-action-link');

  const iconInAnchor = anchor.querySelector('.icon, span[class*="icon-"]');
  if (!iconInAnchor) {
    const icon = getFollowingIcon(anchor);
    if (icon) anchor.append(icon);
  }

  if (isDownloadActionLink(anchor)) {
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener noreferrer');
  } else if (isEmailActionLink(anchor)) {
    anchor.setAttribute('href', '#');
    anchor.setAttribute('role', 'button');
    anchor.classList.add('accordion-cards-action-email');
  }

  return anchor;
}

function paragraphHasActionContent(paragraph) {
  if (paragraph.querySelector('a')) return true;
  return /:icon-[a-z0-9-]+:/i.test(paragraph.textContent);
}

function getActionHrefFromGroup(paragraphs) {
  const anchor = paragraphs.flatMap((p) => [...p.querySelectorAll('a[href]')])[0];
  return anchor instanceof HTMLAnchorElement ? anchor.href : null;
}

function wrapParagraphInActionLink(paragraph, href) {
  const anchor = document.createElement('a');
  if (href) anchor.href = href;
  while (paragraph.firstChild) anchor.append(paragraph.firstChild);
  return buildActionLink(anchor);
}

function normalizeActionLinks(contentCol) {
  const groups = [];
  let current = [];

  [...contentCol.children].forEach((child) => {
    if (child.matches('p') && isActionParagraph(child)) {
      current.push(child);
    } else if (current.length) {
      groups.push(current);
      current = [];
    }
  });

  if (current.length) groups.push(current);

  groups.forEach((paragraphs) => {
    const tileLink = document.createElement('div');
    tileLink.className = 'accordion-cards-card-actions';
    const groupHref = getActionHrefFromGroup(paragraphs);

    paragraphs.forEach((paragraph) => {
      const anchors = [...paragraph.querySelectorAll('a')];
      if (anchors.length) {
        anchors.forEach((anchor) => tileLink.append(buildActionLink(anchor)));
        return;
      }

      const icon = paragraph.querySelector('.icon, span[class*="icon-"]');
      const lastLink = tileLink.querySelector('.accordion-cards-action-link:last-child');
      if (icon && lastLink && !lastLink.querySelector('.icon, span[class*="icon-"]')) {
        lastLink.append(icon);
        return;
      }

      if (paragraphHasActionContent(paragraph) || isActionText(paragraph.textContent)) {
        tileLink.append(wrapParagraphInActionLink(paragraph, groupHref));
      } else if (icon) {
        const anchor = document.createElement('a');
        if (groupHref) anchor.href = groupHref;
        anchor.append(icon);
        tileLink.append(buildActionLink(anchor));
      }
    });

    paragraphs[0].replaceWith(tileLink);
    paragraphs.slice(1).forEach((paragraph) => paragraph.remove());
  });
}

function styleCardContent(contentCol) {
  contentCol.classList.add('accordion-cards-card-content');
  contentCol.querySelectorAll('h3, h4').forEach((heading) => {
    if (!heading.querySelector('picture, img')) {
      heading.classList.add('accordion-cards-card-title');
    }
  });
  normalizeActionLinks(contentCol);
}

function isIconImage(img) {
  return img instanceof HTMLImageElement && !!img.closest('.icon, span[class*="icon-"]');
}

function hasCardMedia(node) {
  if (!(node instanceof Element)) return false;
  if (isActionParagraph(node)) return false;
  if (node.querySelector('picture')) return true;
  return [...node.querySelectorAll('img')].some((img) => !isIconImage(img));
}

function isImageOnlyNode(node) {
  if (!(node instanceof Element)) return false;
  if (!hasCardMedia(node)) return false;
  const text = node.textContent.replace(/\s+/g, '');
  return text.length === 0 || (node.matches('h3, h4, p') && !node.querySelector('a') && text.length < 4);
}

function startsNewCard(node, currentGroup) {
  if (!(node instanceof Element) || !currentGroup.length) return false;
  if (node.matches('p') && hasCardMedia(node)) return true;
  if (node.matches('h3, h4') && hasCardMedia(node) && currentGroup.some((el) => !isImageOnlyNode(el))) {
    return true;
  }
  return false;
}

function groupColumnNodes(columnEl) {
  const nodes = [...columnEl.children].filter((child) => child instanceof Element);
  if (!nodes.length) return [];

  if (nodes.length === 1) return groupColumnNodes(nodes[0]);

  // Explicit two-column card: image div | content div
  if (nodes.length === 2 && hasCardMedia(nodes[0])) {
    return [columnEl];
  }

  const groups = [];
  let group = [];

  nodes.forEach((node) => {
    if (startsNewCard(node, group)) {
      groups.push(group);
      group = [node];
    } else {
      group.push(node);
    }
  });

  if (group.length) groups.push(group);
  if (groups.length <= 1) return [columnEl];

  return groups.map((items) => {
    const wrapper = document.createElement('div');
    items.forEach((item) => wrapper.append(item));
    return wrapper;
  });
}

function getCardRows(columnEl) {
  if (!(columnEl instanceof Element)) return [];
  return groupColumnNodes(columnEl);
}

function findMediaNode(card) {
  const children = [...card.children].filter((child) => child instanceof Element);
  const mediaParagraph = children.find((child) => child.matches('p') && hasCardMedia(child));
  if (mediaParagraph) return mediaParagraph;

  const mediaHeading = children.find((child) => child.matches('h3, h4') && isImageOnlyNode(child));
  if (mediaHeading) return mediaHeading;

  return children.find((child) => child.matches('picture') || hasCardMedia(child));
}

function structureSplitCard(card) {
  const children = [...card.children].filter((child) => child instanceof Element);
  if (children.length !== 2) return false;
  if (!hasCardMedia(children[0])) return false;

  children[0].className = 'accordion-cards-card-image';
  optimizeCardImage(children[0]);
  children[1].className = 'accordion-cards-card-content';
  styleCardContent(children[1]);
  return true;
}

function structureFlatCard(card) {
  const mediaNode = findMediaNode(card);
  if (mediaNode instanceof Element) {
    const imageWrap = document.createElement('div');
    imageWrap.className = 'accordion-cards-card-image';
    imageWrap.append(mediaNode);
    card.prepend(imageWrap);
    optimizeCardImage(imageWrap);
  }

  const contentWrap = document.createElement('div');
  contentWrap.className = 'accordion-cards-card-content';
  [...card.children]
    .filter((child) => !child.classList.contains('accordion-cards-card-image'))
    .forEach((child) => contentWrap.append(child));
  card.append(contentWrap);
  styleCardContent(contentWrap);
}

function decorateCard(cardRow) {
  const card = document.createElement('article');
  card.className = 'accordion-cards-card';
  moveInstrumentation(cardRow, card);
  while (cardRow.firstElementChild) card.append(cardRow.firstElementChild);

  if (!structureSplitCard(card)) {
    structureFlatCard(card);
  }

  return card;
}

function decorateColumn(columnEl, side) {
  const column = document.createElement('div');
  column.className = `accordion-cards-column accordion-cards-column-${side}`;

  getCardRows(columnEl).forEach((row) => {
    column.append(decorateCard(row));
  });

  return column;
}

function buildPanel(introCol, leftCol, rightCol, panelId) {
  const panel = document.createElement('div');
  panel.id = panelId;
  panel.className = 'accordion-cards-item-panel';
  panel.setAttribute('role', 'region');

  if (introCol instanceof Element && introCol.textContent.trim()) {
    introCol.className = 'accordion-cards-item-intro';
    panel.append(introCol);
  }

  const columns = document.createElement('div');
  columns.className = 'accordion-cards-columns';

  if (leftCol instanceof Element && leftCol.children.length) {
    columns.append(decorateColumn(leftCol, 'left'));
  }
  if (rightCol instanceof Element && rightCol.children.length) {
    columns.append(decorateColumn(rightCol, 'right'));
  }

  if (columns.children.length) panel.append(columns);
  return panel;
}

function createSectionHeader(labelCol, panelId) {
  const header = document.createElement('div');
  header.className = 'accordion-cards-item-header';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'accordion-cards-item-trigger';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', panelId);

  const title = document.createElement('span');
  title.className = 'accordion-cards-item-title';
  const titleSource = labelCol.querySelector('h3, h4, p, strong') || labelCol;
  [...titleSource.childNodes].forEach((node) => title.append(node));

  const icon = document.createElement('span');
  icon.className = 'accordion-cards-item-icon';
  icon.setAttribute('aria-hidden', 'true');

  button.append(title, icon);
  header.append(button);
  return header;
}

function setSectionExpanded(section, expanded) {
  section.classList.toggle('is-expanded', expanded);
  const button = section.querySelector('.accordion-cards-item-trigger');
  if (button instanceof HTMLButtonElement) {
    button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }
}

function getTokenPx(tokenName, fallback) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${tokenName}`)
    .trim();
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function animateScrollTo(top, duration) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    window.scrollTo({ top });
    return;
  }

  const start = window.scrollY;
  const change = top - start;
  if (change === 0) return;

  const startTime = performance.now();

  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - ((-2 * progress + 2) ** 2) / 2;
    window.scrollTo(0, start + change * eased);
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

function scrollAccordionCardsHeaderIntoView(header) {
  if (!(header instanceof Element)) return;
  const top = header.getBoundingClientRect().top
    + window.scrollY
    - getTokenPx(SCROLL_OFFSET_TOKEN, SCROLL_OFFSET_FALLBACK);
  animateScrollTo(top, getTokenPx(SCROLL_DURATION_TOKEN, SCROLL_DURATION_FALLBACK));
}

function scheduleAccordionCardsScroll(header) {
  // measure after expand/collapse reflow (matches live jQuery handler timing)
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      scrollAccordionCardsHeaderIntoView(header);
    });
  });
}

/* eslint-disable secure-coding/no-hardcoded-credentials -- modal class names and public endpoint paths, not secrets */
const RESOURCE_MODAL_ID = 'accordion-cards-resource-modal';
const RESOURCE_SHARE_SEGMENTS = ['api', 'dtc', 'vyeptidownloadableresources'];
const PRIVACY_POLICY_PATH = '/us/privacy-policy';
const PRIVACY_POLICY_HOST = 'https://www.lundbeck.com';

let modalDialog = null;
let selectedResource = null;

function getResourceShareUrl() {
  const base = window.location.hostname.includes('vyepti.com')
    ? window.location.origin
    : 'https://www.vyepti.com';
  return `${base}/${RESOURCE_SHARE_SEGMENTS.join('/')}`;
}

function getPrivacyPolicyUrl() {
  return new URL(PRIVACY_POLICY_PATH, PRIVACY_POLICY_HOST).href;
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

function getCardResource(card) {
  const titleEl = card.querySelector('.accordion-cards-card-title, h3, h4');
  const downloadLink = [...card.querySelectorAll('.accordion-cards-action-link')]
    .find((link) => {
      try {
        return /\.pdf$/i.test(new URL(link.href, window.location.href).pathname);
      } catch {
        return false;
      }
    });
  const img = card.querySelector('.accordion-cards-card-image img');

  return {
    title: titleEl?.textContent?.trim() || '',
    resourcePath: downloadLink?.href ? encodeURI(downloadLink.href) : '',
    thumbnailImagePath: img?.src ? encodeURI(img.src) : '',
    altText: img?.alt || '',
  };
}

function setFormVisible(formWrap, visible) {
  formWrap.hidden = !visible;
}

function setSuccessVisible(successWrap, visible) {
  successWrap.hidden = !visible;
}

function setErrorVisible(errorEl, visible, message = '') {
  errorEl.hidden = !visible;
  errorEl.textContent = message;
}

function resetEmailModalForm(form) {
  form.reset();
  form.querySelectorAll('.accordion-cards-email-field-error').forEach((el) => {
    el.hidden = true;
    el.textContent = '';
  });
  setErrorVisible(form.querySelector('.accordion-cards-email-error'), false);
  setFormVisible(form.closest('.accordion-cards-email-modal-body'), true);
  setSuccessVisible(form.closest('.accordion-cards-email-modal')?.querySelector('.accordion-cards-email-success'), false);
}

function showFieldError(input, message) {
  const errorEl = input.closest('.accordion-cards-email-field')?.querySelector('.accordion-cards-email-field-error');
  if (errorEl instanceof HTMLElement) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
  input.setAttribute('aria-invalid', 'true');
}

function clearFieldError(input) {
  const errorEl = input.closest('.accordion-cards-email-field')?.querySelector('.accordion-cards-email-field-error');
  if (errorEl instanceof HTMLElement) {
    errorEl.hidden = true;
    errorEl.textContent = '';
  }
  input.removeAttribute('aria-invalid');
}

function validateEmailForm(form) {
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

async function submitEmailForm(form) {
  const firstName = form.querySelector('input[name="FirstName"]');
  const lastName = form.querySelector('input[name="LastName"]');
  const email = form.querySelector('input[name="Email"]');
  const submitButton = form.querySelector('button[type="submit"]');
  const errorEl = form.querySelector('.accordion-cards-email-error');
  const modal = form.closest('.accordion-cards-email-modal');
  const successEl = modal?.querySelector('.accordion-cards-email-success');
  const bodyEl = form.closest('.accordion-cards-email-modal-body');

  if (!(firstName instanceof HTMLInputElement)
    || !(lastName instanceof HTMLInputElement)
    || !(email instanceof HTMLInputElement)
    || !(submitButton instanceof HTMLButtonElement)
    || !(errorEl instanceof HTMLElement)
    || !(successEl instanceof HTMLElement)
    || !(bodyEl instanceof HTMLElement)) {
    return;
  }

  const payload = new URLSearchParams({
    firstName: normalizeName(firstName.value),
    lastName: normalizeName(lastName.value),
    emailAddress: email.value.trim(),
    documents: JSON.stringify({
      resources: selectedResource ? [selectedResource] : [],
    }),
  });

  submitButton.disabled = true;
  setErrorVisible(errorEl, false);

  try {
    const response = await fetch(getResourceShareUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload.toString(),
    });
    const data = await response.json();
    if (data?.status) {
      setFormVisible(bodyEl, false);
      setSuccessVisible(successEl, true);
      return;
    }
    setErrorVisible(
      errorEl,
      true,
      'An error occurred. Please refresh your page and try again later.',
    );
  } catch {
    setErrorVisible(
      errorEl,
      true,
      'An error occurred. Please refresh your page and try again later.',
    );
  } finally {
    submitButton.disabled = false;
  }
}

function createEmailField(id, labelText, inputName, inputType, autocomplete) {
  const field = document.createElement('div');
  field.className = 'accordion-cards-email-field';

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
  error.className = 'accordion-cards-email-field-error';
  error.hidden = true;

  field.append(label, input, error);
  return field;
}

function createEmailModal() {
  const dialog = document.createElement('dialog');
  dialog.id = RESOURCE_MODAL_ID;
  dialog.className = 'accordion-cards-email-dialog';
  dialog.setAttribute('aria-labelledby', 'accordion-cards-email-title');

  const modal = document.createElement('div');
  modal.className = 'accordion-cards-email-modal';

  const header = document.createElement('div');
  header.className = 'accordion-cards-email-modal-header';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'accordion-cards-email-modal-close';
  closeButton.setAttribute('aria-label', 'Close');
  const closeIcon = document.createElement('span');
  closeIcon.className = 'icon icon-close';
  closeIcon.setAttribute('aria-hidden', 'true');
  closeButton.append(closeIcon);

  const title = document.createElement('h2');
  title.id = 'accordion-cards-email-title';
  title.className = 'accordion-cards-email-modal-title';
  title.textContent = 'Email this resource';

  header.append(closeButton, title);

  const body = document.createElement('div');
  body.className = 'accordion-cards-email-modal-body';

  const form = document.createElement('form');
  form.className = 'accordion-cards-email-form';
  form.noValidate = true;

  const formType = document.createElement('input');
  formType.type = 'hidden';
  formType.name = 'FormType';
  formType.value = 'tile';

  const requiredNote = document.createElement('p');
  requiredNote.className = 'accordion-cards-email-required-note';
  requiredNote.textContent = 'All fields are required';

  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.className = 'accordion-cards-email-submit';
  submitButton.append(document.createTextNode('Send '));
  const submitIcon = document.createElement('span');
  submitIcon.className = 'accordion-cards-email-submit-icon';
  submitIcon.setAttribute('aria-hidden', 'true');
  submitButton.append(submitIcon);

  const formError = document.createElement('p');
  formError.className = 'accordion-cards-email-error';
  formError.hidden = true;
  formError.textContent = 'An error occurred. Please refresh your page and try again later.';

  form.append(
    formType,
    requiredNote,
    createEmailField('accordion-cards-email-first-name', 'First Name', 'FirstName', 'text', 'given-name'),
    createEmailField('accordion-cards-email-last-name', 'Last Name', 'LastName', 'text', 'family-name'),
    createEmailField('accordion-cards-email-address', 'Email address', 'Email', 'email', 'email'),
    submitButton,
    formError,
  );

  const terms = document.createElement('div');
  terms.className = 'accordion-cards-email-terms';
  const termsParagraph = document.createElement('p');
  termsParagraph.append(document.createTextNode('Lundbeck will not save your personal information. See our '));
  const privacyLink = document.createElement('a');
  privacyLink.href = getPrivacyPolicyUrl();
  privacyLink.target = '_blank';
  privacyLink.rel = 'noopener noreferrer';
  privacyLink.textContent = 'Privacy Policy';
  termsParagraph.append(privacyLink, document.createTextNode('.'));
  terms.append(termsParagraph);

  body.append(form, terms);

  const success = document.createElement('div');
  success.className = 'accordion-cards-email-success';
  success.hidden = true;

  const successTitle = document.createElement('p');
  successTitle.className = 'accordion-cards-email-success-title';
  successTitle.textContent = 'Thank you!';

  const successText = document.createElement('p');
  successText.className = 'accordion-cards-email-success-text';
  successText.textContent = 'Your resource is on its way to your inbox.';

  success.append(successTitle, successText);
  modal.append(header, body, success);
  dialog.append(modal);

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener('close', () => {
    document.body.classList.remove('accordion-cards-email-modal-open');
    if (form instanceof HTMLFormElement) resetEmailModalForm(form);
    selectedResource = null;
  });

  closeButton.addEventListener('click', () => dialog.close());

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validateEmailForm(form)) return;
    submitEmailForm(form);
  });

  document.body.append(dialog);
  return dialog;
}

function ensureEmailModal() {
  if (!(modalDialog instanceof HTMLDialogElement)) {
    modalDialog = document.getElementById(RESOURCE_MODAL_ID);
  }
  if (!(modalDialog instanceof HTMLDialogElement)) {
    modalDialog = createEmailModal();
  }
  return modalDialog;
}

function openAccordionCardsEmailModal(resource) {
  const dialog = ensureEmailModal();
  selectedResource = resource;
  const form = dialog.querySelector('.accordion-cards-email-form');
  if (form instanceof HTMLFormElement) resetEmailModalForm(form);
  document.body.classList.add('accordion-cards-email-modal-open');
  dialog.showModal();
}

function setupAccordionCardsEmailModal(block) {
  ensureEmailModal();

  block.addEventListener('click', (event) => {
    const link = event.target.closest('.accordion-cards-action-email');
    if (!(link instanceof HTMLAnchorElement)) return;

    event.preventDefault();
    const card = link.closest('.accordion-cards-card');
    if (!(card instanceof Element)) return;

    openAccordionCardsEmailModal(getCardResource(card));
  });
}
/* eslint-enable secure-coding/no-hardcoded-credentials */

export default function decorate(block) {
  const wrapper = document.createElement('div');
  wrapper.className = 'accordion-cards-sections';

  [...block.children].forEach((row, index) => {
    const section = document.createElement('section');
    section.className = 'accordion-cards-item';
    moveInstrumentation(row, section);
    while (row.firstElementChild) section.append(row.firstElementChild);

    const panelId = `accordion-cards-panel-${index}`;
    const [
      headingCol,
      introCol,
      leftCol,
      rightCol,
    ] = [...section.children];

    if (headingCol instanceof Element) {
      section.prepend(createSectionHeader(headingCol, panelId));
      headingCol.remove();
    }

    section.append(buildPanel(introCol, leftCol, rightCol, panelId));

    if (leftCol instanceof Element) leftCol.remove();
    if (rightCol instanceof Element) rightCol.remove();

    const button = section.querySelector('.accordion-cards-item-trigger');
    if (button instanceof HTMLButtonElement) {
      button.addEventListener('click', () => {
        setSectionExpanded(section, !section.classList.contains('is-expanded'));
        scheduleAccordionCardsScroll(section.querySelector('.accordion-cards-item-header'));
      });
    }

    if (index === 0) setSectionExpanded(section, true);
    wrapper.append(section);
  });

  block.textContent = '';
  block.append(wrapper);
  setupAccordionCardsEmailModal(block);
}
