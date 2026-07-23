export const FORM_BLOCK_PATH = '../form/form.js';
export const MAX_UPLOADS = 3;
export const FORM_CONFIGS = {};
export const UPLOAD_LABEL = 'Please upload your file(s)';
export const ADD_MORE_MEDIA = 'Add More Media';

export const ERROR_MESSAGES = {
  firstName: 'Error: First name is required',
  lastName: 'Error: Last name is required',
  emailRequired: 'Error: Email address is required',
  emailInvalid: 'Error: Please enter a valid email address',
  storyRequired: 'Error: Write your story is required',
  storyTooLong: 'Error: Write your story is too long:',
  uploadRequired: 'Error: Upload your video or image is required',
  termsRequired: 'Error: Checkbox is required',
};

export const HTML_UPLOAD_FILES=`
    <div class="ugc-preview-container">
        <div class="ugc-preview-placeholder"><img src="/icons/wrong.svg" alt="Upload placeholder" class="ugc-placeholder-icon"/></div>
        <img class="ugc-preview-image" hidden alt="Preview">
    </div>
    <div class="ugc-upload-content">
        <label class="ugc-upload-label file-upload-sub-label">
        Please upload your file(s)
        </label>
        <input type="file" class="ugc-file-input" accept=".png,.gif,.mov,.jpg,.jpeg,.mp4,.mpg,.mpeg,.avi,.wmv,.m4v" />
    </div>`;

export const HTML_REMOVE_FILE_BUTTON=`<button type="button" class="ugc-remove-upload" aria-label="Remove upload">
                                        <img src="/icons/cross.svg" alt="Remove" class="ugc-remove-upload-icon"/>
                                      </button>`;    

export const SELECTORS = {
  firstName: 'input[name="firstName"]',
  lastName: 'input[name="lastName"]',
  email: 'input[name="email"]',
  story: 'textarea[name="story"]',
  terms: 'input[name="terms"]',
  optionalTerms: 'input[name="optional-terms"]',
  uploadWrapper: '.ugc-file.field-wrapper.file-wrapper',
  fileInputs: '.ugc-file-input',
};                                        