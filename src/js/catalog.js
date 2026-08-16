// ─── Каталог: фильтрация, карточки, отрисовка сетки ───
// Переключатели категорий тоже собираются здесь — из общего списка CATEGORIES.
import { PRODUCTS, CATEGORIES } from './data.js';
import { fmt, smooth, esc } from './utils.js';
import { productUrl } from './product-url.js';
import { cart } from './state.js';
import {
  SPRITE,
  grid, emptyEl, emptyReset, countEl, moreWrap, moreBtn,
  form, priceMin, priceMax, sortRoot,
  catChips, catsGrid, catalog, filtersToggle, filtersPanel,
} from './dom.js';

// Реальные границы цен каталога — для подсказок в пустых полях.
// Считаем из данных, чтобы подсказки не разошлись с товарами.
// Пока цен нет ни у одного товара, границ не существует — тогда подсказки
// в полях остаются пустыми. Без этой проверки Math.min по пустому списку
// вернул бы бесконечность, и в поле встало бы «∞».
const PRICES = PRODUCTS.map((p) => p.price).filter(Number.isFinite);
const PRICE_MIN = PRICES.length ? Math.min(...PRICES) : null;
const PRICE_MAX = PRICES.length ? Math.max(...PRICES) : null;

// Значение поля цены; пустое или нечисловое — значит «без ограничения».
// Ничего не подрезаем: сколько человек ввёл, столько и фильтруем.
function priceOf(input, noLimit) {
  const n = parseInt(input.value, 10);
  return Number.isFinite(n) ? n : noLimit;
}

// ─── Состояние фильтров читаем прямо из формы ───
function getState() {
  const data = new FormData(form);
  const from = priceOf(priceMin, -Infinity);
  const to = priceOf(priceMax, Infinity);
  return {
    cat:    data.get('cat') || 'all',
    q:      (data.get('q') || '').trim().toLowerCase(),
    // Пока человек набирает число, «от» может ненадолго превысить «до» —
    // фильтруем по меньшей и большей границе, чтобы выдача не мигала пустотой
    min:    Math.min(from, to),
    max:    Math.max(from, to),
    stock:  data.get('stock') === 'on',
    sort:   sortRoot.dataset.value,
  };
}

// Если «от» больше «до», меняем поля местами. Правка видна человеку —
// в отличие от молчаливого показа пустого каталога. На выдачу не влияет:
// getState и так берёт меньшую и большую границы.
function swapIfInverted() {
  if (priceMin.value !== '' && priceMax.value !== '' && +priceMin.value > +priceMax.value) {
    [priceMin.value, priceMax.value] = [priceMax.value, priceMin.value];
  }
}

// ─── Главная логика: один filter с четырьмя условиями ───
function filtered() {
  const s = getState();
  // Товар без цены фильтр по цене не отсеивает: мы не знаем, попадает он
  // в диапазон или нет, и прятать наличие из-за незаполненного поля хуже,
  // чем показать лишнее. В сортировке такие уходят в конец.
  const inPrice = (p) => !Number.isFinite(p.price) || (p.price >= s.min && p.price <= s.max);
  const found = PRODUCTS.filter((p) =>
    (s.cat === 'all' || p.cat === s.cat) &&
    inPrice(p) &&
    (!s.stock || p.stock) &&
    (!s.q || p.name.toLowerCase().includes(s.q))
  );
  switch (s.sort) {
    case 'asc': found.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity)); break;
    case 'desc': found.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity)); break;
    case 'new': found.sort((a, b) => (b.isNew - a.isNew) || (b.pop - a.pop)); break;
    default: found.sort((a, b) => b.pop - a.pop);
  }
  return found;
}

// ─── Шаблон карточки ───
function badge(p) {
  if (p.old && Number.isFinite(p.price)) {
    return `<span class="badge badge--sale">−${ Math.round((1 - p.price / p.old) * 100) }%</span>`;
  }
  if (p.isNew) {
    return '<span class="badge badge--new">Новинка</span>';
  }
  if (p.pop >= 88) {
    return '<span class="badge">Хит</span>';
  }
  return '';
}

// Фотографии из WordPress приходят набором размеров: пусть браузер возьмёт
// тот, что нужен этому экрану, а не полноразмерный файл. У демо-товаров
// набора нет — тогда остаётся один src, как было.
// sizes по умолчанию описывает нашу сетку: на широком экране карточка около
// 320px, на планшете — примерно половина ширины, на телефоне — почти вся.
const SIZES = '(min-width: 1100px) 320px, (min-width: 640px) 45vw, 90vw';

function srcset(p) {
  return p.srcset ? ` srcset="${ esc(p.srcset) }" sizes="${ esc(p.sizes ?? SIZES) }"` : '';
}

function cardHTML(p, i) {
  const inCart = cart.has(p.id);
  const addBtn = p.stock
    ? `<button class="add${inCart ? ' add--in' : ''}" type="button" data-add="${p.id}">
        <svg class="icon add__icon" aria-hidden="true"><use href="${SPRITE}#${inCart ? 'i-check' : 'i-bag'}"/></svg>
        ${inCart ? 'В корзине' : 'В корзину'}
      </button>`
    : '<button class="add" type="button" disabled>Нет в наличии</button>';
  // Товары с реальным фото показывают его вместо рисованной иллюстрации
  const name = esc(p.name);
  const media = p.photo
    ? `<img class="card__photo" src="${esc(p.photo)}" alt="${name}"${srcset(p)} loading="lazy">`
    : `<svg class="card__illustration" viewBox="0 0 200 150" role="img" aria-label="${name}"><use href="${SPRITE}#i-${esc(p.img)}"/></svg>`;
  return `
  <article class="card" data-id="${p.id}" style="animation-delay:${Math.min(i * 45, 360)}ms">
    <a class="card__media${p.photo ? ' card__media--photo' : ''}"
      href="${productUrl(p.id)}" data-more="${p.id}" aria-label="Подробнее: ${name}">
      <span class="card__badges">${badge(p)}</span>
      ${media}
    </a>
    <div class="card__body">
      <h3 class="card__name">${name}</h3>
      <div class="card__row">
        <div class="price">
          ${Number.isFinite(p.price)
    ? `<span class="price__now">${ fmt(p.price) }</span>${ p.old ? `<s class="price__old">${ fmt(p.old) }</s>` : '' }`
    : '<span class="price__ask">Цена по запросу</span>'}
        </div>
        ${addBtn}
      </div>
    </div>
  </article>`;
}

// ─── Переключатели категорий ───
// «Все» — не категория, а снятый фильтр, поэтому в CATEGORIES его нет и
// дописываем его здесь, первым и отмеченным. Атрибут checked задаёт и значение
// по умолчанию: form.reset() вернётся именно к нему.
// Разметку чипа держим одной строкой: .chip — строчный элемент, и перенос
// между input и подписью браузер показал бы лишним пробелом внутри плашки.
function renderChips() {
  catChips.innerHTML = [{ id: 'all', label: 'Все' }, ...CATEGORIES].map((c) =>
    `<label class="chip"><input class="chip__input" type="radio" name="cat" value="${ esc(c.id) }"${ c.id === 'all' ? ' checked' : '' }><span class="chip__label">${ esc(c.label) }</span></label>`
  ).join('');
}

// ─── Отрисовка порциями ───
// Всю выдачу разом не рисуем. В каталоге из-под CMS позиций бывают сотни, и
// каждая — карточка с фотографией: на телефоне полная перерисовка такой сетки
// занимает больше сотни миллисекунд, а происходит она на каждый символ в
// поиске. Плюс страница вырастает до трёхсот экранов, которые никто не листает.
const PAGE = 24;

let list = []; // вся текущая выдача
let shown = 0; // сколько карточек уже в сетке

// Счётчик, пустое состояние и кнопка — всё зависит от той же пары чисел
function sync() {
  countEl.innerHTML = `Показано: <b class="toolbar__found">${ shown }</b> из ${ list.length }`;
  const isEmpty = list.length === 0;
  grid.classList.toggle('grid--hidden', isEmpty);
  emptyEl.classList.toggle('empty--show', isEmpty);

  const rest = list.length - shown;
  moreWrap.hidden = rest <= 0;
  moreBtn.textContent = `Показать ещё ${ Math.min(PAGE, rest) }`;
}

export function render() {
  list = filtered();
  shown = Math.min(PAGE, list.length);
  grid.innerHTML = list.slice(0, shown).map(cardHTML).join('');
  sync();
}

// Дорисовываем следующую порцию, не трогая показанные карточки: полная
// перерисовка заново запустила бы их анимацию и заставила браузер повторно
// раскодировать уже загруженные фотографии
function showMore() {
  const wasFocused = document.activeElement === moreBtn;
  const first = list[shown];
  grid.insertAdjacentHTML('beforeend', list.slice(shown, shown + PAGE).map(cardHTML).join(''));
  shown = Math.min(shown + PAGE, list.length);
  sync();

  // Последняя порция забирает кнопку с собой, а с ней и фокус — он свалился бы
  // в начало страницы. Переводим его на первую из дорисованных карточек.
  if (wasFocused && moreWrap.hidden) {
    grid.querySelector(`.card[data-id="${ first.id }"] .card__media`)?.focus();
  }
}

// ─── Инициализация: события каталога + первый рендер ───
export function initCatalog() {
  // Переключатели заполняем до первого чтения формы: getState берёт категорию
  // из FormData, а в пустой форме её попросту нет
  renderChips();

  // Enter в поиске вызывает неявную отправку формы — гасим, иначе страница перезагрузится
  form.addEventListener('submit', (e) => e.preventDefault());

  form.addEventListener('input', render);

  // Переставляем границы при уходе из блока цены целиком, а не при переходе
  // между «от» и «до»: иначе поля дёргались бы посреди правки диапазона
  const priceGroup = priceMin.closest('.price-range');
  priceGroup.addEventListener('focusout', (e) => {
    if (!priceGroup.contains(e.relatedTarget)) {
      swapIfInverted();
    }
  });

  form.addEventListener('reset', () => {
    // поля формы принимают исходные значения уже после события reset
    requestAnimationFrame(render);
  });

  emptyReset.addEventListener('click', () => form.reset());

  moreBtn.addEventListener('click', showMore);

  sortRoot.addEventListener('change', render);

  // Быстрые категории под героем. Слушаем ленту целиком, а не каждую плитку:
  // плитки рисует cats.js, и подписка на них зависела бы от того, чей init
  // отработал раньше
  catsGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) {
      return;
    }
    const radio = form.querySelector(`input[name="cat"][value="${ btn.dataset.cat }"]`);
    if (radio) {
      radio.checked = true; render();
    }
    catalog.scrollIntoView({ behavior: smooth });
  });

  // Фильтры на мобильных
  filtersToggle.addEventListener('click', () => {
    const open = filtersPanel.classList.toggle('filters--open');
    filtersToggle.setAttribute('aria-expanded', open);
  });

  // Стартовое состояние: в пустых полях подсказываем границы цен каталога
  priceMin.placeholder = PRICE_MIN === null ? '' : PRICE_MIN.toLocaleString('ru-RU');
  priceMax.placeholder = PRICE_MAX === null ? '' : PRICE_MAX.toLocaleString('ru-RU');
  render();
}
