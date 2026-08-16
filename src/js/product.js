// ─── Окно товара: крупное изображение ───
// Открывается кликом по карточке каталога — везде, кроме кнопки «В корзину»:
// она остаётся быстрым действием и окно не открывает.
import { PRODUCTS } from './data.js';
import { esc, fmt } from './utils.js';
import { specsHTML } from './specs.js';
import { galleryHTML, initGallery } from './gallery.js';
import { idFromUrl, pushedByUs, pushProduct, dropProduct } from './product-url.js';
import { SPRITE, grid, productModal, productOverlay, productInner, productClose } from './dom.js';

let lastFocused = null;
let hideTimer = null; // отложенное hidden, пока идёт анимация закрытия

const FOCUSABLE = 'a[href], button:not(:disabled), input, select, textarea, [tabindex]:not([tabindex="-1"])';

function render(p) {
  const name = esc(p.name);
  const specs = specsHTML(p);
  const shots = p.photos ?? (p.photo ? [{ photo: p.photo, srcset: p.srcset }] : []);

  const media = shots.length
    ? galleryHTML(shots, p.name, '(min-width: 760px) 680px, 92vw')
    : `<svg class="product__illustration" viewBox="0 0 200 150" role="img" aria-label="${ name }"><use href="${ SPRITE }#i-${ esc(p.img) }"/></svg>`;

  // Фото занимает окно целиком, рисованная иллюстрация — с полями на подложке.
  // С характеристиками фото перестаёт быть единственным содержимым, и поля
  // снова нужны — иначе текст лёг бы вплотную к краям окна.
  productInner.classList.toggle('product__inner--photo', Boolean(p.photo) && !specs);
  productInner.classList.toggle('product__inner--full', Boolean(specs));

  if (!specs) {
    productInner.innerHTML = media;
    initGallery(productInner);
    return;
  }

  const price = Number.isFinite(p.price)
    ? `<p class="product__price">${ fmt(p.price) }</p>`
    : '<p class="product__price product__price--ask">Цена по запросу</p>';

  productInner.innerHTML = `
    <div class="product__media">${ media }</div>
    <div class="product__body">
      <h2 class="product__name">${ name }</h2>
      ${ price }
      ${ specs }
    </div>`;

  // Переключение снимков включаем после вставки: до неё элементов
  // в документе ещё нет, и подписываться было бы не на что
  initGallery(productInner);
}

// aria-modal обещает, что фокус заперт внутри — держим слово
function keepFocusInside(e) {
  const items = [...productModal.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
  if (!items.length) {
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  if (!productModal.contains(document.activeElement)) {
    e.preventDefault();
    first.focus();
  } else if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function open(p) {
  clearTimeout(hideTimer); // отменяем отложенное скрытие от прошлого закрытия
  render(p);
  // Названия в окне больше нет, поэтому имя диалогу даём атрибутом —
  // иначе скринридер объявит его безымянным
  productModal.setAttribute('aria-label', p.name);
  productModal.hidden = false;
  productOverlay.hidden = false;
  productModal.getBoundingClientRect(); // форсируем перерасчёт ради transition
  productModal.classList.add('product--open');
  productOverlay.classList.add('product-overlay--open');
  document.body.classList.add('no-scroll');
  lastFocused = document.activeElement;
  productClose.focus();
}

function close() {
  productModal.classList.remove('product--open');
  productOverlay.classList.remove('product-overlay--open');
  document.body.classList.remove('no-scroll');
  hideTimer = setTimeout(() => {
    productModal.hidden = true;
    productOverlay.hidden = true;
  }, 250);
  if (lastFocused) {
    lastFocused.focus();
  }
}

const isOpen = () => productModal.classList.contains('product--open');

const byId = (id) => PRODUCTS.find((p) => String(p.id) === String(id)) ?? null;

// Единственное место, которое решает, открыто окно или нет: что написано
// в адресе, то и показано. Иначе состояние окна и адрес разъезжаются —
// например, при нажатии «назад» окно оставалось бы висеть поверх каталога.
function syncFromUrl() {
  const p = byId(idFromUrl());

  if (p) {
    open(p);
  } else if (isOpen()) {
    close();
  }
}

// Закрытие по кнопке, оверлею и Escape. Если окно открыли нажатием на
// карточку, в истории лежит наша запись — уходим назад, и тогда кнопка
// «назад» в браузере тоже закрывает окно, а не уносит с сайта. Если человек
// пришёл по ссылке сразу на товар, возвращаться некуда: чистим адрес,
// чтобы обновление страницы не открыло окно снова.
function closeByUser() {
  if (pushedByUs()) {
    history.back();
    return;
  }

  dropProduct();
  close();
}

export function initProduct() {
  grid.addEventListener('click', (e) => {
    // Кнопка «В корзину» — быстрое действие, окно по ней не открываем
    if (e.target.closest('[data-add]')) {
      return;
    }
    // С клавиатуры фокус попадает на изображение-ссылку, мышью удобно
    // ткнуть в любое место карточки — принимаем оба варианта
    const card = e.target.closest('.card');
    if (!card) {
      return;
    }
    // Открытие в новой вкладке оставляем браузеру: Ctrl, Cmd, Shift и средняя
    // кнопка должны работать как на любой ссылке. Ради этого карточка и стала
    // ссылкой — перехватив всё подряд, мы бы отняли то, что сами же дали
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || 0 !== e.button) {
      return;
    }

    const p = byId(card.dataset.id);

    if (!p) {
      return;
    }

    e.preventDefault();
    pushProduct(p.id);
    open(p);
  });

  productClose.addEventListener('click', closeByUser);
  productOverlay.addEventListener('click', closeByUser);

  document.addEventListener('keydown', (e) => {
    if (!isOpen()) {
      return;
    }
    if (e.key === 'Escape') {
      closeByUser();
    } else if (e.key === 'Tab') {
      keepFocusInside(e);
    }
  });

  window.addEventListener('popstate', syncFromUrl);

  // Пришли по ссылке на товар — открываем сразу, не дожидаясь нажатия
  syncFromUrl();
}
