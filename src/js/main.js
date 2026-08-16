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
import { initCart } from './cart.js';
import { initReveal } from './reveal.js';
import { initGallery } from './gallery.js';

initNav();
initCats();
initSort();
initCatalog();
initCart();
// Галерея на странице товара. Её разметку печатает PHP, поэтому включать
// переключение надо отсюда: на главной галерей нет и вызов ничего не делает
initGallery(document);
// Последним: к этому моменту плитки категорий уже нарисованы и попадут под наблюдение
initReveal();

// Браузер после перезагрузки восстанавливает фокус на последнем активном
// элементе (например, на лого) и рисует обводку :focus-visible — причём
// асинхронно, порой уже после события load, так что одноразовый сброс не
// помогает. Пока пользователь ничего не нажимал, любой появившийся фокус —
// восстановленный браузером: гасим его. После первого реального ввода
// (клик или клавиша) перестаём вмешиваться, чтобы не мешать навигации с Tab.
const blurRestored = (e) => e.target.blur();
const stopFocusGuard = () => document.removeEventListener('focusin', blurRestored);

if (document.activeElement && document.activeElement !== document.body) {
  document.activeElement.blur(); // фокус успел восстановиться до запуска скрипта
}
document.addEventListener('focusin', blurRestored);
window.addEventListener('pointerdown', stopFocusGuard, { once: true, capture: true });
window.addEventListener('keydown', stopFocusGuard, { once: true, capture: true });
