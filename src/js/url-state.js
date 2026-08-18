// ─── Состояние каталога в адресе страницы ───
//
// Товар открывается отдельной страницей, и уход на неё выгружает каталог
// целиком. Пока фильтры жили только в полях формы, возврат открывал чистый
// каталог с начала: человек, отобравший диваны до 30 тысяч и ушедший
// в тридцатый по счёту, возвращался к первым двадцати четырём полного списка
// и искал заново.
//
// Адрес — единственное место, которое переживает переход между страницами
// и которым можно поделиться. Поэтому состояние живёт там, а не в хранилище:
// заодно появилась ссылка на отобранный каталог, её можно отправить покупателю.
//
// Значения по умолчанию в адрес не пишем. Иначе на чистом каталоге в строке
// висел бы хвост из пустых параметров, и такую ссылку неприятно отправлять.

// Имя категории в адресе — razdel, а не cat, хотя поле формы называется cat.
// WordPress держит cat за собой: это номер рубрики, и «/?cat=sofa» он попробует
// понять как архив рубрики вместо главной. Проверено по списку
// public_query_vars в исходниках ядра, там же заняты s, search, order, orderby,
// p и page — их тоже брать нельзя.
const DEFAULTS = {
  razdel: 'all',
  q:      '',
  min:    '',
  max:    '',
  stock:  '',
  sort:   'pop',
};

// Куда вернуться из товара. Живёт в sessionStorage, а не в адресе: это память
// одной вкладки о последнем шаге, делиться ею не нужно и незачем.
const RETURN_KEY = 'olimp-return-v1';

/**
 * Значения фильтров из адреса. Отсутствующие не подставляем — вызывающий сам
 * решит, что делать с пропуском.
 *
 * @returns {Record<string, string>} Только те параметры, что есть в адресе.
 */
export function readUrl() {
  const params = new URLSearchParams(location.search);
  const out = {};

  for (const key of Object.keys(DEFAULTS)) {
    if (params.has(key)) {
      out[key] = params.get(key);
    }
  }

  return out;
}

/**
 * Пишет состояние в адрес, не добавляя записи в историю.
 *
 * replaceState, а не pushState: каждый набранный символ в поиске создавал бы
 * свою запись, и кнопка «назад» вместо возврата в товар щёлкала бы буквы
 * по одной.
 *
 * @param {Record<string, string>} values Значения полей формы как есть.
 * @returns {void}
 */
export function writeUrl(values) {
  const params = new URLSearchParams();

  for (const [key, fallback] of Object.entries(DEFAULTS)) {
    const value = String(values[key] ?? '');
    if ('' !== value && value !== fallback) {
      params.set(key, value);
    }
  }

  const search = params.toString();
  // Хеш сохраняем: с ним со страницы товара приходит просьба открыть корзину,
  // и потеряться она не должна из-за первой же правки фильтра
  history.replaceState(null, '', (search ? `?${ search }` : location.pathname) + location.hash);
}

/**
 * Запоминает, откуда ушли в товар: адрес каталога с фильтрами и номер карточки.
 *
 * @param {number} id Номер товара, по карточке которого нажали.
 * @returns {void}
 */
export function rememberReturn(id) {
  // Просим браузер не восстанавливать прокрутку для этой записи истории.
  // Дальше позицию ищем сами по номеру карточки, и родное восстановление
  // только мешало: оно срабатывает своим сроком, поверх нашей прокрутки,
  // и карточка уезжала мимо кадра. Отметка ставится на текущую запись,
  // остальные страницы сайта браузер восстанавливает как раньше.
  history.scrollRestoration = 'manual';

  try {
    sessionStorage.setItem(RETURN_KEY, JSON.stringify({
      url: location.pathname + location.search,
      id,
    }));
  } catch {
    // приватный режим или переполненное хранилище — просто не запомним
  }
}

// Разбирает запись из хранилища. Всё, что пришло оттуда, проверяем: подделать
// содержимое sessionStorage может кто угодно, а адрес отсюда попадает в href.
// Чужая схема вместо своего пути — это уже переброс посетителя на другой сайт
// нашей же ссылкой, поэтому пускаем только адреса, начинающиеся с одной косой.
function parseReturn(raw) {
  try {
    const { url, id } = JSON.parse(raw);
    const ok = 'string' === typeof url
      && url.startsWith('/')
      && !url.startsWith('//')
      && Number.isInteger(id);
    return ok ? { url, id } : null;
  } catch {
    return null;
  }
}

/**
 * Читает запись о возврате, не стирая её: страница товара обращается к ней
 * при каждой отрисовке ссылок.
 *
 * @returns {{url: string, id: number} | null}
 */
export function readReturn() {
  try {
    const raw = sessionStorage.getItem(RETURN_KEY);
    return raw ? parseReturn(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Читает запись и стирает её. Нужен каталогу: подвести карточку под глаза
 * следует один раз, при возврате, а не при каждом заходе на главную.
 *
 * @returns {{url: string, id: number} | null}
 */
export function takeReturn() {
  const saved = readReturn();

  try {
    sessionStorage.removeItem(RETURN_KEY);
  } catch {
    // нет доступа к хранилищу — читать там всё равно было нечего
  }

  return saved;
}

/**
 * Направляет ссылки «в каталог» на то место, откуда пришли.
 *
 * Вызывать на странице товара. В разметке эти ссылки ведут на главную, и так
 * и останется, если человек пришёл из поиска или из мессенджера: возвращать
 * его в отобранный каталог, которого он не видел, было бы странно.
 *
 * @returns {void}
 */
export function applyCatalogLinks() {
  const saved = readReturn();

  if (null === saved) {
    return;
  }

  for (const link of document.querySelectorAll('.topbar__back, .crumbs__link, .tovar__link')) {
    link.href = saved.url;
  }
}
