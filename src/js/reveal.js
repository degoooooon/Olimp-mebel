// ─── Появление блоков при прокрутке ───
// Всю анимацию рисует CSS (кейфрейм fadeUp в utils/_animations.scss) — тот же,
// что и у карточек каталога. Здесь только наблюдатель: он вешает модификатор,
// когда блок въезжает в кадр. Раньше этим занимался GSAP: 45 КБ в сжатом виде
// на пять фейдов, да ещё и споривший с CSS за свойство transform.
//
// Начальное состояние (opacity: 0) стоит на классе reveal прямо в разметке:
// если добавлять его отсюда, между отрисовкой страницы и запуском скрипта
// блоки успели бы мигнуть.

// Каскад: селектор группы и шаг между соседями, мс.
// Первый селектор — текстовая колонка героя: надзаголовок, заголовок, текст,
// кнопки и цифры. Сцена героя лежит рядом, а не внутри колонки, и в каскад
// не входит — её задержка задана в _hero.scss.
/** @type {Array<[string, number]>} */
const GROUPS = [
  ['.hero__inner > div > .reveal', 90],
  ['.cat', 60],
  ['.feature', 120],
];

// Дальше задержки растягивать нечего: человек уже пролистал мимо
const MAX_DELAY = 600;

// Блок считается показанным, когда виден край: -12% снизу — примерно та же
// точка, что и «top 85%» у прежнего ScrollTrigger
const MARGIN = '0px 0px -12% 0px';

/**
 * Включает появление блоков при прокрутке.
 *
 * Зовётся последним из всех init: к этому моменту плитки категорий уже
 * нарисованы и попадут под наблюдение. Раньше — наблюдать было бы нечего.
 *
 * @returns {void}
 */
export function initReveal() {
  GROUPS.forEach(([selector, step]) => {
    /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll(selector)).forEach((el, i) => {
      el.style.setProperty('--reveal-delay', `${ Math.min(i * step, MAX_DELAY) }ms`);
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      // Показываем блок, когда он въехал в кадр — или когда остался выше него:
      // так бывает при переходе по якорю и при открытии страницы со ссылкой на
      // середину. Наблюдатель на такой перескок не срабатывает — он замечает
      // только пересечение края, — и блок остался бы невидимым позади.
      if (entry.isIntersecting || entry.boundingClientRect.bottom < 0) {
        entry.target.classList.add('reveal--in');
        observer.unobserve(entry.target); // показали один раз — больше не следим
      }
    });
  }, { rootMargin: MARGIN });

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}
