import {MAX_UPLOADS, UPLOAD_LABEL, ADD_MORE_MEDIA, HTML_UPLOAD_FILES, HTML_REMOVE_FILE_BUTTON} from './constants.js';

function createUploadRowTemplate(isFirst = false) {
  return `${HTML_UPLOAD_FILES} ${!isFirst? HTML_REMOVE_FILE_BUTTON: ''}`;
}

function handleFilePreview(input,image,placeholder) {
  const file = input.files?.[0];
  if (!file) {
    image.hidden = true;
    image.src = '';
    placeholder.style.display = 'block';
    return;
  }

  document.querySelector('.ugc-file-error')?.remove();

  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (event) => {
      image.src = event.target.result;
      image.hidden = false;
      placeholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
  } else {
    image.hidden = true;
    image.src = '';
    placeholder.style.display = 'block';
  }
}

export function createUploadRow(isFirst = false) {
  const row = document.createElement('div');
  row.className = 'ugc-upload-row';
  row.innerHTML = createUploadRowTemplate(isFirst);

  const input = row.querySelector('.ugc-file-input');
  const image = row.querySelector('.ugc-preview-image');
  const placeholder = row.querySelector('.ugc-preview-placeholder');

  input.addEventListener('change', () => {
    handleFilePreview(input,image,placeholder);
  });

  const removeButton = row.querySelector('.ugc-remove-upload');

  if (removeButton) {
    removeButton.addEventListener('click', () => {
        row.remove();
        const addButton =document.querySelector('.ugc-add-more-media');
        if (document.querySelectorAll('.ugc-upload-row').length < MAX_UPLOADS) {
          addButton.style.display = '';
        }
      },
    );
  }
  return row;
}

export function initializeUpload(wrapper) {
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
  addButton.textContent = ADD_MORE_MEDIA;

  container.appendChild( createUploadRow(true) );

  addButton.addEventListener('click',() => {
      const count = container.querySelectorAll('.ugc-upload-row').length;
      if (count >= MAX_UPLOADS) {
        addButton.style.display = 'none';
        return;
      }
      container.appendChild(createUploadRow());
      if (container.querySelectorAll('.ugc-upload-row').length >= MAX_UPLOADS) {
        addButton.style.display = 'none';
      }
    },
  );

  wrapper.appendChild(container);
  wrapper.appendChild(addButton);
}