// ─── Страница товара ───
// Макет отдельной страницы. Товар выбирается по адресу: ?tovar=101.
//
// На живом сайте эту разметку будет печатать PHP — тогда страница откроется
// с готовым содержимым, без ожидания скрипта, и её увидит поисковик.
// Здесь она собирается в браузере, потому что статической сборке взять
// товар больше неоткуда.
import { PRODUCTS, CATEGORIES } from './data.js';
import { esc, fmt } from './utils.js';
import { specsHTML } from './specs.js';
import { idFromUrl } from './product-url.js';
import { ORDER_PHONE, MAX_LINK } from './state.js';

const root = document.getElementById('tovar');

const product = PRODUCTS.find((p) => String(p.id) === String(idFromUrl())) ?? null;

// Товара нет: адрес набрали руками, товар сняли с продажи или каталог
// перезалили с новыми номерами. Пустая страница тут хуже всего — человек
// не поймёт, сломался сайт или он ошибся, поэтому говорим прямо и даём
// дорогу назад.
if (!product) {
  root.innerHTML = `
    <p class="tovar__missing">Такого товара нет в каталоге.</p>
    <p><a class="tovar__link" href="./">Вернуться в каталог</a></p>`;
} else {
  const name = esc(product.name);
  const cat = CATEGORIES.find((c) => c.id === product.cat);

  // Все снимки товара, а не только первый: ради них страница и заводилась
  const gallery = product.photos ?? (product.photo ? [{ photo: product.photo, srcset: product.srcset }] : []);

  const media = gallery.length
    ? gallery.map((g, i) => `<img class="tovar__photo" src="${ esc(g.photo) }"${ g.srcset ? ` srcset="${ esc(g.srcset) }" sizes="(min-width: 900px) 520px, 92vw"` : '' } alt="${ name }${ i ? ` — снимок ${ i + 1 }` : '' }"${ i ? ' loading="lazy"' : '' }>`).join('')
    : `<svg class="tovar__illustration" viewBox="0 0 200 150" role="img" aria-label="${ name }"><use href="${ document.querySelector('use[href*="spritemap"]')?.getAttribute('href').split('#')[0] ?? '' }#i-${ esc(product.img) }"/></svg>`;

  const price = Number.isFinite(product.price)
    ? `<p class="tovar__price">${ fmt(product.price) }</p>`
    : '<p class="tovar__price tovar__price--ask">Цена по запросу</p>';

  const stock = product.stock
    ? '<p class="tovar__stock">Есть в наличии</p>'
    : '<p class="tovar__stock tovar__stock--out">Нет в наличии</p>';

  root.innerHTML = `
    <nav class="crumbs" aria-label="Хлебные крошки">
      <a class="crumbs__link" href="./">Каталог</a>
      ${ cat ? `<span class="crumbs__sep" aria-hidden="true">›</span><span class="crumbs__current">${ esc(cat.label) }</span>` : '' }
    </nav>

    <div class="tovar__grid">
      <div class="tovar__media">${ media }</div>

      <div class="tovar__info">
        <h1 class="tovar__name">${ name }</h1>
        ${ price }
        ${ stock }

        <div class="tovar__order">
          <a class="btn btn--primary" href="tel:+${ ORDER_PHONE }">Позвонить</a>
          <a class="btn" href="${ MAX_LINK }" target="_blank" rel="noopener">Написать в MAX</a>
        </div>

        ${ specsHTML(product) || '<p class="tovar__nospecs">Характеристики пока не заполнены.</p>' }
      </div>
    </div>`;

  // Название товара в заголовке вкладки и в описании. На живом сайте это
  // сделает WordPress до отдачи страницы; здесь — сразу после отрисовки,
  // чтобы вкладка не осталась подписанной словом «Товар»
  document.title = `${ product.name } — Мебельный склад «Олимп»`;
}
