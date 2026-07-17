import { getMetadata, decorateBlock, loadBlock } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  sections.querySelectorAll(':scope > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

function closeAllDropdowns(nav) {
  nav.querySelectorAll('[aria-expanded="true"]').forEach((el) => {
    el.setAttribute('aria-expanded', 'false');
  });
}

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    closeAllDropdowns(nav);
  }
}

function closeOnClickOutside(e) {
  const nav = document.getElementById('nav');
  if (nav && !nav.contains(e.target)) {
    closeAllDropdowns(nav);
  }
}

/**
 * Builds a search block instance (uses the shared blocks/search block) and
 * loads its CSS + JS. Wrapped in a .nav-search container for header layout.
 * @returns {HTMLElement} wrapper containing the (async-decorated) search block
 */
function buildSearchBlock() {
  const searchWrapper = document.createElement('div');
  searchWrapper.className = 'nav-search';

  const searchBlock = document.createElement('div');
  searchBlock.className = 'search block';
  searchBlock.dataset.blockName = 'search';
  searchWrapper.append(searchBlock);

  decorateBlock(searchBlock);
  loadBlock(searchBlock);

  return searchWrapper;
}

/**
 * Decorates the utility bar section (top teal bar)
 * @param {Element} utilSection The utility bar section from nav fragment
 * @returns {HTMLElement} decorated utility bar
 */
function decorateUtilityBar(utilSection) {
  const utilBar = document.createElement('div');
  utilBar.className = 'nav-utility';

  const container = document.createElement('div');
  container.className = 'nav-utility-container';

  // Tagline
  const tagline = utilSection.querySelector('p');
  if (tagline) {
    const taglineEl = document.createElement('span');
    taglineEl.className = 'nav-utility-tagline';
    taglineEl.textContent = tagline.textContent.trim();
    container.append(taglineEl);
  }

  // Utility links (PI dropdowns, HCP link)
  const utilLinks = document.createElement('div');
  utilLinks.className = 'nav-utility-links';

  const ul = utilSection.querySelector('ul');
  if (ul) {
    [...ul.children].forEach((li) => {
      const subUl = li.querySelector('ul');
      const link = li.querySelector(':scope > a');

      if (subUl) {
        // Dropdown item (Patient Info, Prescribing Info)
        const dropdown = document.createElement('div');
        dropdown.className = 'nav-utility-dropdown';

        const trigger = document.createElement('button');
        trigger.className = 'nav-utility-dropdown-trigger';
        trigger.setAttribute('aria-expanded', 'false');
        // EDS wraps text in <p>; check <p> first, then fall back to direct text nodes
        const labelP = li.querySelector(':scope > p');
        const directText = Array.from(li.childNodes)
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => n.textContent.trim())
          .join('');
        trigger.textContent = (labelP ? labelP.textContent.trim() : '') || directText;

        const menu = document.createElement('div');
        menu.className = 'nav-utility-dropdown-menu';
        [...subUl.children].forEach((subLi) => {
          const a = subLi.querySelector('a');
          if (a) menu.append(a.cloneNode(true));
        });

        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          const expanded = trigger.getAttribute('aria-expanded') === 'true';
          // Close other utility dropdowns
          dropdown.closest('.nav-utility-links')
            .querySelectorAll('.nav-utility-dropdown-trigger[aria-expanded="true"]')
            .forEach((t) => t.setAttribute('aria-expanded', 'false'));
          trigger.setAttribute('aria-expanded', expanded ? 'false' : 'true');

          // Toggle overlay on mobile
          const isMobile = window.matchMedia('(max-width: 899px)').matches;
          if (isMobile) {
            let overlay = document.querySelector('.nav-utility-overlay');
            if (!expanded) {
              if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'nav-utility-overlay';
                overlay.addEventListener('click', () => {
                  trigger.setAttribute('aria-expanded', 'false');
                  overlay.remove();
                });
                document.body.append(overlay);
              }
              requestAnimationFrame(() => {
                const menuEl = dropdown.querySelector('.nav-utility-dropdown-menu');
                if (menuEl && overlay.parentElement) {
                  const menuBottom = menuEl.getBoundingClientRect().bottom;
                  overlay.style.top = `${menuBottom}px`;
                }
              });
            } else if (overlay) {
              overlay.remove();
            }
          }
        });

        dropdown.addEventListener('mouseenter', () => {
          if (window.matchMedia('(min-width: 900px)').matches) {
            dropdown.closest('.nav-utility-links')
              .querySelectorAll('.nav-utility-dropdown-trigger[aria-expanded="true"]')
              .forEach((t) => t.setAttribute('aria-expanded', 'false'));
            trigger.setAttribute('aria-expanded', 'true');
          }
        });
        dropdown.addEventListener('mouseleave', () => {
          if (window.matchMedia('(min-width: 900px)').matches) {
            trigger.setAttribute('aria-expanded', 'false');
          }
        });

        dropdown.append(trigger, menu);
        utilLinks.append(dropdown);
      } else {
        // Simple link (HCP) — may be direct child or wrapped in <p> by EDS
        const a = link || li.querySelector('a');
        if (a) {
          const clone = a.cloneNode(true);
          clone.className = 'nav-utility-link';
          utilLinks.append(clone);
        }
      }
    });
  }

  // Social icons — EDS may put each social link in its own <p>
  const socialParagraphs = [...utilSection.querySelectorAll('p')]
    .filter((p) => p.querySelector('a picture, a img'));
  if (socialParagraphs.length) {
    const socialLinks = document.createElement('div');
    socialLinks.className = 'nav-utility-social';
    socialParagraphs.forEach((p) => {
      const a = p.querySelector('a');
      if (a) {
        const clone = a.cloneNode(true);
        clone.className = 'nav-utility-social-link';
        socialLinks.append(clone);
      }
    });
    utilLinks.append(socialLinks);
  }

  container.append(utilLinks);
  utilBar.append(container);
  return utilBar;
}

/**
 * Decorates the brand row with logo and tool links
 * @param {Element} brandSection The brand section (logo)
 * @param {Element} toolsSection The tools section (icon links)
 * @returns {HTMLElement} decorated brand row
 */
function decorateBrandRow(brandSection, toolsSection) {
  const brandRow = document.createElement('div');
  brandRow.className = 'nav-brand-row';

  const container = document.createElement('div');
  container.className = 'nav-brand-container';

  // Logo
  const logoWrapper = document.createElement('div');
  logoWrapper.className = 'nav-brand';
  const logoLink = brandSection.querySelector('a');
  if (logoLink) {
    const clone = logoLink.cloneNode(true);
    clone.className = 'nav-brand-link';
    logoWrapper.append(clone);
  }
  // Brand tagline (visible on mobile next to logo)
  const brandTagline = document.createElement('span');
  brandTagline.className = 'nav-brand-tagline';
  brandTagline.textContent = 'For the preventive treatment of migraine in adults.';
  logoWrapper.append(brandTagline);

  container.append(logoWrapper);

  // Hamburger menu button (mobile)
  const hamburger = document.createElement('button');
  hamburger.className = 'nav-hamburger';
  hamburger.setAttribute('aria-label', 'Toggle Menu');
  hamburger.setAttribute('aria-expanded', 'false');
  const hamburgerIcon = document.createElement('span');
  hamburgerIcon.className = 'nav-hamburger-icon';
  const hamburgerText = document.createElement('span');
  hamburgerText.className = 'nav-hamburger-text';
  hamburgerText.textContent = 'Menu';
  hamburger.append(hamburgerIcon, hamburgerText);
  hamburger.addEventListener('click', () => {
    const expanded = hamburger.getAttribute('aria-expanded') === 'true';
    hamburger.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    const nav = hamburger.closest('nav');
    if (nav) nav.classList.toggle('nav-mobile-open', !expanded);
  });

  container.append(hamburger);

  // Tools (icon links)
  const toolsWrapper = document.createElement('div');
  toolsWrapper.className = 'nav-tools';

  if (toolsSection) {
    toolsSection.querySelectorAll('p').forEach((p) => {
      const a = p.querySelector('a');
      if (a) {
        const toolLink = a.cloneNode(true);
        toolLink.className = 'nav-tool-link';
        const img = toolLink.querySelector('img, picture');
        if (img) img.className = 'nav-tool-icon';
        // EDS may place label text outside <a> as a sibling in <p>
        if (!toolLink.textContent.trim() || toolLink.textContent.trim() === (img ? img.alt : '')) {
          const pText = Array.from(p.childNodes)
            .filter((n) => n.nodeType === Node.TEXT_NODE)
            .map((n) => n.textContent.trim())
            .filter(Boolean)
            .join(' ');
          if (pText) toolLink.append(document.createTextNode(pText));
        }
        toolsWrapper.append(toolLink);
      }
    });
  }

  // Search (shared blocks/search block)
  toolsWrapper.append(buildSearchBlock());
  container.append(toolsWrapper);
  brandRow.append(container);
  return brandRow;
}

/**
 * Decorates the navigation links row
 * @param {Element} sectionsEl The sections element (nav links with dropdowns)
 * @returns {HTMLElement} decorated nav links row
 */
function decorateNavLinks(sectionsEl) {
  const navRow = document.createElement('div');
  navRow.className = 'nav-links-row';

  // Mobile menu header (search + close button)
  const mobileHeader = document.createElement('div');
  mobileHeader.className = 'nav-mobile-header';

  const mobileSearch = buildSearchBlock();
  mobileSearch.className = 'nav-mobile-search';
  mobileHeader.append(mobileSearch);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'nav-mobile-close';
  closeBtn.setAttribute('aria-label', 'Close Menu');
  const closeIcon = document.createElement('span');
  closeIcon.className = 'nav-mobile-close-icon';
  closeIcon.setAttribute('aria-hidden', 'true');
  closeBtn.append(closeIcon);
  closeBtn.addEventListener('click', () => {
    const nav = navRow.closest('nav');
    if (nav) {
      nav.classList.remove('nav-mobile-open');
      const hamburger = nav.querySelector('.nav-hamburger');
      if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
    }
  });
  mobileHeader.append(closeBtn);

  navRow.append(mobileHeader);

  // Mobile tool links (pill buttons below search) — populated after nav is in DOM
  const mobileTools = document.createElement('div');
  mobileTools.className = 'nav-mobile-tools';
  navRow.append(mobileTools);

  requestAnimationFrame(() => {
    const nav = navRow.closest('nav');
    if (!nav) return;
    nav.querySelectorAll('.nav-tool-link').forEach((link) => {
      const pill = document.createElement('a');
      pill.className = 'nav-mobile-tool-pill';
      pill.href = link.href;
      pill.textContent = link.textContent.trim();
      mobileTools.append(pill);
    });
  });

  const container = document.createElement('div');
  container.className = 'nav-links-container';

  const ul = sectionsEl.querySelector('ul');
  if (ul) {
    const navList = ul.cloneNode(true);
    navList.className = 'nav-links-list';

    const isDesktop = () => window.matchMedia('(min-width: 900px)').matches;

    // Add dropdown behavior to items with sub-menus
    navList.querySelectorAll(':scope > li').forEach((li) => {
      const subUl = li.querySelector('ul');
      if (subUl) {
        li.classList.add('nav-drop');
        li.setAttribute('aria-expanded', 'false');
        li.setAttribute('tabindex', '0');
        subUl.className = 'nav-dropdown-menu';

        // Hover open/close (desktop only). The transparent hover bridge on the
        // panel covers the trigger→panel seam, so the menu can close as soon as
        // the pointer leaves the item — matching the source site.
        li.addEventListener('mouseenter', () => {
          if (!isDesktop()) return;
          toggleAllNavSections(navList);
          li.setAttribute('aria-expanded', 'true');
        });
        li.addEventListener('mouseleave', () => {
          if (!isDesktop()) return;
          li.setAttribute('aria-expanded', 'false');
        });

        // Click toggle
        li.addEventListener('click', (e) => {
          if (e.target.closest('a')) return;
          e.stopPropagation();
          const expanded = li.getAttribute('aria-expanded') === 'true';
          if (isDesktop()) toggleAllNavSections(navList);
          li.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        });

        // Keyboard
        li.addEventListener('keydown', (e) => {
          if (e.code === 'Enter' || e.code === 'Space') {
            e.preventDefault();
            const expanded = li.getAttribute('aria-expanded') === 'true';
            if (isDesktop()) toggleAllNavSections(navList);
            li.setAttribute('aria-expanded', expanded ? 'false' : 'true');
          }
        });
      }
    });

    container.append(navList);
  }

  navRow.append(container);

  // Mobile nav footer (HCP link + social icons) — populated after nav is in DOM
  const mobileFooter = document.createElement('div');
  mobileFooter.className = 'nav-mobile-footer';
  navRow.append(mobileFooter);

  requestAnimationFrame(() => {
    const nav = navRow.closest('nav');
    if (!nav) return;

    // Clone HCP link
    const hcpLink = nav.querySelector('.nav-utility-link');
    if (hcpLink) {
      const hcpClone = hcpLink.cloneNode(true);
      hcpClone.className = 'nav-mobile-hcp-link';
      mobileFooter.append(hcpClone);
    }

    // Clone social icons
    const socialSection = nav.querySelector('.nav-utility-social');
    if (socialSection) {
      const socialClone = socialSection.cloneNode(true);
      socialClone.className = 'nav-mobile-social';
      mobileFooter.append(socialClone);
    }
  });

  return navRow;
}

/**
 * loads and decorates the header
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main navigation');

  // Collect sections from fragment: brand, sections, tools, utility
  const sections = [...fragment.children];

  const [brandSection, sectionsEl, toolsSection, utilitySection] = sections;

  // Build 3-row header: utility (top), brand+tools (middle), nav links (bottom)
  if (utilitySection) nav.append(decorateUtilityBar(utilitySection));
  if (brandSection) nav.append(decorateBrandRow(brandSection, toolsSection));
  if (sectionsEl) nav.append(decorateNavLinks(sectionsEl));

  // Keyboard and click-outside handlers
  window.addEventListener('keydown', closeOnEscape);
  document.addEventListener('click', closeOnClickOutside);

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);

  // Hide header on scroll down, show on scroll up
  let lastScrollY = window.scrollY;
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          navWrapper.classList.add('nav-hidden');
        } else {
          navWrapper.classList.remove('nav-hidden');
        }
        lastScrollY = currentScrollY;
        ticking = false;
      });
      ticking = true;
    }
  });
}
