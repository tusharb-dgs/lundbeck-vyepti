import { createOptimizedPicture } from './aem.js';

/**
 * Reads single-bracket syntax from the first child of each block cell div.
 * If a cell's first child is <p><code>[classname]</code></p> or
 * <p><code>[classname-1,classname-2]</code></p>, the class name(s) are
 * added to the cell div and the <p> is removed.
 * @param {Element} block
 */
export function decorateCellClass(block) {
  [...block.children].forEach((row) => {
    [...row.children].forEach((div) => {
      const first = div.firstElementChild;
      if (!first || first.tagName !== 'P' || first.children.length !== 1) return;
      const code = first.firstElementChild;
      if (code.tagName !== 'CODE') return;
      const match = code.textContent.match(/^\[([a-zA-Z0-9_,-]+)\]$/);
      if (!match) return;
      const classes = match[1].split(',').filter(Boolean);
      div.classList.add(...classes);
      first.remove();
    });
  });
}
/**
 * Shared YouTube and Vimeo embed HTML builders.
 * Used by video and embed blocks. Returns HTML strings for DOMPurify or DOM creation.
 *
 * @param {URL} url - Embed URL
 * @param {boolean} [autoplay=false] - Autoplay when visible
 * @param {boolean} [background=false] - Background/ambient mode (muted, loop, no controls)
 * @returns {string} HTML string for the embed wrapper
 */

const IFRAME_WRAPPER_STYLE = 'left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;';
const IFRAME_STYLE = 'border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;';
const YOUTUBE_ALLOW = 'autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope';

function toPair(k, v) {
  return `${k}=${encodeURIComponent(v)}`;
}

function buildQueryString(params, prefix) {
  const pairs = Object.entries(params).map(([k, v]) => toPair(k, v)).join('&');
  return `${prefix}${pairs}`;
}

function getYoutubeSuffix(autoplay, background) {
  const params = {
    autoplay: autoplay ? '1' : '0',
    mute: background ? '1' : '0',
    controls: background ? '0' : '1',
    disablekb: background ? '1' : '0',
    loop: background ? '1' : '0',
    playsinline: background ? '1' : '0',
  };
  return buildQueryString(params, '&');
}

function getYoutubeVideoId(url) {
  if (url.origin.includes('youtu.be')) {
    const [, vid] = url.pathname.split('/');
    return vid ? encodeURIComponent(vid) : '';
  }
  const v = new URLSearchParams(url.search).get('v');
  return v ? encodeURIComponent(v) : '';
}

function getYoutubeSrc(url, autoplay, background) {
  const vid = getYoutubeVideoId(url);
  const suffix = (background || autoplay) ? getYoutubeSuffix(autoplay, background) : '';
  if (vid) {
    return `https://www.youtube.com/embed/${vid}?rel=0&v=${vid}${suffix}`;
  }
  return `https://www.youtube.com${url.pathname}`;
}

function wrapIframe(src, allow, title) {
  return `<div class="iframe-wrapper" style="${IFRAME_WRAPPER_STYLE}">
<iframe src="${src}" style="${IFRAME_STYLE}" allow="${allow}" allowfullscreen="" scrolling="no" title="${title}" loading="lazy"></iframe>
</div>`;
}

export function getYoutubeEmbedHtml(url, autoplay = false, background = false) {
  const src = getYoutubeSrc(url, autoplay, background);
  return wrapIframe(src, YOUTUBE_ALLOW, 'Content from Youtube');
}

function getVimeoSrc(url, autoplay, background) {
  const [, video] = url.pathname.split('/');
  const params = (background || autoplay)
    ? { autoplay: autoplay ? '1' : '0', background: background ? '1' : '0' }
    : {};
  const suffix = Object.keys(params).length ? buildQueryString(params, '?') : '';
  return `https://player.vimeo.com/video/${video}${suffix}`;
}

export function getVimeoEmbedHtml(url, autoplay = false, background = false) {
  const src = getVimeoSrc(url, autoplay, background);
  const allow = 'autoplay; fullscreen; picture-in-picture';
  return `<div class="iframe-wrapper" style="${IFRAME_WRAPPER_STYLE}">
<iframe src="${src}" style="${IFRAME_STYLE}" frameborder="0" allow="${allow}" allowfullscreen title="Content from Vimeo" loading="lazy"></iframe>
</div>`;
}

/* -------------------------------------------------------------------------- */
/* Responsive picture: up to 5 images per cell (art-direction <picture>) */
/* -------------------------------------------------------------------------- */

const MAX_BLOCK_CELL_IMAGES = 5;

/** Default breakpoints for single-image cells (same defaults as `createOptimizedPicture` in aem.js). */
export const DEFAULT_BLOCK_SINGLE_PICTURE_BREAKPOINTS = [
  { media: '(min-width: 600px)', width: '2000' },
  { width: '750' },
];

const ART_DIRECTION_DEFAULT_IMG_WIDTH = '750';

/**
 * Art-direction `media` + CDN `width` for source index 1..4 (whitelist).
 * @param {number} imageIndex
 * @returns {{ media: string, width: string }}
 */
function getArtDirectionSourceMeta(imageIndex) {
  switch (imageIndex) {
    case 1:
      return { media: '(min-width: 768px)', width: '992' };
    case 2:
      return { media: '(min-width: 992px)', width: '1200' };
    case 3:
      return { media: '(min-width: 1200px)', width: '2000' };
    case 4:
      return { media: '(min-width: 1600px)', width: '2560' };
    default:
      return { media: '(min-width: 768px)', width: '750' };
  }
}

/**
 * Walks a block image cell in document order; collects up to five `{ src, alt }` entries.
 * @param {HTMLElement} cell
 * @returns {{ src: string, alt: string }[]}
 */
export function collectBlockCellImageSources(cell) {
  const out = [];
  const walk = (root) => {
    if (out.length >= MAX_BLOCK_CELL_IMAGES) return;
    [...root.children].forEach((el) => {
      if (out.length >= MAX_BLOCK_CELL_IMAGES) return;
      if (el.matches('picture')) {
        const img = el.querySelector('img[src]');
        if (img) {
          out.push({ src: img.src, alt: img.getAttribute('alt') ?? '' });
        }
      } else if (el.matches('img[src]')) {
        if (!el.closest('picture')) {
          out.push({ src: el.src, alt: el.getAttribute('alt') ?? '' });
        }
      } else {
        walk(el);
      }
    });
  };
  walk(cell);
  return out;
}

/**
 * One &lt;picture&gt; with art-direction sources (different assets per viewport), same URL pattern as `createOptimizedPicture`.
 * @param {{ src: string, alt: string }[]} sources 2–5 entries
 * @param {boolean} eager loading on the fallback &lt;img&gt;
 * @returns {HTMLPictureElement}
 */
export function createArtDirectionPicture(sources, eager) {
  const capped = sources.slice(0, MAX_BLOCK_CELL_IMAGES);
  const picture = document.createElement('picture');

  for (let i = capped.length - 1; i >= 1; i -= 1) {
    const { src } = capped[i];
    const url = !src.startsWith('http') ? new URL(src, window.location.href) : new URL(src);
    const { origin, pathname } = url;
    const ext = pathname.split('.').pop();
    const { media, width } = getArtDirectionSourceMeta(i);

    const webp = document.createElement('source');
    webp.setAttribute('media', media);
    webp.setAttribute('type', 'image/webp');
    webp.setAttribute('srcset', `${origin}${pathname}?width=${width}&format=webply&optimize=medium`);
    picture.append(webp);

    const fallback = document.createElement('source');
    fallback.setAttribute('media', media);
    fallback.setAttribute(
      'srcset',
      `${origin}${pathname}?width=${width}&format=${ext}&optimize=medium`,
    );
    picture.append(fallback);
  }

  const defaultSrc = capped[0].src;
  const defaultAlt = capped[0].alt;
  const url0 = !defaultSrc.startsWith('http')
    ? new URL(defaultSrc, window.location.href)
    : new URL(defaultSrc);
  const { origin, pathname } = url0;
  const ext = pathname.split('.').pop();

  const img = document.createElement('img');
  img.setAttribute('loading', eager ? 'eager' : 'lazy');
  img.setAttribute('alt', defaultAlt);
  img.setAttribute(
    'src',
    `${origin}${pathname}?width=${ART_DIRECTION_DEFAULT_IMG_WIDTH}&format=${ext}&optimize=medium`,
  );
  picture.append(img);

  return picture;
}

/**
 * @typedef {Object} BuildPictureCellOptions
 * @property {boolean} [eagerSingle=true] - `loading` for single-image `createOptimizedPicture` path
 * @property {boolean} [eagerArtDirection=true] - `loading` on fallback &lt;img&gt; in multi-image art-direction path
 * @property {Array<{ media?: string, width: string }>} [singlePictureBreakpoints] - overrides for single-image optimization
 */

/**
 * Builds a fragment for a block image cell: pass-through (no images), `createOptimizedPicture` (one image), or art-direction picture (2–5).
 * @param {HTMLElement} cell
 * @param {BuildPictureCellOptions} [options]
 * @returns {DocumentFragment}
 */
export function buildPictureContentFromImageCell(cell, options = {}) {
  const {
    eagerSingle = true,
    eagerArtDirection = true,
    singlePictureBreakpoints = DEFAULT_BLOCK_SINGLE_PICTURE_BREAKPOINTS,
  } = options;

  const sources = collectBlockCellImageSources(cell);
  const frag = document.createDocumentFragment();

  if (sources.length === 0) {
    frag.append(...cell.childNodes);
    return frag;
  }

  if (sources.length === 1) {
    frag.append(
      createOptimizedPicture(
        sources[0].src,
        sources[0].alt,
        eagerSingle,
        singlePictureBreakpoints,
      ),
    );
    return frag;
  }

  frag.append(createArtDirectionPicture(sources, eagerArtDirection));
  return frag;
}
