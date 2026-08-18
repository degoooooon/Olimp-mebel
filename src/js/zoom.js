// ─── Увеличение снимка товара ───
//
// Клик по крупному кадру открывает снимок во весь экран. До этого клик
// по фотографии не делал ничего, хотя жмут по ней в первую очередь: привычка
// с Авито и Озона. Для мебели это не украшение — покупатель смотрит фактуру
// ткани, шов, как собран механизм. В кадре 520×390 этого не видно, а файл
// на сервере лежит 1600×1200: данные есть, просто не показывались.
//
// Разметку диалога создаём из скрипта, а не держим в вёрстке. Галерею печатают
// два места — galleryHTML для макета и olimp_product_gallery для темы, — и
// третья копия разметки разошлась бы с ними ровно так же, как разошлась ветка
// с одним снимком. Здесь она одна и приходит обеим сторонам даром.
//
// dialog, а не свой слой: закрытие по Escape, запирание фокуса внутри и
// затемнение фона он делает сам. Для корзины всё это писалось руками, там
// панель выезжает и живёт по своим правилам, а тут ничего своего не нужно.
// Popover для этого не берём — он пока ниже планки Baseline widely available.
import { esc, spriteHref } from './utils.js';

let dialog = null; // создаём при первом открытии, а не при загрузке страницы
let shots = []; // снимки текущей галереи, в порядке разметки
let at = 0; // какой из них открыт

let photo = null;
let counter = null;

// Крупный файл берём из srcset исходного снимка, поменяв sizes на всю ширину
// окна. Свой src ставить нельзя: в кадре 520px браузер выбрал мелкий вариант,
// и он же растянулся бы на весь экран мыльным пятном. С sizes: 100vw выбор
// делает сам браузер, и делает его правильно.
function fill(index) {
  const source = shots[index];

  at = index;
  photo.src = source.currentSrc || source.src;
  photo.alt = source.alt;

  if (source.srcset) {
    photo.srcset = source.srcset;
    photo.sizes = '100vw';
  } else {
    photo.removeAttribute('srcset');
    photo.removeAttribute('sizes');
  }

  counter.textContent = `${ index + 1 } из ${ shots.length }`;
  // Счётчик и кнопки нужны только там, где есть что листать: у большинства
  // товаров снимок один, и стрелки в никуда сбивают с толку
  dialog.classList.toggle('zoom--single', shots.length < 2);
}

// По кругу, как и стрелки под кадром: на краю кнопка иначе перестаёт отвечать,
// и это читается как поломка
function step(shift) {
  fill((at + shift + shots.length) % shots.length);
}

function build() {
  const sprite = spriteHref();

  dialog = document.createElement('dialog');
  dialog.className = 'zoom';
  dialog.innerHTML = `
    <img class="zoom__photo" src="" alt="">
    <p class="zoom__count" aria-live="polite"></p>
    <button class="zoom__close" type="button" aria-label="Закрыть увеличение">
      <svg class="icon" aria-hidden="true"><use href="${ esc(sprite) }#i-x"/></svg>
    </button>
    <button class="zoom__arrow zoom__arrow--prev" type="button" data-step="-1" aria-label="Предыдущий снимок">
      <svg class="zoom__chevron" aria-hidden="true"><use href="${ esc(sprite) }#i-chevron"/></svg>
    </button>
    <button class="zoom__arrow zoom__arrow--next" type="button" data-step="1" aria-label="Следующий снимок">
      <svg class="zoom__chevron" aria-hidden="true"><use href="${ esc(sprite) }#i-chevron"/></svg>
    </button>`;

  photo = dialog.querySelector('.zoom__photo');
  counter = dialog.querySelector('.zoom__count');

  dialog.querySelector('.zoom__close').addEventListener('click', () => dialog.close());

  dialog.querySelectorAll('.zoom__arrow').forEach((arrow) => {
    arrow.addEventListener('click', () => step(Number(arrow.dataset.step)));
  });

  // Клик мимо снимка закрывает. Проверяем, что попали именно в сам диалог:
  // его площадь — это фон вокруг кадра, а нажатие по кадру или по кнопке
  // придёт от них, и закрывать в этом случае нечего
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.close();
    }
  });

  dialog.addEventListener('keydown', (e) => {
    if ('ArrowLeft' === e.key) {
      step(-1);
    } else if ('ArrowRight' === e.key) {
      step(1);
    }
  });

  // Пока диалог открыт, страница под ним прокручиваться не должна: иначе
  // колесо уводит каталог за спиной у человека. Тот же класс, что у корзины
  dialog.addEventListener('close', () => document.body.classList.remove('no-scroll'));

  document.body.append(dialog);
}

/**
 * Открывает снимок во весь экран.
 *
 * @param {HTMLImageElement[]} list Снимки галереи в порядке разметки.
 * @param {number} index Какой показать; нечисло или промах трактуем как первый.
 * @returns {void}
 */
export function openZoom(list, index) {
  if (!list.length) {
    return;
  }

  if (null === dialog) {
    build();
  }

  shots = list;
  fill(Number.isInteger(index) && index >= 0 && index < list.length ? index : 0);
  document.body.classList.add('no-scroll');
  dialog.showModal();
}
