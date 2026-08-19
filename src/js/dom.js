// ─── Ссылки на элементы страницы ───
// Все обращения к DOM собраны здесь — так легко найти любой элемент.
// Модуль подключается через type="module" (defer), поэтому DOM уже готов.
//
// Где элемент не просто коробка, а поле ввода, форма, ссылка или кнопка —
// стоит приведение вида /** @type {HTMLInputElement} */. Это не украшение:
// getElementById обещает только HTMLElement, у которого нет ни value,
// ни href, ни elements. Без приведения редактор не подскажет эти поля
// и не поймает опечатку в них, а с ним — подчёркивает сразу. Заодно видно
// без открывания разметки, что price-min это input, а cart-call это ссылка.

// Путь к файлу со спрайтом иконок. В разметке его подставляет Vite: при
// сборке это файл с хешем, в разработке — служебный маршрут. Забираем оттуда,
// потому что строки внутри JS-шаблонов Vite не переписывает.
export const SPRITE = document.querySelector('use[href*="spritemap"]')
  ?.getAttribute('href')
  .split('#')[0] ?? '';

// Шапка и мобильное меню
export const header = /** @type {HTMLElement} */ (document.querySelector('.header'));
export const nav = document.getElementById('nav');
export const navToggle = /** @type {HTMLButtonElement} */ (document.getElementById('nav-toggle'));

// Каталог и фильтры
export const grid = document.getElementById('grid');
export const emptyEl = document.getElementById('empty');
export const emptyReset = /** @type {HTMLButtonElement} */ (document.getElementById('empty-reset'));
export const countEl = document.getElementById('count');
export const moreWrap = document.getElementById('more');
export const moreBtn = /** @type {HTMLButtonElement} */ (document.getElementById('more-btn'));
export const form = /** @type {HTMLFormElement} */ (document.getElementById('filters-form'));
export const priceMin = /** @type {HTMLInputElement} */ (document.getElementById('price-min'));
export const priceMax = /** @type {HTMLInputElement} */ (document.getElementById('price-max'));
export const sortRoot = document.getElementById('sort');
export const sortButton = /** @type {HTMLButtonElement} */ (document.getElementById('sort-button'));
export const sortValue = document.getElementById('sort-value');
export const sortList = /** @type {HTMLUListElement} */ (document.getElementById('sort-list'));
export const catChips = document.getElementById('cat-chips');
export const catalog = document.getElementById('catalog');
export const filtersToggle = /** @type {HTMLButtonElement} */ (document.getElementById('filters-toggle'));
export const filtersPanel = document.getElementById('filters-panel');

// Лента быстрых категорий
export const catsGrid = document.getElementById('cats-grid');
export const catsBar = document.getElementById('cats-bar');
export const catsThumb = document.getElementById('cats-thumb');

// Корзина: счётчик в шапке и выезжающая панель
// Счётчик стоит на двух страницах — в шапке каталога и в полосе страницы
// товара. Атрибут вместо id: id обязан быть уникален в документе, и линтер
// разметки считает страницы вместе, а класс у этих элементов разный —
// они части разных блоков.
export const cartCount = /** @type {HTMLElement} */ (document.querySelector('[data-cart-count]'));
export const cartDrawer = document.getElementById('cart-drawer');
export const cartOverlay = document.getElementById('cart-overlay');
export const cartItems = document.getElementById('cart-items');
export const cartEmpty = document.getElementById('cart-empty');
export const cartFoot = document.getElementById('cart-foot');
export const cartTotal = document.getElementById('cart-total');
export const cartCall = /** @type {HTMLAnchorElement} */ (document.getElementById('cart-call'));
export const cartSms = /** @type {HTMLAnchorElement} */ (document.getElementById('cart-sms'));
export const cartCopy = /** @type {HTMLButtonElement} */ (document.getElementById('cart-copy'));
export const cartMax = /** @type {HTMLButtonElement} */ (document.getElementById('cart-max'));
export const cartHint = document.getElementById('cart-hint');
export const cartOpenBtn = /** @type {HTMLButtonElement} */ (document.getElementById('cart-open'));
export const cartClose = /** @type {HTMLButtonElement} */ (document.getElementById('cart-close'));
export const cartToCatalog = /** @type {HTMLButtonElement} */ (document.getElementById('cart-to-catalog'));
