// ─── Характеристики товара ───
// Один код на два места: окно товара в каталоге и отдельная страница товара.
// Разметку держим здесь, чтобы она не разошлась — таблица в окне и таблица
// на странице должны быть одинаковыми, иначе правка стилей чинит одну
// и ломает другую.
import { esc } from './utils.js';

// Габариты, которые в мебельном каталоге принято писать одной строкой.
// Имена точные: их выдаёт tools/goods-to-specs.mjs, приводя описания
// поставщика к единому виду.
const DIMS = ['Ширина, см', 'Глубина, см', 'Высота, см'];

const dims = (specs) => DIMS.map((n) => specs.find((s) => s.name === n));

/**
 * Габариты одной строкой: «218 × 85 × 105 см».
 *
 * Первое, что спрашивает покупатель мебели, — поместится ли она. Три строки
 * таблицы этот вопрос закрывают, но заставляют собирать ответ в уме. Здесь
 * он собран, и записан так, как габариты печатают в мебельных прайсах.
 *
 * Пусто, если нашлись не все три: два размера из трёх ничего не отвечают,
 * а выдумывать недостающий нельзя. Тогда всё остаётся в таблице как было.
 *
 * @param {{specs?: Array<{name: string, value: string}>}} p Товар.
 * @returns {string} Разметка или пустая строка.
 */
export function sizeHTML(p) {
  if (!p.specs) {
    return '';
  }

  const found = dims(p.specs);

  if (!found.every(Boolean)) {
    return '';
  }

  return `<p class="size">${ found.map((s) => esc(s.value)).join(' <span class="size__x">×</span> ') }<span class="size__unit">см</span></p>`;
}

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

  // Габариты, вынесенные строкой выше, из таблицы убираем — иначе те же
  // три числа стоят на экране дважды
  const rows = dims(p.specs).every(Boolean)
    ? p.specs.filter((s) => !DIMS.includes(s.name))
    : p.specs;

  if (!rows.length) {
    return '';
  }

  const html = rows.map((s) =>
    `<div class="specs__row">
      <dt class="specs__name">${ esc(s.name) }</dt>
      <dd class="specs__value">${ esc(s.value) }</dd>
    </div>`).join('');

  return `<dl class="specs">${ html }</dl>`;
}
