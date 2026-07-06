import { moveInstrumentation } from '../../scripts/scripts.js';

const SCROLL_OFFSET_TOKEN = 'accordion-cards-scroll-offset';
const SCROLL_DURATION_TOKEN = 'accordion-cards-scroll-duration';
const SCROLL_OFFSET_FALLBACK = 40;
const SCROLL_DURATION_FALLBACK = 500;

// An action paragraph is a trailing paragraph made up only of links (Download, Email,
// etc.) — its visible text is exactly its links' text, ignoring icon tokens/whitespace.
// This distinguishes an action row from a body paragraph that merely contains an inline
// link (e.g. the "Doctor Discussion Guide" sentence).
function isActionParagraph(node) {
  if (!(node instanceof Element) || !node.matches('p')) return false;
  const anchors = [...node.querySelectorAll('a')];
  if (!anchors.length) return false;
  const strip = (s) => s.replace(/:icon-[a-z0-9-]+:/gi, '').replace(/\s+/g, ' ').trim();
  return strip(node.textContent) === strip(anchors.map((a) => a.textContent).join(' '));
}

// Collects the trailing run of action-link paragraphs into a single actions row and
// gives each link the .button class (matching what decorateButtons would produce for a
// bold link — done here too so it also works when links share one paragraph). An
// authored /modals/… link is still auto-opened as a modal by the global autolinkModals
// handler; the button chrome is overridden to the plain text-link + icon style in CSS.
function normalizeActionLinks(contentCol) {
  const children = [...contentCol.children];
  const actionParagraphs = [];
  for (let i = children.length - 1; i >= 0; i -= 1) {
    const child = children[i];
    if (isActionParagraph(child)) {
      actionParagraphs.unshift(child);
    } else if (actionParagraphs.length) {
      break;
    }
  }
  if (!actionParagraphs.length) return;

  const actions = document.createElement('div');
  actions.className = 'accordion-cards-card-actions';
  actionParagraphs.forEach((paragraph) => {
    paragraph.querySelectorAll('a').forEach((anchor) => {
      anchor.classList.add('button', 'accordion-cards-action-link');
      actions.append(anchor);
    });
  });
  contentCol.append(actions);
  actionParagraphs.forEach((paragraph) => paragraph.remove());
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
}
