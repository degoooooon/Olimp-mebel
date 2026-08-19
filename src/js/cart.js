// ─── Корзина: выезжающая панель, счётчик, оформление заказа ───
import { PRODUCTS } from './data.js';
import { fmt, smooth, esc, hit } from './utils.js';
import { cart, saveCart, ORDER_PHONE, MAX_LINK } from './state.js';
import {
  SPRITE,
  grid, cartCount, cartDrawer, cartOverlay, cartItems, cartEmpty,
  cartFoot, cartTotal, cartCall, cartSms, cartCopy, cartMax, cartHint,
  cartOpenBtn, cartClose, cartToCatalog, catalog,
} from './dom.js';

let lastFocused = null;
let hideTimer = null; // отложенное hidden при закрытии панели
let hintTimer = null; // возврат подсказки под кнопками к исходному тексту

const HINT_DEFAULT = 'Назовём цену, сроки и договоримся о доставке';

// Цена товара для показа. У части позиций её пока нет — тогда вместо числа
// пишем словами, иначе везде вылезло бы «NaN ₽».
const ASK = 'по запросу';
const priceText = (n) => (Number.isFinite(n) ? fmt(n) : ASK);

// Текст заказа для мессенджера
function orderText() {
  const lines = [...cart.entries()].map(([id, qty]) => {
    const p = PRODUCTS.find((x) => x.id === id);
    return `• ${ p.name } — ${ qty } шт. × ${ priceText(p.price) }`;
  });
  // Пока цены известны не у всех, «итого» — сумма только известных. Честнее
  // сказать это прямо, чем прислать владельцу сумму, которая ничего не значит.
  const { sum, unknown } = totalSum();
  const total = unknown === 0
    ? fmt(sum)
    : `${ sum > 0 ? `${ fmt(sum) } + ` : '' }${ unknown } поз. по запросу`;
  return `Здравствуйте! Заказ с сайта «Олимп»:\n${ lines.join('\n') }\nИтого: ${ total }`;
}

// Кладёт заказ в буфер обмена. Возвращает false, если не вышло: буфер доступен
// только на https и localhost, да и пользователь может не дать разрешение.
async function copyOrder() {
  try {
    await navigator.clipboard.writeText(orderText());
    return true;
  } catch {
    return false;
  }
}

// Ссылка «написать в SMS»: единственный способ открыть переписку, имея только
// номер — мессенджерам для этого нужен ник. Получатель и текст подставляются
// сразу. Разделитель перед body отличается: iOS ждёт «&», Android и прочие «?».
function smsLink() {
  const sep = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) ? '&' : '?';
  return `sms:+${ ORDER_PHONE }${ sep }body=${ encodeURIComponent(orderText()) }`;
}

// Подвал панели зависит от состава корзины: сумма и текст в sms-ссылке.
// Вызываем везде, где корзина изменилась, — иначе покупатель отправит
// устаревший список.
function updateFoot() {
  const { sum, unknown } = totalSum();
  cartTotal.textContent = unknown === 0
    ? fmt(sum)
    : `${ sum > 0 ? `${ fmt(sum) } + ` : '' }${ unknown } поз. по запросу`;
  cartSms.href = smsLink();
}

// Подсказка под кнопками: показывает результат действия и сама возвращается
function flashHint(message) {
  cartHint.textContent = message;
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => {
    cartHint.textContent = HINT_DEFAULT;
  }, 6000);
}

// Что внутри панели может принять фокус. Список пересобираем на каждый Tab:
// состав меняется — пустая корзина прячет кнопку заказа, а единственный
// оставшийся товар выключает «−».
const FOCUSABLE = 'a[href], button:not(:disabled), input, select, textarea, [tabindex]:not([tabindex="-1"])';

function focusablesInDrawer() {
  // Приведение к HTMLElement не для красоты: querySelectorAll обещает Element,
  // а у Element нет ни offsetParent, ни focus — зовём мы дальше и то, и другое
  const all = /** @type {HTMLElement[]} */ ([...cartDrawer.querySelectorAll(FOCUSABLE)]);

  // offsetParent === null у скрытых через display:none — такие пропускаем
  return all.filter((el) => el.offsetParent !== null);
}

// aria-modal="true" обещает, что фокус заперт внутри диалога. Без этого Tab
// уводил бы на каталог под панелью — невидимый, но доступный с клавиатуры.
function keepFocusInside(e) {
  const items = focusablesInDrawer();
  if (!items.length) {
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  if (!cartDrawer.contains(document.activeElement)) {
    e.preventDefault();
    first.focus(); // фокус уже вне панели — возвращаем
  } else if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

// Один и тот же товар показан кнопкой и в каталоге, и в окне товара —
// приводим в порядок все его кнопки разом, иначе они разойдутся
function syncAddButtons(id) {
  document.querySelectorAll(`[data-add="${ id }"]`).forEach((btn) => {
    setAddBtnState(btn, cart.has(id));
  });
}

/**
 * Кладёт товар в корзину или убирает его.
 *
 * Общая точка для каталога, страницы товара и крестика в панели. Кнопок
 * у одного товара может быть несколько на странице разом — поэтому после
 * изменения приводятся в порядок все, а не та, по которой нажали.
 *
 * @param {number} id Номер товара. Именно число: в корзине ключи числовые,
 *   и строка '42' из data-атрибута создала бы вторую запись того же товара.
 * @returns {void}
 */
export function toggleInCart(id) {
  if (cart.has(id)) {
    cart.delete(id);
  } else {
    cart.set(id, 1);
  }
  saveCart();
  syncAddButtons(id);
  updateCartCount();
}

// Обновляет вид кнопки «В корзину» / «В корзине» в карточке каталога
function setAddBtnState(btn, inCart) {
  btn.classList.toggle('add--in', inCart);
  btn.innerHTML = `<svg class="icon add__icon" aria-hidden="true"><use href="${ SPRITE }#${ inCart ? 'i-check' : 'i-bag' }"/></svg>${ inCart ? 'В корзине' : 'В корзину'}`;
}

/**
 * Выдвигает панель корзины и запирает в ней фокус.
 *
 * @returns {void}
 */
export function openCart() {
  // Отменяем отложенное скрытие: без этого таймер только что закрытой панели
  // спрятал бы уже открытую заново корзину
  clearTimeout(hideTimer);
  renderCart();
  cartDrawer.hidden = false;
  cartOverlay.hidden = false;
  cartDrawer.getBoundingClientRect(); // форсируем перерасчёт, чтобы transition сработал
  cartDrawer.classList.add('cart--open');
  cartOverlay.classList.add('cart-overlay--open');
  document.body.classList.add('no-scroll');
  lastFocused = document.activeElement;
  cartClose.focus();
}

function closeCart() {
  cartDrawer.classList.remove('cart--open');
  cartOverlay.classList.remove('cart-overlay--open');
  document.body.classList.remove('no-scroll');
  hideTimer = setTimeout(() => {
    cartDrawer.hidden = true; cartOverlay.hidden = true;
  }, 300);
  if (lastFocused) {
    lastFocused.focus();
  }
}

// Строка товара в панели
/**
 * Строка товара в панели корзины.
 *
 * @param {import('./data.js').Product} p Товар.
 * @param {number} qty Сколько штук набрано.
 * @returns {string} Разметка строки.
 */
function cartItemHTML(p, qty) {
  const name = esc(p.name);
  return `
  <div class="ci" data-id="${p.id}">
    <div class="ci__thumb">
      ${p.photo
    ? `<img class="ci__photo" src="${esc(p.photo)}" alt="">`
    : `<svg class="ci__illustration" viewBox="0 0 200 150" aria-hidden="true"><use href="${SPRITE}#i-${esc(p.img)}"/></svg>`}
    </div>
    <div>
      <p class="ci__name">${name}</p>
      <span class="ci__unit">${Number.isFinite(p.price) ? `${fmt(p.price)} за шт.` : 'Цена по запросу'}</span>
      <div class="ci__row">
        <span class="qty">
          <button class="qty__btn" type="button" data-act="dec" aria-label="Уменьшить количество" ${qty <= 1 ? 'disabled' : ''}>−</button>
          <output class="qty__value" aria-live="polite">${qty}</output>
          <button class="qty__btn" type="button" data-act="inc" aria-label="Увеличить количество">+</button>
        </span>
        <b class="ci__sum">${Number.isFinite(p.price) ? fmt(p.price * qty) : '—'}</b>
      </div>
    </div>
    <button class="ci__rm" type="button" data-act="rm" aria-label="Убрать ${name} из корзины">
      <svg class="icon" aria-hidden="true"><use href="${SPRITE}#i-x"/></svg>
    </button>
  </div>`;
}

function renderCart() {
  const rows = [...cart.entries()].map(([id, qty]) => {
    const p = PRODUCTS.find((x) => x.id === id);
    return cartItemHTML(p, qty);
  });
  cartItems.innerHTML = rows.join('');
  const empty = cart.size === 0;
  cartItems.style.display = empty ? 'none' : '';
  cartEmpty.classList.toggle('cart__empty--show', empty);
  cartFoot.style.display = empty ? 'none' : '';
  updateFoot();
}

// Сумма заказа по текущей корзине. Отдельно считаем позиции без цены —
// их нельзя ни сложить, ни молча пропустить.
function totalSum() {
  let sum = 0;
  let unknown = 0;
  cart.forEach((qty, id) => {
    const { price } = PRODUCTS.find((x) => x.id === id);
    if (Number.isFinite(price)) {
      sum += price * qty;
    } else {
      unknown += qty;
    }
  });
  return { sum, unknown };
}

// Точечно обновляет строку панели: количество, сумму и доступность «−».
// Полный renderCart здесь нельзя: он пересоздаёт кнопку под фокусом.
function updateRow(row, qty) {
  const p = PRODUCTS.find((x) => x.id === +row.dataset.id);
  const dec = row.querySelector('[data-act="dec"]');
  row.querySelector('output').textContent = qty;
  row.querySelector('.ci__sum').textContent = Number.isFinite(p.price) ? fmt(p.price * qty) : '—';
  dec.disabled = qty <= 1;
  if (dec.disabled && document.activeElement === dec) {
    row.querySelector('[data-act="inc"]').focus(); // не бросаем фокус на body
  }
}

/**
 * Показывает счётчик корзины на странице, где панели нет.
 *
 * На странице товара счётчик говорит, что уже набрано, и ведёт ссылкой
 * в каталог — панель выезжает там. Второй копии её разметки в проекте нет:
 * две копии разошлись бы, вопрос только в сроке.
 *
 * @returns {void}
 */
export function initCartCount() {
  updateCartCount();
}

// Счётчик в шапке = суммарное количество штук
function updateCartCount() {
  let n = 0;
  cart.forEach((q) => {
    n += q;
  });
  // Через String, а не числом: textContent принимает строку, и браузер
  // приводит сам — но тогда подстановку числа не проверить заранее
  cartCount.textContent = String(n);
  cartCount.hidden = n === 0;
}

/**
 * Подписывает корзину на события: кнопки в карточках, панель, клавиатура.
 *
 * Зовётся только на главной — панели корзины на странице товара нет,
 * там работает один initCartCount.
 *
 * @returns {void}
 */
export function initCart() {
  // Кнопка «В корзину» в карточках каталога
  grid.addEventListener('click', (e) => {
    const addBtn = hit(e, '[data-add]');
    if (addBtn) {
      toggleInCart(+addBtn.dataset.add);
    }
  });

  // Клики внутри панели: плюс/минус/убрать
  cartItems.addEventListener('click', (e) => {
    const btn = hit(e, '[data-act]');
    if (!btn) {
      return;
    }
    const row = /** @type {HTMLElement} */ (btn.closest('.ci'));
    const id = +row.dataset.id;
    const { act } = btn.dataset;

    if (act === 'rm') {
      // Соседа запоминаем до перерисовки: текущая строка сейчас исчезнет
      const neighbour = /** @type {HTMLElement} */ (row.nextElementSibling || row.previousElementSibling);
      const neighbourId = neighbour && neighbour.dataset.id;
      cart.delete(id);
      saveCart();
      syncAddButtons(id);
      renderCart();
      updateCartCount();
      // renderCart пересоздаёт строки — фокус упал бы на body, за пределы
      // диалога. Переводим на соседний товар, а если корзина опустела —
      // на кнопку закрытия.
      const nextBtn = neighbourId
        ? /** @type {HTMLElement} */ (cartItems.querySelector(`.ci[data-id="${ neighbourId }"] [data-act="rm"]`))
        : null;

      (nextBtn || cartClose).focus();
      return;
    }

    // inc/dec: обновляем строку точечно, без полной перерисовки панели
    const qty = Math.max(1, cart.get(id) + (act === 'inc' ? 1 : -1));
    cart.set(id, qty);
    saveCart();
    updateRow(row, qty);
    updateFoot();
    updateCartCount();
  });

  // Звонок — основной канал: работает у всех и ни от чего не зависит
  cartCall.href = `tel:+${ ORDER_PHONE }`;

  // Копирование — запасной канал: на компьютере sms-ссылка обычно ничего
  // не открывает, да и вставить список можно куда угодно
  cartCopy.addEventListener('click', async () => {
    if (!cart.size) {
      return;
    }
    flashHint(await copyOrder()
      ? 'Заказ скопирован — отправьте его нам любым способом'
      : 'Не удалось скопировать: выделите список заказа вручную');
  });

  // Кнопка MAX появляется, только если задана ссылка на профиль магазина
  if (MAX_LINK) {
    cartMax.hidden = false;
    cartMax.addEventListener('click', async () => {
      if (!cart.size) {
        return;
      }
      // Текст кладём в буфер: в MAX нельзя открыть чат с готовым сообщением
      flashHint(await copyOrder()
        ? 'Заказ скопирован — вставьте его в чат'
        : 'Скопируйте список заказа ссылкой ниже и вставьте в чат');
      // noopener: не отдаём новой вкладке window.opener (reverse tabnabbing)
      window.open(MAX_LINK, '_blank', 'noopener');
    });
  }

  cartOpenBtn.addEventListener('click', openCart);
  cartClose.addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);
  cartToCatalog.addEventListener('click', () => {
    closeCart();
    catalog.scrollIntoView({ behavior: smooth });
  });
  // Проверяем класс open, а не hidden: во время закрывающей анимации панель
  // ещё не hidden, но перехватывать клавиши она уже не должна
  document.addEventListener('keydown', (e) => {
    if (!cartDrawer.classList.contains('cart--open')) {
      return;
    }
    if (e.key === 'Escape') {
      closeCart();
    } else if (e.key === 'Tab') {
      keepFocusInside(e);
    }
  });

  // Корзина могла восстановиться из localStorage — сразу показываем счётчик
  // (кнопки карточек уже верные: render() в initCatalog читает cart)
  updateCartCount();
}
