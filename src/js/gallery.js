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
import { esc, hit, spriteHref } from './utils.js';
import { openZoom } from './zoom.js';

const ACTIVE = 'gallery__photo--active';
const ON = 'gallery__thumb--on';

/**
 * Разметка галереи.
 *
 * @param {Array<import('./data.js').Shot>} shots Снимки товара. Пустые
 *   отброшены раньше, в data.js: у товара без файла снимка нет вовсе.
 * @param {string} alt Название товара для подписи.
 * @param {string} sizes Значение атрибута sizes под конкретную раскладку.
 * @returns {string} Разметка или пустая строка, если снимков нет.
 */
export function galleryHTML(shots, alt, sizes) {
  if (!shots.length) {
    return '';
  }

  const name = esc(alt);
  const stage = shots.map((s, i) => photo(s, name, sizes, i)).join('');

  // Один снимок — ни миниатюр, ни стрелок: переключать нечего. А обёртку
  // печатаем всё равно: снимок лежит position: absolute, и без .gallery__stage
  // ему не от чего отсчитывать inset — он растягивается на всю страницу.
  // Ровно это и было на живом сайте у комода с единственной фотографией:
  // «просто фотография на всю страницу, вёрстка ломается».
  if (1 === shots.length) {
    return `<div class="gallery"><div class="gallery__stage">${ stage }</div></div>`;
  }

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

function photo(s, name, sizes, i) {
  const srcset = s.srcset ? ` srcset="${ esc(s.srcset) }" sizes="${ esc(sizes) }"` : '';

  // Первый снимок грузится сразу, остальные лениво: пока по ним не нажали,
  // они не нужны, а это втрое меньше трафика при открытии страницы
  return `<img class="gallery__photo${ i ? '' : ` ${ ACTIVE }` }" src="${ esc(s.photo) }"${ srcset } alt="${ name }${ i ? ` — снимок ${ i + 1 }` : '' }"${ i ? ' loading="lazy"' : '' }>`;
}

/**
 * Включает переключение внутри уже вставленной галереи.
 *
 * @param {ParentNode} root Документ или элемент, внутри которого искать галереи.
 * @returns {void}
 */
export function initGallery(root) {
  // Приведения к HTML-типам: querySelectorAll обещает Element, а мы читаем
  // у галереи события клавиатуры, у миниатюр dataset, а снимки отдаём
  // в увеличение, где нужен именно HTMLImageElement
  const galleries = /** @type {NodeListOf<HTMLElement>} */ (root.querySelectorAll('.gallery'));

  for (const gallery of galleries) {
    const photos = /** @type {HTMLImageElement[]} */ ([...gallery.querySelectorAll('.gallery__photo')]);
    const thumbs = /** @type {HTMLElement[]} */ ([...gallery.querySelectorAll('.gallery__thumb')]);

    // Увеличение вешаем до проверки на число снимков: у сорока товаров из
    // сорока одного снимок единственный, и рассмотреть обивку нужно как раз
    // там. Курсор-лупу даёт CSS, поэтому кадр и без подсказки выглядит нажимаемым
    const stage = gallery.querySelector('.gallery__stage');

    stage.addEventListener('click', (e) => {
      // Кнопки-стрелки лежат внутри кадра, и нажатие по ним всплывает сюда.
      // Без этой проверки покупатель на телефоне листал снимки стрелкой,
      // а ему поверх каждого нажатия распахивалось увеличение
      if (hit(e, '.gallery__arrow')) {
        return;
      }

      openZoom(photos, photos.findIndex((el) => el.classList.contains(ACTIVE)));
    });

    // Один снимок: ни миниатюр, ни стрелок в разметке нет, переключать нечего.
    // Без этой проверки ниже падало бы на strip.scrollWidth — ряда миниатюр
    // у такой галереи не существует, а падение унесло бы с собой всё,
    // что идёт после вызова
    if (thumbs.length < 2) {
      continue;
    }

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
    const step = (shift) => {
      const now = thumbs.findIndex((t) => t.classList.contains(ON));

      show((now + shift + photos.length) % photos.length);
    };

    /** @type {NodeListOf<HTMLElement>} */ (gallery.querySelectorAll('.gallery__arrow')).forEach((arrow) => {
      arrow.addEventListener('click', () => step(Number(arrow.dataset.step)));
    });

    // Стрелки на клавиатуре. Слушаем галерею, а не документ: событие всплывает
    // от миниатюры или от кнопки-стрелки, то есть работает, когда человек
    // и так внутри галереи. Слушать документ значило бы отбирать стрелки
    // у прокрутки страницы, пока фокус где-то совсем в другом месте.
    gallery.addEventListener('keydown', (e) => {
      if ('ArrowLeft' === e.key) {
        step(-1);
      } else if ('ArrowRight' === e.key) {
        step(1);
      }
    });
  }
}
