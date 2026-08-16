// ─── Галерея снимков товара ───
//
// Крупный кадр, под ним ряд миниатюр. Нажал на миниатюру — она встала
// в крупный. Так устроены галереи на Авито и Озоне, и не случайно:
// видно сразу, сколько снимков и что на них, а переключение — одно нажатие
// в понятную цель.
//
// Раньше здесь были невидимые зоны наведения с линией-указателем сверху.
// Убрано: наведение работает только с мышью, а угадать, что по кадру можно
// водить, человек не может — подсказки никакой. Миниатюра сама себе подсказка.
import { esc } from './utils.js';

const ACTIVE = 'gallery__photo--active';
const ON = 'gallery__thumb--on';

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

  // Один снимок — ни миниатюр, ни стрелок: переключать нечего
  if (1 === shots.length) {
    return photo(shots[0], name, sizes, 0);
  }

  const stage = shots.map((s, i) => photo(s, name, sizes, i)).join('');

  // Стрелки — для телефона и планшета. Наведения там нет, а миниатюра
  // размером с ноготь на ходу попадается не с первого раза
  const arrows = ['prev', 'next'].map((dir) =>
    `<button class="gallery__arrow gallery__arrow--${ dir }" type="button" data-step="${ 'prev' === dir ? -1 : 1 }" aria-label="${ 'prev' === dir ? 'Предыдущий снимок' : 'Следующий снимок' }">
      <svg class="gallery__chevron" aria-hidden="true"><use href="${ spriteHref() }#i-chevron"/></svg>
    </button>`).join('');

  // Миниатюры берут тот же файл, что и крупный кадр: он к этому моменту
  // уже загружен, и переключение происходит мгновенно, без второго запроса
  const thumbs = shots.map((s, i) =>
    `<button class="gallery__thumb${ i ? '' : ` ${ ON }` }" type="button" aria-label="Снимок ${ i + 1 } из ${ shots.length }">
      <img class="gallery__thumb-img" src="${ esc(s.photo) }" alt="" loading="lazy">
    </button>`).join('');

  return `<div class="gallery">
    <div class="gallery__stage">${ stage }${ arrows }</div>
    <div class="gallery__thumbs">${ thumbs }</div>
  </div>`;
}

// Адрес спрайта берём из уже стоящей на странице ссылки: в собранной версии
// в имени файла хеш, и угадать его неоткуда
function spriteHref() {
  return document.querySelector('use[href*="spritemap"]')?.getAttribute('href').split('#')[0] ?? '';
}

function photo(s, name, sizes, i) {
  const srcset = s.srcset ? ` srcset="${ esc(s.srcset) }" sizes="${ esc(sizes) }"` : '';

  // Первый снимок грузится сразу, остальные лениво: пока по ним не нажали,
  // они не нужны, а это втрое меньше трафика при открытии страницы
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
    const thumbs = [...gallery.querySelectorAll('.gallery__thumb')];

    const show = (i) => {
      photos.forEach((el, n) => el.classList.toggle(ACTIVE, n === i));
      thumbs.forEach((el, n) => el.classList.toggle(ON, n === i));
      // Подтягиваем выбранную миниатюру в видимую часть ряда. Без этого
      // при десятке снимков листание стрелками уводит на кадр, миниатюра
      // которого осталась за краем, и непонятно, где ты находишься
      thumbs[i]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    };

    thumbs.forEach((thumb, i) => {
      thumb.addEventListener('click', () => show(i));
    });

    // Стрелки нужны и на компьютере, если миниатюры перестали помещаться
    // в ряд: тогда нужной может не быть на экране вовсе. Считаем по факту,
    // а не по числу снимков — влезет ли восемь миниатюр, зависит от ширины
    // окна, а не от того, сколько их завёл владелец. Поэтому и пересчитываем
    // при изменении размера окна.
    const strip = gallery.querySelector('.gallery__thumbs');

    const checkFit = () => {
      gallery.classList.toggle('gallery--many', strip.scrollWidth > strip.clientWidth + 1);
    };

    checkFit();
    window.addEventListener('resize', checkFit);

    // По кругу: с последнего снимка «вперёд» ведёт на первый. Иначе на краю
    // кнопка перестаёт отвечать, и это читается как поломка
    gallery.querySelectorAll('.gallery__arrow').forEach((arrow) => {
      arrow.addEventListener('click', () => {
        const now = thumbs.findIndex((t) => t.classList.contains(ON));

        show((now + Number(arrow.dataset.step) + photos.length) % photos.length);
      });
    });
  }
}
