// ─── Сборка шаблона темы WordPress из src/index.html ───
// Разметка живёт в одном месте. Тема не хранит свою копию: этот плагин берёт
// index.html и переписывает в нём ровно то, что в WordPress работает иначе —
// подключение стилей и скриптов, адрес спрайта, адреса для соцсетей.
// Всё остальное переносится байт в байт.
//
// Если бы шаблон вели руками, через месяц у нас было бы два экземпляра одной
// вёрстки, и каждую правку пришлось бы вносить дважды — с гарантией забыть.
import fs from 'fs';
import path from 'path';

// Что вырезаем: в теме эти ресурсы подключает functions.php через wp_enqueue,
// иначе они попадут на страницу дважды и с неправильными адресами
const DROP = [
  /^\s*<link rel="stylesheet" href="\.\/styles\/style\.scss">\s*$/m,
  /^\s*<script type="module" src="\.\/js\/main\.js"><\/script>\s*$/m,
];

function toPhp(html) {
  let out = html;
  for (const re of DROP) {
    out = out.replace(re, '');
  }

  return out
    // Язык страницы задаёт WordPress — он знает, что выбрано в настройках
    .replace('<html lang="ru">', '<html <?php language_attributes(); ?>>')
    // Адрес спрайта содержит хеш и меняется при каждой сборке — берём из манифеста
    .replaceAll('/__spritemap', '<?php echo esc_url( olimp_sprite() ); ?>')
    // Свои иконки лежат в папке темы
    .replace('href="./favicon.svg"', 'href="<?php echo esc_url( olimp_asset( \'favicon.svg\' ) ); ?>"')
    .replace('href="./apple-touch-icon.png"', 'href="<?php echo esc_url( olimp_asset( \'apple-touch-icon.png\' ) ); ?>"')
    // Превью ссылки в соцсетях должно указывать на реальный адрес сайта,
    // а не на тот, что был зашит при разработке
    .replace(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="<?php echo esc_url( home_url( \'/\' ) ); ?>">')
    .replace(/<meta property="og:image" content="[^"]*">/, '<meta property="og:image" content="<?php echo esc_url( olimp_asset( \'og.jpg\' ) ); ?>">')
    // Те же два адреса внутри разметки организации
    .replace('"url": "https://olimp-mebel26.ru/"', '"url": "<?php echo esc_url( home_url( \'/\' ) ); ?>"')
    .replace('"image": "https://olimp-mebel26.ru/og.jpg"', '"image": "<?php echo esc_url( olimp_asset( \'og.jpg\' ) ); ?>"')
    .replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="<?php echo esc_url( home_url( \'/\' ) ); ?>">')
    // Ссылка на политику конфиденциальности. В разметке стоит полный адрес —
    // он нужен статической сборке, где своей страницы нет. Здесь берём адрес
    // у WordPress: страницу могут переименовать или сменить домен, а ссылка
    // должна остаться рабочей.
    .replace(
      'href="https://olimp-mebel26.ru/privacy-policy/"',
      'href="<?php echo esc_url( get_privacy_policy_url() ); ?>"'
    )
    // Каталог отдаём сразу разметкой, а не только скриптом: до того, как
    // отработает JS, страница уже содержит названия товаров и категорий.
    // Скрипт при загрузке перерисует эти же блоки и дальше ведёт их сам.
    .replace(
      '<div class="cats__grid" id="cats-grid" tabindex="0" role="group" aria-label="Категории, прокручиваемый список"></div>',
      '<div class="cats__grid" id="cats-grid" tabindex="0" role="group" aria-label="Категории, прокручиваемый список"><?php olimp_tiles(); ?></div>'
    )
    .replace('<div class="chips" id="cat-chips"></div>', '<div class="chips" id="cat-chips"><?php olimp_chips(); ?></div>')
    .replace('<div class="grid" id="grid"></div>', '<div class="grid" id="grid"><?php olimp_cards(); ?></div>')
    .replace(
      '<span class="toolbar__count" id="count" role="status"></span>',
      '<span class="toolbar__count" id="count" role="status"><?php olimp_count(); ?></span>'
    )

    // Точки, куда WordPress и плагины вставляют своё
    .replace('</head>', '<?php wp_head(); ?>\n</head>')
    .replace('<body>', '<body <?php body_class(); ?>>')
    // Товары и категории — тем самым блоком JSON, который ищет data.js
    .replace('</body>', '<?php olimp_catalog_json(); ?>\n<?php wp_footer(); ?>\n</body>');
}

export function wpTemplate({ src, out }) {
  return {
    name: 'wp-template',
    // Пишем после сборки: к этому моменту манифест на месте, и папка assets
    // уже очищена — файл рядом с ней не заденет
    closeBundle() {
      const html = fs.readFileSync(src, 'utf8');
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, toPhp(html));
      console.log(`  шаблон темы: ${ path.basename(out) } собран из ${ path.basename(src) }`);
    },
  };
}
