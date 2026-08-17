// ─── Проверка совместимости по датасету web-features ───
//
// Планка проекта — Baseline widely available: возможность поддерживают все
// основные браузеры не меньше двух с половиной лет. Проверяем по данным,
// а не по ощущениям: «вроде везде работает» — это не проверка.
//
// Что делает: вытаскивает из стилей все свойства и @-правила, из скриптов —
// известные браузерные вызовы, и сверяет каждое со статусом в web-features.
// Ключи BCD вида css.properties.gap связывают одно с другим точно, без догадок.
//
// Запуск:
//     node tools/baseline-check.mjs
import fs from 'fs';
import path from 'path';
import { features } from 'web-features';

// BCD-ключ → id возможности. Одна возможность закрывает много ключей,
// поэтому строим обратный указатель
const byKey = new Map();

for (const [id, f] of Object.entries(features)) {
  for (const key of f.compat_features ?? []) {
    byKey.set(key, id);
  }
}

const status = (id) => features[id]?.status?.baseline ?? null;
const since = (id) => features[id]?.status?.baseline_high_date ?? '';

function walk(dir, ext) {
  const out = [];

  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);

    if (fs.statSync(full).isDirectory()) {
      out.push(...walk(full, ext));
    } else if (ext.test(name)) {
      out.push(full);
    }
  }

  return out;
}

// ─── Стили: свойства и @-правила ───
const cssUse = new Map(); // ключ BCD → где встретилось

for (const file of walk('src/styles', /\.scss$/)) {
  const text = fs.readFileSync(file, 'utf8');

  // Комментарии выкидываем: в них полно названий свойств из объяснений,
  // а проверять надо код, а не текст про код
  const code = text.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

  for (const m of code.matchAll(/(^|[;{]|\n)\s*(-{0,2}[a-z][a-z0-9-]+)\s*:/g)) {
    const prop = m[2];

    // Переменные проекта проверять не надо, они не браузерная возможность
    if (prop.startsWith('--')) {
      continue;
    }

    const key = `css.properties.${ prop }`;

    if (byKey.has(key)) {
      if (!cssUse.has(key)) {
        cssUse.set(key, new Set());
      }
      cssUse.get(key).add(path.basename(file));
    }
  }

  for (const m of code.matchAll(/@media\s*\(\s*([a-z-]+)\s*:/g)) {
    const key = `css.at-rules.media.${ m[1] }`;

    if (byKey.has(key)) {
      if (!cssUse.has(key)) {
        cssUse.set(key, new Set());
      }
      cssUse.get(key).add(path.basename(file));
    }
  }
}

// ─── Скрипты: вызовы, за которыми стоит браузерная возможность ───
// Список ручной: вытащить их из кода регуляркой надёжно нельзя, а гадать
// хуже, чем перечислить то, что действительно используется
const JS_CHECKS = [
  ['scrollIntoView', 'api.Element.scrollIntoView'],
  ['IntersectionObserver', 'api.IntersectionObserver'],
  ['matchMedia', 'api.Window.matchMedia'],
  ['localStorage', 'api.Window.localStorage'],
  ['URLSearchParams', 'api.URLSearchParams'],
  ['classList.toggle', 'api.Element.classList'],
  ['structuredClone', 'api.structuredClone'],
  ['ResizeObserver', 'api.ResizeObserver'],
];

const jsText = walk('src/js', /\.js$/).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const jsUse = new Map();

for (const [needle, key] of JS_CHECKS) {
  if (jsText.includes(needle) && byKey.has(key)) {
    jsUse.set(key, new Set(['js']));
  }
}

// Возможности, которые датасет считает ниже планки целой группой, хотя
// используем мы из них только давно поддержанное. Проверено поимённо:
//
//   cursor — в группе 40 значений, включая экзотику вроде all-scroll
//     и context-menu. У нас только pointer, default и not-allowed:
//     они есть с Chrome 68, Firefox 27 и Safari 11.
//
// Список надо перепроверять при обновлении web-features, а не расширять
// «чтобы отчёт был зелёным». Каждая строка здесь — это отказ от проверки.
const GROUPED_OK = new Set(['cursor']);

// ─── Отчёт ───
const rows = [];

for (const [key, where] of [...cssUse, ...jsUse]) {
  const id = byKey.get(key);
  const st = status(id);

  rows.push({ key, id, st, where: [...where].join(', '), name: features[id]?.name ?? id });
}

const bad = rows.filter((r) => 'high' !== r.st && !GROUPED_OK.has(r.id));
const skipped = rows.filter((r) => GROUPED_OK.has(r.id));

console.log(`Проверено возможностей: ${ rows.length }`);
console.log(`Ниже планки Baseline widely available: ${ bad.length }`);

if (skipped.length) {
  console.log(`Разобрано поимённо и признано годным: ${ skipped.map((r) => r.id).join(', ') }`);
}

if (bad.length) {
  console.log('');

  for (const r of bad.sort((a, b) => String(a.st).localeCompare(String(b.st)))) {
    const mark = false === r.st ? 'ОГРАНИЧЕННО' : 'НЕДАВНО';

    console.log(`  ${ mark }  ${ r.name }`);
    console.log(`      id: ${ r.id }   где: ${ r.where }`);
    console.log(`      поддержка: ${ JSON.stringify(features[r.id]?.status?.support ?? {}) }`);
  }
}

console.log('');
console.log('Самые свежие из принятых (widely, но недавно):');

rows.filter((r) => 'high' === r.st)
  .sort((a, b) => String(since(b.id)).localeCompare(String(since(a.id))))
  .slice(0, 5)
  .forEach((r) => console.log(`  ${ since(r.id) }  ${ r.name }  (${ r.where })`));
