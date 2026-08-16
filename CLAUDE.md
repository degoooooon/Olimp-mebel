# Мебельный склад «Олимп»

Каталог мебели на Vite и WordPress. Работает: https://olimp-mebel26.ru

## Главное правило

Разметка живёт в одном месте — `src/index.html`. Из неё собираются две
разные вещи:

```bash
npm run build         # статика в dist/
npm run build:theme   # тема WordPress в wp-theme/olimp/
```

**Файлы в `wp-theme/olimp/` руками не редактируются.** Они собираются
из `src/`, и правка исчезнет при следующей сборке. Менять надо исходник
или `build/wp-template.js`.

## Где здесь легко сломать молча

`build/wp-template.js` собирает два шаблона: `front-page.php` из `index.html`
и `single-olimp_product.php` из `tovar.html`. Оба — через `.replace()`
по точным строкам разметки. Поправишь вёрстку — подмена
перестанет находить своё место. Ошибки не будет: сборка пройдёт, а на
сайте пропадёт подстановка.

Поэтому после правок в `index.html` сверяйся с контрольными числами:

```bash
grep -c 'home_url' wp-theme/olimp/front-page.php          # 3
grep -c 'olimp-mebel26\.ru' wp-theme/olimp/front-page.php # 0
grep -cE 'olimp_(cards|tiles|chips|count|catalog_json)\(\)' \
  wp-theme/olimp/front-page.php                           # 5
grep -c 'olimp_product_page()' \
  wp-theme/olimp/single-olimp_product.php                 # 1
```

Разошлось — значит подмена в `wp-template.js` промахнулась мимо строки,
которую ты только что изменил.

Число `home_url` было 4, пока в шаблон переносились комментарии разметки:
четвёртым совпадением шло слово `home_url()` внутри пояснения, а не вызов.
Комментарии в тему больше не попадают — считаются только настоящие вызовы.

## Перед «готово»

```bash
npm run lint          # eslint + stylelint + linthtml + editorconfig
npm run build
npm run build:theme
```

Все три должны пройти. Ровно это же гоняет CI на каждый пуш
(`.github/workflows/ci.yml`).

## Документация

- [docs/prompt.md](docs/prompt.md) — правила процесса, выведенные
  из реальных ошибок этого проекта
- [docs/prompt-code.md](docs/prompt-code.md) — стиль кода с примерами
- [docs/code-criteria.md](docs/code-criteria.md) — по чему принимать готовое.
  По каждому пункту ответ один из двух: «проверил, вот вывод» или
  «не проверял». Третьего нет
- [docs/journal.md](docs/journal.md) — что ломалось и почему
- [docs/catalog-data.md](docs/catalog-data.md) — формат каталога;
  менять его надо с обеих сторон сразу

## Чего здесь нет и не надо добавлять

- **Плагинов WordPress** — ни одного. Каталог сделан своим типом записи
  и своей таксономией
- **Фреймворка** — каталог на 41 товар его не требует, а рантайм весит
  больше, чем весь сайт
- **WooCommerce** — заказы идут звонком и сообщением, корзина своя
  на `localStorage`
