// ─── Приведение описаний товаров к формату поля «Характеристики» ───
//
// Данные от поставщика приходят папками: на товар — три снимка и
// description.txt. Внутри текст в свободном виде, без разделителей:
//
//     Диван Кватро
//     Ширина см 232
//     Наполнитель пружинный блок войлок пенополиуретан
//     Цена 36000
//
// Поле в админке ждёт «Название: значение». Отсюда и задача: расставить
// двоеточия. Угадать место разреза в строке нельзя — «Наполнитель пружинный
// блок войлок пенополиуретан» машина разделит где угодно. Поэтому названия
// берём из словаря ниже: что совпало началом строки — то и название,
// остальное значение.
//
// Словарь придётся дополнять под новые виды мебели: у шкафа будут «Дверей»
// и «Наполнение», у стола — «Материал столешницы». Неизвестная строка
// не выбрасывается молча, а попадает в отчёт — иначе характеристика тихо
// потерялась бы, и заметили бы это через месяц на сайте.
//
// Запуск:
//     node tools/goods-to-specs.mjs ~/Downloads/goods
import fs from 'fs';
import path from 'path';

// Порядок важен: сначала длинные названия, иначе «Ширина см» съест начало
// строки «Ширина спального места см» и значением станет «спального места 160»
const NAMES = [
  ['Ширина спального места см', 'Ширина спального места, см'],
  ['Длина спального места см', 'Длина спального места, см'],
  ['Материал каркаса', 'Материал каркаса'],
  ['Материал столешницы', 'Материал столешницы'],
  ['Наполнение', 'Наполнение'],
  ['Наполнитель', 'Наполнитель'],
  ['Механизм', 'Механизм'],
  ['Тип ткани', 'Тип ткани'],
  ['Ширина см', 'Ширина, см'],
  ['Глубина см', 'Глубина, см'],
  ['Высота см', 'Высота, см'],
  ['Дверей', 'Дверей'],
];

const PRICE = 'Цена';

// Пробелы внутри значения схлопываем: в исходниках попадаются двойные,
// а в таблице на сайте они видны как дыры
const tidy = (s) => s.replace(/\s+/g, ' ').trim();

function parse(raw) {
  const lines = raw.split(/\r?\n/).map(tidy).filter(Boolean);
  const out = { name: lines[0] ?? '', price: null, specs: [], unknown: [] };

  for (const line of lines.slice(1)) {
    if (line.startsWith(PRICE)) {
      const digits = line.slice(PRICE.length).replace(/\D/g, '');
      out.price = digits ? Number(digits) : null;
      continue;
    }

    const hit = NAMES.find(([prefix]) => line.startsWith(prefix));

    if (!hit) {
      out.unknown.push(line);
      continue;
    }

    const value = tidy(line.slice(hit[0].length).replace(/^[:\s]+/, ''));

    // Характеристика без значения — это не характеристика. В исходниках
    // так лежит «Тип ткани»: название есть, ткань не указана. Пустая строка
    // в таблице выглядела бы как недоделка сайта, а не как нехватка данных
    if (!value) {
      out.unknown.push(`${ line }  (значение не заполнено)`);
      continue;
    }

    out.specs.push(`${ hit[1] }: ${ value }`);
  }

  return out;
}

const root = process.argv[2];

if (!root || !fs.existsSync(root)) {
  console.error('Укажите папку с товарами: node tools/goods-to-specs.mjs ~/Downloads/goods');
  process.exit(1);
}

let total = 0;
let lost = 0;

for (const cat of fs.readdirSync(root).filter((d) => !d.startsWith('.'))) {
  const catDir = path.join(root, cat);

  if (!fs.statSync(catDir).isDirectory()) {
    continue;
  }

  for (const slug of fs.readdirSync(catDir).filter((d) => !d.startsWith('.'))) {
    const dir = path.join(catDir, slug);
    const file = path.join(dir, 'description.txt');

    if (!fs.existsSync(file)) {
      continue;
    }

    const p = parse(fs.readFileSync(file, 'utf8'));
    const photos = fs.readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f)).sort();

    total += 1;
    lost += p.unknown.length;

    console.log(`\n── ${ cat }/${ slug } ──`);
    console.log(`Название: ${ p.name }`);
    console.log(`Цена: ${ p.price ?? 'не указана' }`);
    console.log(`Фотографии: ${ photos.join(', ') || 'нет' }`);
    console.log('Характеристики (вставить в поле целиком):');
    console.log(p.specs.map((s) => `  ${ s }`).join('\n'));

    if (p.unknown.length) {
      console.log('НЕ РАЗОБРАЛОСЬ, посмотреть глазами:');
      console.log(p.unknown.map((s) => `  ${ s }`).join('\n'));
    }
  }
}

console.log(`\nИтого товаров: ${ total }, строк без разбора: ${ lost }`);
