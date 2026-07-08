import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Dynamically injects the Brightcove initialization script if missing
 */
function loadBrightcoveScript(accountId, playerId) {
  const scriptId = `bc-script-${accountId}-${playerId}`;
  if (document.getElementById(scriptId)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://brightcove.net{accountId}/${playerId}_default/index.min.js`;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
}

export default function decorate(block) {
  let brightcoveAccount = '';
  let brightcovePlayer = 'default';
  const items = [];
  
  const rows = [...block.children];
  if (rows.length === 0) return;

  // 1. Process config row
  const firstRowCells = [...rows[0].children];
  const isConfigRow = firstRowCells[0]?.textContent.trim().toLowerCase() === 'configuration';
  
  let startingIndex = 0;
  if (isConfigRow) {
    startingIndex = 1;
    firstRowCells.forEach((cell) => {
      const text = cell.textContent.trim();
      if (text.toLowerCase().startsWith('accountid:')) {
        brightcoveAccount = text.split(':')[1]?.trim();
      } else if (text.toLowerCase().startsWith('playerid:')) {
        brightcovePlayer = text.split(':')[1]?.trim() || 'default';
      }
    });
  }

  // Check URL parameters once on initial load
  const urlParams = new URLSearchParams(window.location.search);
  let matchedIndex = 0; // Fallback default to the first item (index 0)

  // 2. Map data items
  for (let i = startingIndex; i < rows.length; i++) {
    const cells = [...rows[i].children];
    if (cells.length >= 3) {
      const title = cells[0].textContent.trim();
      const fullText = cells[1].innerHTML;
      const imageEl = cells[2].querySelector('img');
      const videoLinkEl = cells[3]?.querySelector('a') || cells[3];
      const isFeatured = cells[4]?.textContent.trim().toLowerCase() === 'true';
      
      // Target the 6th column (index 5) for the query parameter name
      const queryParamName = cells[5]?.textContent.trim() || '';
      
      let videoId = null;
      if (videoLinkEl) {
        const videoRaw = videoLinkEl.textContent.trim();
        if (videoRaw) {
          videoId = videoRaw.match(/^\d+$/) ? videoRaw : videoRaw.split('/').pop();
        }
      }

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = fullText;
      const rawText = tempDiv.textContent || tempDiv.innerText;
      const textSnippet = rawText.length > 65 ? `${rawText.substring(0, 65)}...` : rawText;

      const itemIndex = items.length;
      items.push({
        title,
        fullText,
        textSnippet,
        imageSrc: imageEl ? imageEl.src : '',
        imageAlt: imageEl ? imageEl.alt : '',
        videoId,
        isFeatured,
        queryParamName, // Store the parameter on the item object
      });

      // If the parameter text matches a key in the URL, flag this index as matched
      if (queryParamName && urlParams.has(queryParamName)) {
        matchedIndex = itemIndex;
      }
    }
  }

  block.textContent = '';
  if (items.length === 0) return;

  // 3. Build View Panel Components
  const viewSection = document.createElement('div');
  viewSection.className = 'mv-view-section';
  
  const viewContentContainer = document.createElement('div');
  viewContentContainer.className = 'mv-view-content-box';

  const viewTitle = document.createElement('h2');
  viewTitle.className = 'mv-view-title';
  
  const viewText = document.createElement('div');
  viewText.className = 'mv-view-text';
  
  const viewMediaContainer = document.createElement('div');
  viewMediaContainer.className = 'mv-view-media';

  viewContentContainer.append(viewTitle, viewText, viewMediaContainer);
  viewSection.append(viewContentContainer);

  const updateViewer = async (item) => {
    viewTitle.innerHTML = item.title;
    viewText.innerHTML = item.fullText;
    viewMediaContainer.textContent = ''; 

    if (item.videoId && brightcoveAccount) {
      const videoWrapper = document.createElement('div');
      videoWrapper.className = 'mv-brightcove-wrapper';

      const videoEl = document.createElement('video-js');
      videoEl.setAttribute('data-video-id', item.videoId);
      videoEl.setAttribute('data-account', brightcoveAccount);
      videoEl.setAttribute('data-player', brightcovePlayer);
      videoEl.setAttribute('data-embed', 'default');
      videoEl.setAttribute('controls', '');
      videoEl.classList.add('video-js', 'bc-video');

      videoWrapper.append(videoEl);
      viewMediaContainer.append(videoWrapper);

      try {
        await loadBrightcoveScript(brightcoveAccount, brightcovePlayer);
        if (window.bc) window.bc(videoEl);
      } catch (err) {
        console.error('Brightcove failed:', err);
      }
    } else if (item.imageSrc) {
      const optimizedPic = createOptimizedPicture(item.imageSrc, item.imageAlt || item.title, false, [{ width: '1000' }]);
      viewMediaContainer.append(optimizedPic);
    }
  };

  // 4. Build List Selection Grid Elements
  const listSection = document.createElement('div');
  listSection.className = 'mv-list-section';

  items.forEach((item) => {
    const card = document.createElement('div');

    card.className = 'mv-card';
    if (item.videoId) card.classList.add('mv-video-card');
    if (item.isFeatured) card.classList.add('mv-featured-card');

    const cardInner = document.createElement('div');
    cardInner.className = 'mv-card-inner';

    const mediaWrap = document.createElement('div');
    mediaWrap.className = 'mv-card-media-wrap';

    if (item.imageSrc) {
      const thumbPic = createOptimizedPicture(item.imageSrc, item.imageAlt || item.title, false, [{ width: '400' }]);
      mediaWrap.append(thumbPic);
    }

    if (item.isFeatured) {
      const starRibbon = document.createElement('div');
      starRibbon.className = 'mv-star-ribbon';
      starRibbon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;
      mediaWrap.append(starRibbon);
    }

    if (item.videoId) {
      const durationBadge = document.createElement('div');
      durationBadge.className = 'mv-duration-badge';
      durationBadge.textContent = '0:26';
      mediaWrap.append(durationBadge);
    }

    const cornerBadge = document.createElement('div');
    cornerBadge.className = 'mv-corner-badge';
    if (item.videoId) {
      cornerBadge.innerHTML = `<svg viewBox="0 0 24 24" class="icon-play" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    } else {
      cornerBadge.innerHTML = `<svg viewBox="0 0 24 24" class="icon-quote" fill="currentColor"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>`;
    }
    mediaWrap.append(cornerBadge);

    const contentWrap = document.createElement('div');
    contentWrap.className = 'mv-card-content';
    
    const cardTitle = document.createElement('h3');
    cardTitle.textContent = item.title;
    
    const cardDesc = document.createElement('p');
    cardDesc.textContent = item.textSnippet;

    contentWrap.append(cardTitle, cardDesc);
    cardInner.append(mediaWrap, contentWrap);
    card.append(cardInner);

    card.addEventListener('click', () => {
      document.querySelector('.mv-view-section').style.display = 'block';

      block.querySelectorAll('.mv-card').forEach(c => c.classList.remove('is-active'));
      card.classList.add('is-active');
      updateViewer(item);
      
      // Update browser URL query parameter without page reload
      if (item.queryParamName) {
        const newUrl = `${window.location.pathname}?${item.queryParamName}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
      } else {
        // If a card doesn't have an assigned query parameter, clean up the URL search segment
        window.history.pushState({ path: window.location.pathname }, '', window.location.pathname);
      }

      viewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    listSection.append(card);
  });

  block.append(viewSection, listSection);

  // Initialize the viewer based on the matched URL index instead of always defaulting to 0
  if (items.length > 0) {
    updateViewer(items[matchedIndex]);
    listSection.children[matchedIndex].classList.add('is-active');
    
    // Smooth scroll to the main viewer if a deep-link query parameter match was triggered
    if (matchedIndex > 0) {
      setTimeout(() => {
        viewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }
}
