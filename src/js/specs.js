// ─── Характеристики товара ───
// Один код на два места: окно товара в каталоге и отдельная страница товара.
// Разметку держим здесь, чтобы она не разошлась — таблица в окне и таблица
// на странице должны быть одинаковыми, иначе правка стилей чинит одну
// и ломает другую.
import { esc } from './utils.js';

/**
 * Таблица характеристик. Пустая строка, если их нет: у части товаров
 * описание ещё не заполнили, и рисовать заголовок над пустотой незачем.
 *
 * @param {{specs?: Array<{name: string, value: string}>}} p Товар.
 * @returns {string} Разметка или пустая строка.
 */
export function specsHTML(p) {
  if (!p.specs) {
    return '';
  }

  const rows = p.specs.map((s) =>
    `<div class="specs__row">
      <dt class="specs__name">${ esc(s.name) }</dt>
      <dd class="specs__value">${ esc(s.value) }</dd>
    </div>`).join('');

  return `<dl class="specs">${ rows }</dl>`;
}
