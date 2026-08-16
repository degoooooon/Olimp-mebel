// ─── Подготовка снимков товаров ───
//
// Снимки приходят прямо с телефона: 8160×6120, по 13 МБ штука. Класть их
// на сайт как есть нельзя — на сорок товаров это полтора гигабайта, а браузер
// покупателя качал бы восьмимегапиксельную картинку ради карточки шириной
// в триста точек.
//
// Скрипт делает из каждого снимка три ширины в webp — ровно те, что ждёт
// разметка: 400 для телефона, 800 для планшета, 1600 для ретины.
//
// Отдельно: EXIF не переносится. В снимках с телефона там лежат координаты
// съёмки, модель аппарата и время. Для склада это адрес, который совпадает
// с рабочим, но выкладывать чужую геометку в открытый доступ всё равно
// не надо — sharp по умолчанию метаданные не копирует, и это тот случай,
// когда умолчание правильное.
//
// Запуск:
//     node tools/goods-photos.mjs ~/Downloads/goods src/img/cards
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Те же ширины, что у остальных снимков каталога. Меняешь здесь — меняй
// и в data.js: там они перечислены при сборке srcset
const WIDTHS = [400, 800, 1600];

// 82 — на глаз неотличимо от исходника на фотографиях мебели, но втрое
// легче 90. Проверялось на снимках с однотонным фоном: именно там артефакты
// заметнее всего
const QUALITY = 82;

const [src, out] = process.argv.slice(2);

if (!src || !out) {
  console.error('node tools/goods-photos.mjs <папка goods> <куда класть>');
  process.exit(1);
}

fs.mkdirSync(out, { recursive: true });

let made = 0;
let bytes = 0;
let from = 0;

for (const cat of fs.readdirSync(src).filter((d) => !d.startsWith('.'))) {
  const catDir = path.join(src, cat);

  if (!fs.statSync(catDir).isDirectory()) {
    continue;
  }

  for (const slug of fs.readdirSync(catDir).filter((d) => !d.startsWith('.'))) {
    const dir = path.join(catDir, slug);
    const shots = fs.readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f)).sort();

    for (const [i, file] of shots.entries()) {
      const source = path.join(dir, file);
      from += fs.statSync(source).size;

      for (const w of WIDTHS) {
        const name = `${ slug }-${ i + 1 }-${ w }.webp`;
        const dest = path.join(out, name);

        // withoutEnlargement: если исходник вдруг меньше нужной ширины,
        // растягивать его не надо — получится мыло вместо снимка
        // eslint-disable-next-line no-await-in-loop
        const info = await sharp(source)
          .rotate() // поворот по EXIF применяем до того, как метаданные отбросятся
          .resize({ width: w, withoutEnlargement: true })
          .webp({ quality: QUALITY })
          .toFile(dest);

        made += 1;
        bytes += info.size;
      }

      console.log(`  ${ cat }/${ slug }/${ file } → ${ slug }-${ i + 1 }-{${ WIDTHS.join(',') }}.webp`);
    }
  }
}

const mb = (n) => `${ (n / 1048576).toFixed(1) } МБ`;

console.log(`\nСоздано файлов: ${ made }`);
console.log(`Было: ${ mb(from) }   стало: ${ mb(bytes) }   легче в ${ (from / bytes).toFixed(1) } раза`);
