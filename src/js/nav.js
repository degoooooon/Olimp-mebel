// ─── Мобильное меню в шапке ───
// На широких экранах ссылки видны всегда, кнопка-бургер скрыта стилями,
// поэтому обработчики ниже там просто не срабатывают.
import { header, nav, navToggle } from './dom.js';
import { hit } from './utils.js';

function setOpen(open) {
  nav.classList.toggle('nav--open', open);
  // Через String: setAttribute принимает строку, логическое значение браузер
  // приводит сам, и опечатку в таком месте не поймать заранее
  navToggle.setAttribute('aria-expanded', String(open));
}

/**
 * Включает кнопку-бургер и закрытие мобильного меню.
 *
 * На широких экранах кнопка скрыта стилями, и обработчики просто не
 * срабатывают — отдельной проверки ширины не нужно.
 *
 * @returns {void}
 */
export function initNav() {
  navToggle.addEventListener('click', () => {
    setOpen(!nav.classList.contains('nav--open'));
  });

  // Ссылки ведут на якоря этой же страницы — после перехода меню закрываем,
  // иначе оно осталось бы висеть поверх раздела, к которому мы прокрутились
  nav.addEventListener('click', (e) => {
    if (hit(e, 'a')) {
      setOpen(false);
    }
  });

  // Клик мимо шапки закрывает меню. Клик по самой кнопке сюда тоже дойдёт,
  // но он внутри header — иначе меню закрывалось бы сразу после открытия.
  document.addEventListener('click', (e) => {
    if (!header.contains(/** @type {Node} */ (e.target))) {
      setOpen(false);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('nav--open')) {
      setOpen(false);
      navToggle.focus(); // возвращаем фокус на кнопку, а не теряем на body
    }
  });
}
