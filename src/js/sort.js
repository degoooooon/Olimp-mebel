// ─── Свой список сортировки ───
// Заменяет <select>: на iOS системный список выезжает барабаном снизу и
// выглядит иначе, чем на компьютере, а стилизуемый select там пока не
// поддерживается. Раз рисуем сами — берём на себя и всё, что нативный
// элемент давал даром: клавиатуру, роли для скринридеров, закрытие.
import { sortRoot, sortButton, sortValue, sortList } from './dom.js';
import { hit } from './utils.js';

// Приведение к HTMLElement обязательно: у каждого пункта читаем dataset.value,
// а querySelectorAll обещает Element, у которого dataset нет вовсе
const options = () => /** @type {HTMLElement[]} */ ([...sortList.querySelectorAll('.sort__option')]);

let active = 0; // пункт под «курсором» списка, не обязательно выбранный
let typed = ''; // накопленные буквы для поиска по первым символам
let typedTimer = null;

function isOpen() {
  return sortButton.getAttribute('aria-expanded') === 'true';
}

// Список короткий, но у нижнего края экрана его всё равно надо развернуть
// вверх — иначе часть пунктов окажется за пределами видимой области
function place() {
  sortList.classList.remove('sort__list--up');
  const list = sortList.getBoundingClientRect();
  const button = sortButton.getBoundingClientRect();
  const roomBelow = window.innerHeight - button.bottom;
  if (roomBelow < list.height + 8 && button.top > roomBelow) {
    sortList.classList.add('sort__list--up');
  }
}

function setActive(index) {
  const items = options();
  active = (index + items.length) % items.length;
  items.forEach((el, i) => el.classList.toggle('sort__option--active', i === active));
  sortButton.setAttribute('aria-activedescendant', items[active].id);
  items[active].scrollIntoView({ block: 'nearest' });
}

function open() {
  sortList.hidden = false;
  sortButton.setAttribute('aria-expanded', 'true');
  place();
  setActive(options().findIndex((el) => el.dataset.value === sortRoot.dataset.value));
}

function close({ focusButton = true } = {}) {
  if (!isOpen()) {
    return;
  }
  sortList.hidden = true;
  sortButton.setAttribute('aria-expanded', 'false');
  sortButton.removeAttribute('aria-activedescendant');
  if (focusButton) {
    sortButton.focus();
  }
}

// Применяет выбор: значение, подпись на кнопке, состояние пунктов. Ни событий,
// ни закрытия списка — этим и отличается от choose, и это нужно при
// восстановлении сортировки из адреса, когда списка никто не открывал.
function applyChoice(index) {
  const items = options();
  const picked = items[index];
  sortRoot.dataset.value = picked.dataset.value;
  sortValue.textContent = picked.textContent;
  items.forEach((el, i) => el.setAttribute('aria-selected', String(i === index)));
}

// Выбор пункта: обновляем подпись, состояние и сообщаем каталогу.
// Событие «change» — то же имя, что у select, поэтому каталог слушает как раньше.
function choose(index) {
  applyChoice(index);
  close();
  sortRoot.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Ставит сортировку молча, без события «change».
 *
 * Каталог зовёт это при чтении адреса, до первой отрисовки. Событие здесь
 * было бы лишней перерисовкой: каталог и так нарисуется сразу после.
 * Неизвестное значение игнорируем — в адрес его мог подставить кто угодно.
 *
 * @param {string} value Значение пункта: pop, asc, desc или new.
 * @returns {void}
 */
export function setSort(value) {
  const index = options().findIndex((el) => el.dataset.value === value);

  if (index >= 0) {
    applyChoice(index);
  }
}

// Поиск по первым буквам — как в нативном списке: набираешь «сн», прыгает
// на «Сначала дешевле». Пауза в секунду начинает набор заново.
function typeahead(char) {
  clearTimeout(typedTimer);
  typed += char.toLowerCase();
  typedTimer = setTimeout(() => {
    typed = '';
  }, 1000);

  const items = options();
  const from = typed.length === 1 ? active + 1 : active;
  for (let i = 0; i < items.length; i++) {
    const index = (from + i) % items.length;
    if (items[index].textContent.trim().toLowerCase().startsWith(typed)) {
      setActive(index);
      return;
    }
  }
}

function onKeydown(e) {
  const items = options();

  if (!isOpen()) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      open();
    }
    return;
  }

  switch (e.key) {
    case 'ArrowDown': e.preventDefault(); setActive(active + 1); break;
    case 'ArrowUp': e.preventDefault(); setActive(active - 1); break;
    case 'Home': e.preventDefault(); setActive(0); break;
    case 'End': e.preventDefault(); setActive(items.length - 1); break;
    case 'Enter': e.preventDefault(); choose(active); break;
    // Пробел спорит сам с собой: он и выбирает пункт, и встречается внутри
    // названий. Пока идёт набор — считаем его буквой, иначе выбором.
    case ' ':
      e.preventDefault();
      if (typed) {
        typeahead(' ');
      } else {
        choose(active);
      }
      break;
    case 'Escape': e.preventDefault(); close(); break;
    case 'Tab': close({ focusButton: false }); break;
    default:
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        typeahead(e.key);
      }
  }
}

/**
 * Включает свой список сортировки: мышь, клавиатура, закрытие по клику мимо.
 *
 * @returns {void}
 */
export function initSort() {
  sortButton.addEventListener('click', () => (isOpen() ? close() : open()));
  sortButton.addEventListener('keydown', onKeydown);

  sortList.addEventListener('click', (e) => {
    const option = hit(e, '.sort__option');
    if (option) {
      choose(options().indexOf(option));
    }
  });

  // Подсветка следует за указателем, чтобы клавиатура и мышь не спорили
  sortList.addEventListener('pointermove', (e) => {
    const option = hit(e, '.sort__option');
    if (option) {
      setActive(options().indexOf(option));
    }
  });

  document.addEventListener('pointerdown', (e) => {
    if (!sortRoot.contains(/** @type {Node} */ (e.target))) {
      close({ focusButton: false });
    }
  });

  // Прокрутка и поворот экрана меняют доступное место — список уехал бы мимо
  window.addEventListener('scroll', () => isOpen() && place(), { passive: true });
  window.addEventListener('resize', () => isOpen() && place());
}
