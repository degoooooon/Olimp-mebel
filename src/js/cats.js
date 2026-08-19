// ─── Лента быстрых категорий ───
// Собирает плитки из общего списка категорий и рисует под ними свою полосу
// прокрутки.
//
// Стрелок по краям больше нет: они появлялись только на экранах уже 850px —
// то есть почти всегда на сенсорных, где и так работает свайп, — и закрывали
// собой по полсотни пикселей плитки.
//
// Полоса своя, а не системная, потому что системная и на macOS, и на iOS
// показывается лишь во время прокрутки. Постоянная нужна как подсказка, что
// список листается, и как единственный способ пролистать мышью: колесо
// горизонтальную ленту не прокручивает — проверено, ноль пикселей.
import { CATEGORIES } from './data.js';
import { esc } from './utils.js';
import { SPRITE, catsGrid, catsBar, catsThumb } from './dom.js';

// Небольшой запас: при дробных ширинах scrollWidth почти никогда не совпадает
// с clientWidth точно, и полоса вылезала бы там, где листать нечего
const EDGE = 2;

function renderTiles() {
  catsGrid.innerHTML = CATEGORIES.map((c) => `
    <button class="cat reveal" type="button" data-cat="${ esc(c.id) }">
      <svg class="cat__icon" viewBox="0 0 200 150" aria-hidden="true"><use href="${ SPRITE }#i-${ esc(c.icon) }"/></svg>
      <span class="cat__label">${ esc(c.label) }</span>
    </button>`).join('');
}

// Ширина бегунка — доля видимой части, положение — доля прокрученного.
// Двигаем через translate, а не left: это не заставляет браузер пересчитывать
// раскладку на каждый кадр прокрутки.
function update() {
  const max = catsGrid.scrollWidth - catsGrid.clientWidth;
  catsBar.hidden = max <= EDGE;
  if (catsBar.hidden) {
    return;
  }
  const share = catsGrid.clientWidth / catsGrid.scrollWidth;
  catsThumb.style.width = `${ share * 100 }%`;
  // Бегунок ходит по дорожке ровно на ту часть, которая не занята им самим
  catsThumb.style.translate = `${ (catsGrid.scrollLeft / max) * (catsBar.clientWidth - catsThumb.offsetWidth) }px`;
}

// Клик и перетаскивание по полосе. Держим ленту там, куда указывает палец:
// центр бегунка приезжает под точку касания.
function scrollToPointer(e) {
  const track = catsBar.getBoundingClientRect();
  const usable = track.width - catsThumb.offsetWidth;
  if (usable <= 0) {
    return;
  }
  const pos = (e.clientX - track.left - catsThumb.offsetWidth / 2) / usable;
  const max = catsGrid.scrollWidth - catsGrid.clientWidth;
  catsGrid.scrollLeft = Math.min(Math.max(pos, 0), 1) * max;
}

/**
 * Рисует ленту быстрых категорий под героем и включает её прокрутку.
 *
 * @returns {void}
 */
export function initCats() {
  renderTiles();

  catsGrid.addEventListener('scroll', update, { passive: true });

  catsBar.addEventListener('pointerdown', (e) => {
    // Захватываем указатель: палец может уехать за пределы полосы,
    // а тащить он должен продолжать
    catsBar.setPointerCapture(e.pointerId);
    scrollToPointer(e);
  });

  catsBar.addEventListener('pointermove', (e) => {
    if (catsBar.hasPointerCapture(e.pointerId)) {
      scrollToPointer(e);
    }
  });

  // Следим и за самой лентой, и за плитками. Одной ленты мало: полоса зависит
  // от ширины содержимого, а она меняется, когда меняется размер плиток, —
  // при этом сама лента остаётся прежней ширины и наблюдатель молчит.
  // Так было при отложенной загрузке стилей: первый расчёт проходил по ещё
  // не оформленной раскладке и полоса не появлялась.
  const observer = new ResizeObserver(update);
  observer.observe(catsGrid);
  [...catsGrid.children].forEach((tile) => observer.observe(tile));
  update();
}
