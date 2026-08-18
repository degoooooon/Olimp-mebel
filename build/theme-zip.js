// ─── Архив темы для загрузки через админку WordPress ───
//
// «Внешний вид → Темы → Загрузить тему» принимает только zip. Раньше архив
// собирался руками, и это уже стоило дня: подрядчик загрузил файл недельной
// давности, увидел ровно те же поломки и решил, что исправления не работают.
// Архив от 10 августа не содержал даже single-olimp_product.php — если бы
// WordPress его принял, страницы товаров исчезли бы с сайта.
//
// Поэтому архив собирается сборкой и никак иначе. Дата файла = дата сборки,
// перепутать нельзя.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const THEME_DIR = 'wp-theme';
const THEME = 'olimp';
const ZIP = path.join(THEME_DIR, `${ THEME }.zip`);

// Файлы, без которых тема на сайте работает наполовину: главная откроется,
// а страницы товаров отдадут главную вместо себя. Проверяем состав архива,
// а не папки: загружают именно архив.
const MUST_HAVE = [
  'style.css',            // без него WordPress не считает папку темой
  'functions.php',
  'front-page.php',
  'single-olimp_product.php',
  'page.php',
  'index.php',
];

const dir = path.join(THEME_DIR, THEME);

if (!fs.existsSync(dir)) {
  throw new Error(`Папки ${ dir } нет — сначала «npm run build:theme»`);
}

// Старый архив удаляем: zip по умолчанию дописывает в существующий, и файлы,
// которых в теме больше нет, остались бы внутри навсегда
fs.rmSync(ZIP, { force: true });

// -r рекурсивно, -q без списка файлов, -X без служебных данных macOS.
// Пути внутри архива должны начинаться с olimp/ — WordPress берёт имя папки
// темы из первого уровня, поэтому zip запускаем из wp-theme
try {
  execFileSync('zip', ['-rqX', `${ THEME }.zip`, THEME, '-x', '.DS_Store', '*/.DS_Store'], {
    cwd: THEME_DIR,
    stdio: 'inherit',
  });
} catch (e) {
  // ENOENT здесь означает «нет команды zip», а не «нет файла». Без понятного
  // текста сборка падала бы с загадочным spawn zip ENOENT
  throw new Error('ENOENT' === e.code
    ? 'Нет команды zip. macOS и ubuntu приносят её с собой; на другой системе поставь Info-ZIP'
    : `zip не справился: ${ e.message }`);
}

const inside = execFileSync('unzip', ['-Z1', ZIP], { encoding: 'utf8' }).split('\n');
const missing = MUST_HAVE.filter((f) => !inside.includes(`${ THEME }/${ f }`));

if (missing.length) {
  throw new Error(`В архиве нет обязательных файлов: ${ missing.join(', ') }`);
}

const mb = (fs.statSync(ZIP).size / 1024 / 1024).toFixed(1);
const files = inside.filter(Boolean).length;

console.log(`Архив темы: ${ ZIP } — ${ files } файлов, ${ mb } МБ`);
console.log(`Обязательные файлы на месте: ${ MUST_HAVE.join(', ') }`);
