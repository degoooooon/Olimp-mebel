// ─── Галерея снимков товара ───
//
// Снимки лежат стопкой, показан один. Поверх — невидимые зоны: сколько
// снимков, столько вертикальных полос во всю высоту. Мышь идёт по кадру
// и переключает снимки, ничего не нажимая. Так сделано у Авито, и это
// удобнее стрелок: не надо целиться в мелкий кружок.
//
// Наведения на телефоне не существует, поэтому под кадром точки. Они
// не украшение: во-первых, показывают, что снимков несколько, во-вторых,
// по ним можно ткнуть пальцем и пройти с клавиатуры. Без них галерея была бы
// доступна только человеку с мышью.
//
// Вертикальную простыню из трёх снимков заменяет именно это: страница
// перестаёт растягиваться на три экрана, а посмотреть можно всё.
import { esc } from './utils.js';

const ACTIVE = 'gallery__photo--active';

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

  // Один снимок — галерея не нужна: ни зон, ни точек, просто картинка.
  // Иначе получилась бы одна точка под кадром, которая ничего не делает
  if (1 === shots.length) {
    return photo(shots[0], name, sizes, 0);
  }

  const photos = shots.map((s, i) => photo(s, name, sizes, i)).join('');

  // aria-hidden у зон намеренно: для скринридера это пустые блоки без смысла,
  // а переключение ему доступно через точки — они настоящие кнопки
  const zones = `<div class="gallery__zones" aria-hidden="true" style="--zones:${ shots.length }">${
    shots.map(() => '<span class="gallery__zone"></span>').join('')
  }</div>`;

  const dots = `<div class="gallery__dots">${
    shots.map((s, i) => `<button class="gallery__dot${ i ? '' : ' gallery__dot--on' }" type="button" data-shot="${ i }" aria-label="Снимок ${ i + 1 } из ${ shots.length }"></button>`).join('')
  }</div>`;

  return `<div class="gallery">${ photos }${ zones }${ dots }</div>`;
}

function photo(s, name, sizes, i) {
  const srcset = s.srcset ? ` srcset="${ esc(s.srcset) }" sizes="${ esc(sizes) }"` : '';

  // Первый снимок грузится сразу, остальные лениво: пока по ним не провели
  // мышью, они не нужны, а на карточке с тремя кадрами это втрое меньше
  // трафика при открытии
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
    const dots = [...gallery.querySelectorAll('.gallery__dot')];

    const show = (i) => {
      photos.forEach((el, n) => el.classList.toggle(ACTIVE, n === i));
      dots.forEach((el, n) => el.classList.toggle('gallery__dot--on', n === i));
    };

    gallery.querySelectorAll('.gallery__zone').forEach((zone, i) => {
      zone.addEventListener('mouseenter', () => show(i));
    });

    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => show(i));
      // Tab по точкам тоже переключает: человек с клавиатуры увидит снимки,
      // не нажимая ничего
      dot.addEventListener('focus', () => show(i));
    });

    // Увели мышь — возвращаем первый снимок. Иначе карточка остаётся
    // с третьим кадром, и в сетке товары выглядят вразнобой
    gallery.addEventListener('mouseleave', () => show(0));
  }
}
