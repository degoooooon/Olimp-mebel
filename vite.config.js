import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';
import VitePluginSvgSpritemap from '@spiriit/vite-plugin-svg-spritemap';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import { wpTemplate } from './build/wp-template.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Две сборки из одних исходников:
//   npm run build       — статический сайт в dist/ (просмотр без WordPress)
//   npm run build:theme — стили и скрипты для темы WordPress
// Разница только в упаковке. Тема собирает не страницу, а набор файлов:
// разметку в ней рисует PHP, поэтому index.html не нужен, зато нужен
// manifest.json — по нему functions.php находит файлы с хешами в именах.
// Имя папки темы. Меняешь его — поменяй и здесь: адрес зашивается в CSS
// при сборке (по нему браузер ищет фон героя), а угадать его на лету неоткуда.
const THEME_DIR = 'olimp';

export default defineConfig(({ mode }) => {
  const isTheme = mode === 'theme';
  const themeAssets = path.resolve(__dirname, `wp-theme/${ THEME_DIR }/assets`);

  return {
    // Исходники лежат в src/
    root: './src',
    // Страница живёт в корне сайта, а файлы темы — в /wp-content/themes/…,
    // поэтому относительные пути внутри CSS вели бы мимо. Адреса из PHP
    // подставляются сами, а вот ссылку на фон героя внутри CSS подставить
    // некому — её адрес приходится зашить при сборке.
    base: isTheme ? `/wp-content/themes/${ THEME_DIR }/assets/` : './',
    // Фавиконка, иконка для iOS и картинка превью нужны обеим сборкам:
    // шаблон темы ссылается на них через olimp_asset()
    publicDir: path.resolve(__dirname, 'src/public'),

    plugins: [
      // Минификация HTML — только для статической сборки, в теме HTML нет
      ...(isTheme ? [] : [createHtmlPlugin({ minify: true })]),

      // Шаблон главной страницы темы собирается из того же index.html
      ...(isTheme ? [wpTemplate({
        src: path.resolve(__dirname, 'src/index.html'),
        out: path.resolve(__dirname, `wp-theme/${ THEME_DIR }/front-page.php`),
      })] : []),

      // Спрайт иконок. Каждая иконка — отдельный файл в img/sprite, плагин
      // собирает их в один. Префикс i- оставлен прежним, чтобы ссылки вида
      // #i-sofa не менялись; путь к спрайту Vite подставляет сам.
      VitePluginSvgSpritemap('img/sprite/*.svg', {
        prefix: 'i-',
        styles: false,
        // Иконки уже оптимизированы вручную; повторная чистка сминает
        // viewBox и ломает пропорции иллюстраций
        svgo: false,
      }),

      // Плагин спрайта пишет абсолютный путь /assets/… и не смотрит на base.
      // Статику открывают из папки — с диска или из подкаталога на сервере, —
      // и такой путь уводит в корень, мимо файлов: спрайт отдаёт 404, и иконки
      // пропадают со всей страницы разом. Приводим к относительному, как
      // у остальных ресурсов. Ссылку в JS чинить не нужно:
      // там путь берётся из готовой разметки. В теме адрес спрайта ставит PHP,
      // поэтому там правка не нужна и не делается.
      ...(isTheme ? [] : [{
        name: 'spritemap-relative-path',
        enforce: 'post',
        transformIndexHtml: (html) => html.replaceAll('"/assets/spritemap', '"./assets/spritemap'),
      }]),

      // Оптимизация растровых картинок (фон, карточки) и SVG
      ViteImageOptimizer({
        test: /\.(jpe?g|png|svg|webp)$/i,
        includePublic: false,
        logStats: true,
        png: { quality: 80, palette: true },
        jpeg: { quality: 80, progressive: true },
        jpg: { quality: 80, progressive: true },
        webp: { quality: 80 },
        svg: {
          multipass: true,
          plugins: [
            {
              name: 'preset-default',
              params: { overrides: { removeViewBox: false, cleanupIds: false } },
            },
            'removeDimensions',
          ],
        },
        cache: true,
        cacheLocation: './.cache',
      }),
    ],

    css: {
      devSourcemap: true,
    },

    build: {
      outDir: isTheme ? themeAssets : '../dist',
      // Чистится только assets/ внутри темы — PHP-файлы рядом не трогаются
      emptyOutDir: true,
      // Без этого получалось assets/assets/ — папка внутри одноимённой
      assetsDir: isTheme ? '.' : 'assets',

      // Мелкие файлы Vite по умолчанию вшивает в CSS строкой base64.
      // Шрифтам это вредит: они разбиты по наборам символов, и браузер сам
      // выбирает нужные по unicode-range. Вшитые он получает все и сразу,
      // вместе с таблицей стилей, — то есть качает кириллицу, латиницу
      // и расширения независимо от того, что на странице.
      assetsInlineLimit: (file) => (/\.woff2?$/i.test(file) ? false : undefined),
      // manifest нужен, чтобы PHP знал имена файлов с хешами. Хеши оставляем:
      // без них браузер клиента будет неделю показывать старые стили.
      manifest: isTheme,
      // Пути входа Rollup считает от корня проекта, а не от root Vite,
      // поэтому здесь они абсолютные
      rollupOptions: isTheme
        ? {
          input: [
            path.resolve(__dirname, 'src/js/main.js'),
            path.resolve(__dirname, 'src/styles/style.scss'),
          ],
        }
        // Две страницы: каталог и макет страницы товара. Второй вход нужен
        // только статике — в теме страницу товара будет печатать PHP,
        // и лишний бандл там просто лежал бы мёртвым грузом.
        : {
          input: {
            main: path.resolve(__dirname, 'src/index.html'),
            tovar: path.resolve(__dirname, 'src/tovar.html'),
          },
        },
    },

    server: {
      port: 3000,
      // Сама открывает вкладку при запуске — чтобы не копировать адрес руками
      open: true,
    },
  };
});
