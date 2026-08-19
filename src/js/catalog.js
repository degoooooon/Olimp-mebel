// ─── Каталог: фильтрация, карточки, отрисовка сетки ───
// Переключатели категорий тоже собираются здесь — из общего списка CATEGORIES.
import { PRODUCTS, CATEGORIES } from './data.js';
import { fmt, smooth, esc, hit } from './utils.js';
import { productUrl } from './product-url.js';
import { cart } from './state.js';
import { setSort } from './sort.js';
import { readUrl, writeUrl, rememberReturn, takeReturn } from './url-state.js';
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
    q:      String(data.get('q') ?? '').trim().toLowerCase(),
    // Пока человек набирает число, «от» может ненадолго превысить «до» —
    // фильтруем по меньшей и большей границе, чтобы выдача не мигала пустотой
    min:    Math.min(from, to),
    max:    Math.max(from, to),
    stock:  data.get('stock') === 'on',
    sort:   sortRoot.dataset.value,
  };
}

// ─── Состояние фильтров и адрес страницы ───

// Значения для адреса берём из полей как есть, а не из getState: там цены уже
// превращены в числа, а пустое поле — в бесконечность, и в адрес такое
// не запишешь. Ключ razdel вместо cat — имя cat занято WordPress,
// подробности в url-state.js.
// Поле формы по имени. Через namedItem, а не form.elements.q: доступ по имени
// в браузере работает, но в описании DOM его нет, и без приведения редактор
// не подскажет ни value, ни checked и не поймает опечатку в имени поля.
// Функцией, а не значением: на странице товара формы нет вовсе, и обращение
// к form.elements при загрузке модуля уронило бы там всё, что идёт после.
const field = (name) => /** @type {HTMLInputElement} */ (form.elements.namedItem(name));

function urlValues() {
  return {
    razdel: field('cat')?.value ?? 'all',
    q:      field('q').value.trim(),
    min:    priceMin.value,
    max:    priceMax.value,
    stock:  field('stock').checked ? 'on' : '',
    sort:   sortRoot.dataset.value,
  };
}

// Раскладывает состояние из адреса по полям формы. Всё пришедшее проверяем:
// параметры в адресе правит кто угодно, в том числе вручную.
function applyUrl(state) {
  // Категорию ищем перебором, а не селектором по значению из адреса: чужая
  // строка внутри querySelector — это уже не поиск, а исполнение чужого
  // выражения. Не нашли — включаем «Все», иначе ни один чип не отмечен
  // и человек видит полный список без единой подсветки
  const radios = /** @type {HTMLInputElement[]} */ ([...form.querySelectorAll('input[name="cat"]')]);
  const picked = radios.find((r) => r.value === state.razdel)
    ?? radios.find((r) => r.value === 'all');

  if (picked) {
    picked.checked = true;
  }

  // В поля цены пускаем только цифры: там type="number", и любая другая
  // строка молча обнулила бы поле, оставив фильтр включённым в адресе
  const digits = (v) => (/^\d{1,9}$/.test(v ?? '') ? v : '');
  priceMin.value = digits(state.min);
  priceMax.value = digits(state.max);

  // Поиск — обычный текст в значении поля, разметкой он не станет
  field('q').value = state.q ?? '';
  field('stock').checked = 'on' === state.stock;

  setSort(state.sort ?? 'pop');
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
    // Через Number, а не вычитанием логических значений: true - false в JS
    // даёт единицу, и сортировка работала, но такое выражение не читается
    // как «сначала новинки», а редактор его вообще не понимает
    case 'new': found.sort((a, b) => (Number(b.isNew) - Number(a.isNew)) || (b.pop - a.pop)); break;
    default: found.sort((a, b) => b.pop - a.pop);
  }
  return found;
}

// ─── Шаблон карточки ───

// Возврат из товара: карточки рисуем без появления. Человек эти же карточки
// только что видел, и повторный выезд с прозрачности читается как перезагрузка
// сайта — тем сильнее, чем больше карточек раскрыто.
//
// Признак ставим на сами карточки, а не классом на сетку: класс с сетки
// пришлось бы снимать через кадр после отрисовки, и это гонка. Здесь же
// следующая перерисовка сама выдаст карточки с анимацией, снимать нечего.
let instant = false;

/**
 * Плашка в углу карточки: скидка, новинка или хит. Одна, не несколько —
 * три плашки на одной фотографии не выделяют ничего.
 *
 * @param {import('./data.js').Product} p Товар.
 * @returns {string} Разметка плашки или пустая строка.
 */
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

/**
 * @param {import('./data.js').Product} p Товар.
 * @returns {string} Атрибуты srcset и sizes или пустая строка,
 *   если у товара один размер фотографии.
 */
function srcset(p) {
  return p.srcset ? ` srcset="${ esc(p.srcset) }" sizes="${ esc(p.sizes ?? SIZES) }"` : '';
}

/**
 * Карточка товара для сетки каталога.
 *
 * @param {import('./data.js').Product} p Товар.
 * @param {number} i Его номер в выдаче — от него считается задержка
 *   появления, чтобы карточки выезжали каскадом, а не все разом.
 * @returns {string} Разметка карточки.
 */
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
  // Ссылок на товар две: фотография и название. Люди жмут и туда, и туда,
  // а когда ссылкой была только картинка, нажатие по названию не делало
  // ничего — выглядело как поломка сайта.
  //
  // Фотография при этом убрана из обхода табом и от скринридера: она ведёт
  // туда же, куда название, и вторая остановка на том же адресе только
  // удлиняет путь с клавиатуры. Подпись читается с названия, она и так текст.
  return `
  <article class="card${instant ? ' card--instant' : ''}" data-id="${p.id}" style="animation-delay:${Math.min(i * 45, 360)}ms">
    <a class="card__media${p.photo ? ' card__media--photo' : ''}"
      href="${productUrl(p)}" tabindex="-1" aria-hidden="true">
      <span class="card__badges">${badge(p)}</span>
      ${media}
    </a>
    <div class="card__body">
      <h3 class="card__name"><a class="card__link" href="${productUrl(p)}">${name}</a></h3>
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
// Пустая витрина бывает двух видов, и путать их нельзя. «Под фильтры ничего
// не подошло» лечится сбросом, а «в каталоге нет товаров» — только загрузкой
// товаров в админке. Совет смягчить условия во втором случае отправляет
// человека крутить фильтры впустую, а кнопка сброса ничего не изменит.
//
// Случай не выдуманный: подрядчик удалил товары из WordPress, каталог приехал
// пустым, и витрина предлагала поднять планку цены.
const EMPTY_TEXTS = {
  filtered: {
    title: 'Ничего не нашлось',
    text: 'Попробуйте смягчить условия — например, поднять планку цены или убрать часть фильтров.',
  },
  nothing: {
    title: 'Каталог пока пуст',
    text: 'Товары скоро появятся. Позвоните нам — расскажем, что есть на складе прямо сейчас.',
  },
};

function sync() {
  countEl.innerHTML = `Показано: <b class="toolbar__found">${ shown }</b> из ${ list.length }`;
  const isEmpty = list.length === 0;
  grid.classList.toggle('grid--hidden', isEmpty);
  emptyEl.classList.toggle('empty--show', isEmpty);

  if (isEmpty) {
    const kind = PRODUCTS.length ? 'filtered' : 'nothing';
    emptyEl.querySelector('.empty__title').textContent = EMPTY_TEXTS[kind].title;
    emptyEl.querySelector('.empty__text').textContent = EMPTY_TEXTS[kind].text;
    // Сбрасывать нечего, когда товаров нет вовсе
    emptyReset.hidden = 'nothing' === kind;
  }

  const rest = list.length - shown;
  moreWrap.hidden = rest <= 0;
  moreBtn.textContent = `Показать ещё ${ Math.min(PAGE, rest) }`;
}

/**
 * Перерисовывает каталог по текущему состоянию фильтров.
 *
 * Единственная точка входа для всех, кто менял фильтры: она же пишет
 * состояние в адрес страницы. Держать запись адреса в обработчиках значило
 * бы иметь несколько источников правды — адрес разошёлся бы с выдачей.
 *
 * @returns {void}
 */
export function render() {
  list = filtered();
  shown = Math.min(PAGE, list.length);
  grid.innerHTML = list.slice(0, shown).map(cardHTML).join('');
  sync();
  // Адрес обновляем здесь, а не в каждом обработчике: render зовут все, кто
  // менял фильтры, и одна точка записи не разойдётся с выдачей.
  // showMore адрес не трогает намеренно: сколько карточек раскрыто — не то,
  // чем делятся ссылкой, и возврат восстановит это сам по номеру карточки
  writeUrl(urlValues());
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
    /** @type {HTMLElement} */ (grid.querySelector(`.card[data-id="${ first.id }"] .card__media`))?.focus();
  }
}

// Возврат из товара: раскрываем список до той карточки, с которой ушли,
// и подводим её под глаза. Без этого человек, ушедший из тридцатой позиции,
// возвращался к первым двадцати четырём и листал заново.
//
// Ищем по номеру товара, а не по числу пикселей: выдача могла стать другой —
// товар сняли с продажи, владелец переставил порядок, — и прежняя высота
// прокрутки указывала бы в пустоту.
function restorePosition(back) {
  if (null === back) {
    return;
  }

  const index = list.findIndex((p) => p.id === back.id);

  if (index < 0) {
    return;
  }

  while (shown <= index) {
    showMore();
  }

  // instant, а не auto. Значение auto означает «как сказано в CSS», а там
  // у html стоит scroll-behavior: smooth — страница ползла через полкаталога
  // на глазах, и по дороге в неё вмешивалось восстановление прокрутки
  // браузером: два движения складывались, и карточка проезжала мимо кадра
  grid.querySelector(`.card[data-id="${ back.id }"]`)
    ?.scrollIntoView({ block: 'center', behavior: 'instant' });
}

/**
 * Подписывает каталог на события и рисует первую выдачу.
 *
 * Зовётся только на главной. На странице товара ни формы фильтров, ни сетки
 * нет — обращение к ним при загрузке уронило бы скрипт целиком, и вместе
 * с ним галерею снимков. Ровно это уже происходило на живом сайте.
 *
 * @returns {void}
 */
export function initCatalog() {
  // Переключатели заполняем до первого чтения формы: getState берёт категорию
  // из FormData, а в пустой форме её попросту нет
  renderChips();

  // Enter в поиске вызывает неявную отправку формы — гасим, иначе страница перезагрузится
  form.addEventListener('submit', (e) => e.preventDefault());

  form.addEventListener('input', render);

  // Переставляем границы при уходе из блока цены целиком, а не при переходе
  // между «от» и «до»: иначе поля дёргались бы посреди правки диапазона
  const priceGroup = /** @type {HTMLElement} */ (priceMin.closest('.price-range'));

  priceGroup.addEventListener('focusout', (e) => {
    if (!priceGroup.contains(/** @type {Node} */ (e.relatedTarget))) {
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

  // Запоминаем, с какой карточки ушли в товар. Слушаем сетку целиком: карточки
  // перерисовываются на каждый фильтр, и подписка на каждую отвалилась бы
  // при первой же перерисовке.
  //
  // Условие про ссылку обязательно: внутри карточки есть ещё кнопка «В корзину»,
  // и после нажатия на неё никто никуда не уходит — запомненная позиция потом
  // дёрнула бы каталог к чужой карточке
  grid.addEventListener('click', (e) => {
    const card = hit(e, '.card');

    if (card && hit(e, 'a[href]')) {
      rememberReturn(Number(card.dataset.id));
    }
  });

  // Быстрые категории под героем. Слушаем ленту целиком, а не каждую плитку:
  // плитки рисует cats.js, и подписка на них зависела бы от того, чей init
  // отработал раньше
  catsGrid.addEventListener('click', (e) => {
    const btn = hit(e, '[data-cat]');
    if (!btn) {
      return;
    }
    const radio = /** @type {HTMLInputElement} */ (form.querySelector(`input[name="cat"][value="${ btn.dataset.cat }"]`));
    if (radio) {
      radio.checked = true; render();
    }
    catalog.scrollIntoView({ behavior: smooth });
  });

  // Фильтры на мобильных
  filtersToggle.addEventListener('click', () => {
    const open = filtersPanel.classList.toggle('filters--open');
    // Через String: setAttribute принимает строку, а не логическое значение
    filtersToggle.setAttribute('aria-expanded', String(open));
  });

  // Стартовое состояние: в пустых полях подсказываем границы цен каталога
  priceMin.placeholder = PRICE_MIN === null ? '' : PRICE_MIN.toLocaleString('ru-RU');
  priceMax.placeholder = PRICE_MAX === null ? '' : PRICE_MAX.toLocaleString('ru-RU');

  // Фильтры из адреса — до первой отрисовки: человек мог вернуться из товара
  // или прийти по присланной ссылке на отобранный каталог
  applyUrl(readUrl());

  // О возврате узнаём тоже до отрисовки: анимация запускается в тот момент,
  // когда карточка попадает в документ, и позже её уже не отменить
  const back = takeReturn();
  instant = null !== back;
  render();
  restorePosition(back);
  instant = false;
}
