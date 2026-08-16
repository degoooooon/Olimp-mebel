// ─── Галерея снимков товара ───
//
// Снимки лежат стопкой, показан один. Поверх — полосы во всю высоту кадра:
// сколько снимков, столько полос. Мышь идёт по кадру и переключает снимки,
// ничего не нажимая. Так сделано у Авито и Paratype, и это удобнее стрелок:
// не надо целиться в мелкий кружок.
//
// Указатель — не точки, а линия сверху, разрезанная на столько же кусков.
// Кусок активного снимка светлый, остальные притушены: сразу видно и сколько
// всего снимков, и какой открыт. Точки давали то же самое, но занимали угол
// кадра и на светлой фотографии терялись.
//
// Полосы — настоящие кнопки, а не пустые блоки. Наведения на телефоне
// не существует, и без этого галерея работала бы только у человека с мышью:
// нажатие пальцем по левой, средней или правой трети переключает снимок.
import { esc } from './utils.js';

const ACTIVE = 'gallery__photo--active';
const ON = 'gallery__zone--on';

/**
 * Разметка галереи.
 *
 * @param {Array<{photo: string, srcset?: string}>} shots Снимки товара.
 * @param {string} alt Название товара для подписи.
 * @param {string} sizes Значение атрибута sizes под конкретную раскладку.
 * @returns {string} Разметка или пустая строка, если снимков нет.
 */
export function galleryHTML(shots, alt, sizes) {
  if (!shots.length) {
    return '';
  }

  const name = esc(alt);

  // Один снимок — галерея не нужна: ни полос, ни указателя. Иначе под кадром
  // висела бы одна линия во всю ширину, которая ничего не переключает
  if (1 === shots.length) {
    return photo(shots[0], name, sizes, 0);
  }

  const photos = shots.map((s, i) => photo(s, name, sizes, i)).join('');

  const zones = shots.map((s, i) =>
    `<button class="gallery__zone${ i ? '' : ` ${ ON }` }" type="button" aria-label="Снимок ${ i + 1 } из ${ shots.length }">
      <span class="gallery__bar"></span>
    </button>`).join('');

  return `<div class="gallery">${ photos }<div class="gallery__zones" style="--zones:${ shots.length }">${ zones }</div></div>`;
}

function photo(s, name, sizes, i) {
  const srcset = s.srcset ? ` srcset="${ esc(s.srcset) }" sizes="${ esc(sizes) }"` : '';

  // Первый снимок грузится сразу, остальные лениво: пока по ним не провели
  // мышью, они не нужны, а это втрое меньше трафика при открытии карточки
  return `<img class="gallery__photo${ i ? '' : ` ${ ACTIVE }` }" src="${ esc(s.photo) }"${ srcset } alt="${ name }${ i ? ` — снимок ${ i + 1 }` : '' }"${ i ? ' loading="lazy"' : '' }>`;
}

/**
 * Включает переключение внутри уже вставленной галереи.
 *
 * @param {HTMLElement} root Любой элемент, внутри которого искать галереи.
 * @returns {void}
 */
export function initGallery(root) {
  for (const gallery of root.querySelectorAll('.gallery')) {
    const photos = [...gallery.querySelectorAll('.gallery__photo')];
    const zones = [...gallery.querySelectorAll('.gallery__zone')];

    const show = (i) => {
      photos.forEach((el, n) => el.classList.toggle(ACTIVE, n === i));
      zones.forEach((el, n) => el.classList.toggle(ON, n === i));
    };

    zones.forEach((zone, i) => {
      zone.addEventListener('mouseenter', () => show(i));
      zone.addEventListener('click', () => show(i));
      // Проход табом тоже листает: человек с клавиатуры увидит все снимки,
      // ничего не нажимая
      zone.addEventListener('focus', () => show(i));
    });

    // Подписки на mouseleave нет намеренно: увели мышь — кадр остаётся тот,
    // что смотрели. Возврат к первому сбрасывал бы выбор ровно в тот момент,
    // когда человек отводит курсор, чтобы прочитать характеристики рядом.
  }
}
