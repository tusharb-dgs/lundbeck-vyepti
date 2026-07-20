import { getBlockId } from '../../scripts/scripts.js';
import { decorateCellClass, buildPictureContentFromImageCell } from '../../scripts/utils.js';

export default function decorate(block) {
  decorateCellClass(block);

  const blockId = getBlockId('columns');
  block.setAttribute('id', blockId);
  block.setAttribute('aria-label', `columns-${blockId}`);
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Columns');

  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      if (col.querySelector('picture')) {
        if (col.children.length === 1) {
          // picture is only content in column
          col.classList.add('columns-img-col');
        } else if (col.children.length >= 2 && col.children.length <= 5) {
          // 2-5 picture variants (bare <picture> or p:has(picture)) for art-direction per breakpoint
          const built = buildPictureContentFromImageCell(col);
          col.replaceChildren(built);
          col.classList.add('columns-img-col');
        }
      }
    });
  });
}
