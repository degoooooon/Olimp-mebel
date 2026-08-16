// ─── Ссылки на элементы страницы ───
// Все обращения к DOM собраны здесь — так легко найти любой элемент.
// Модуль подключается через type="module" (defer), поэтому DOM уже готов.

// Путь к файлу со спрайтом иконок. В разметке его подставляет Vite: при
// сборке это файл с хешем, в разработке — служебный маршрут. Забираем оттуда,
// потому что строки внутри JS-шаблонов Vite не переписывает.
export const SPRITE = document.querySelector('use[href*="spritemap"]')
  ?.getAttribute('href')
  .split('#')[0] ?? '';

// Шапка и мобильное меню
export const header = document.querySelector('.header');
export const nav = document.getElementById('nav');
export const navToggle = document.getElementById('nav-toggle');

// Каталог и фильтры
export const grid = document.getElementById('grid');
export const emptyEl = document.getElementById('empty');
export const emptyReset = document.getElementById('empty-reset');
export const countEl = document.getElementById('count');
export const moreWrap = document.getElementById('more');
export const moreBtn = document.getElementById('more-btn');
export const form = document.getElementById('filters-form');
export const priceMin = document.getElementById('price-min');
export const priceMax = document.getElementById('price-max');
export const sortRoot = document.getElementById('sort');
export const sortButton = document.getElementById('sort-button');
export const sortValue = document.getElementById('sort-value');
export const sortList = document.getElementById('sort-list');
export const catChips = document.getElementById('cat-chips');
export const catalog = document.getElementById('catalog');
export const filtersToggle = document.getElementById('filters-toggle');
export const filtersPanel = document.getElementById('filters-panel');

// Лента быстрых категорий
export const catsGrid = document.getElementById('cats-grid');
export const catsBar = document.getElementById('cats-bar');
export const catsThumb = document.getElementById('cats-thumb');

// Окно товара

// Корзина: счётчик в шапке и выезжающая панель
export const cartCount = document.getElementById('cart-count');
export const cartDrawer = document.getElementById('cart-drawer');
export const cartOverlay = document.getElementById('cart-overlay');
export const cartItems = document.getElementById('cart-items');
export const cartEmpty = document.getElementById('cart-empty');
export const cartFoot = document.getElementById('cart-foot');
export const cartTotal = document.getElementById('cart-total');
export const cartCall = document.getElementById('cart-call');
export const cartSms = document.getElementById('cart-sms');
export const cartCopy = document.getElementById('cart-copy');
export const cartMax = document.getElementById('cart-max');
export const cartHint = document.getElementById('cart-hint');
export const cartOpenBtn = document.getElementById('cart-open');
export const cartClose = document.getElementById('cart-close');
export const cartToCatalog = document.getElementById('cart-to-catalog');
