// ─────────────────────────────────────────────
//  Мебельный склад «Олимп» — точка входа
//  Модули:
//    data.js    — товары и словари
//    utils.js   — форматирование цены, режим прокрутки
//    state.js   — общее состояние (корзина, телефон для заказов)
//    dom.js     — ссылки на элементы страницы
//    nav.js     — мобильное меню в шапке
//    cats.js    — лента быстрых категорий
//    sort.js    — свой список сортировки
//    catalog.js — фильтры, карточки, сетка
//    cart.js    — выезжающая корзина и заказ
//    reveal.js  — появление блоков при прокрутке
// ─────────────────────────────────────────────
import { initNav } from './nav.js';
import { initCats } from './cats.js';
import { initSort } from './sort.js';
import { initCatalog } from './catalog.js';
import { initCart, initCartCount, openCart } from './cart.js';
import { initReveal } from './reveal.js';
import { initGallery } from './gallery.js';
import { applyCatalogLinks } from './url-state.js';

// Тема подключает этот файл ко всем страницам сайта, а страницы две: каталог
// и товар. На товаре нет ни шапки, ни фильтров, ни панели корзины — и раньше
// скрипт падал на первой же строке initNav, потому что кнопки меню там нет.
// Вместе с ним отключалась галерея: миниатюры не переключали снимок ни в одном
// браузере, а на макете всё работало — там страницу товара ведёт page-tovar.js.
//
// Развилка по разметке, а не проверка каждого элемента внутри модулей: молчащий
// пропуск скрыл бы настоящую поломку, когда id на главной переименуют.
const isProductPage = document.getElementById('tovar') !== null;

if (isProductPage) {
  initGallery(document);
  initCartCount();
  // Ссылки «в каталог» ведут туда, откуда пришли, вместе с фильтрами.
  // Пришли из поиска или из мессенджера — остаются на главной, как в разметке
  applyCatalogLinks();
} else {
  initNav();
  initCats();
  initSort();
  initCatalog();
  initCart();
  // Последним: к этому моменту плитки категорий уже нарисованы и попадут под наблюдение
  initReveal();
}

// Браузер после перезагрузки восстанавливает фокус на последнем активном
// элементе (например, на лого) и рисует обводку :focus-visible — причём
// асинхронно, порой уже после события load, так что одноразовый сброс не
// помогает. Пока пользователь ничего не нажимал, любой появившийся фокус —
// восстановленный браузером: гасим его. После первого реального ввода
// (клик или клавиша) перестаём вмешиваться, чтобы не мешать навигации с Tab.
const blurRestored = (e) => /** @type {HTMLElement} */ (e.target).blur();
const stopFocusGuard = () => document.removeEventListener('focusin', blurRestored);

if (document.activeElement && document.activeElement !== document.body) {
  /** @type {HTMLElement} */ (document.activeElement).blur(); // фокус успел восстановиться до запуска скрипта
}
document.addEventListener('focusin', blurRestored);
window.addEventListener('pointerdown', stopFocusGuard, { once: true, capture: true });
window.addEventListener('keydown', stopFocusGuard, { once: true, capture: true });

// Со страницы товара корзина ведёт сюда ссылкой «#cart»: панель выезжает
// только в каталоге. Открываем после сторожа фокуса и сразу его снимаем —
// иначе он сбросил бы фокус с кнопки закрытия только что открытой панели.
// Переход по ссылке и так был действием человека, гасить тут нечего.
if (!isProductPage && location.hash === '#cart') {
  stopFocusGuard();
  openCart();
}
