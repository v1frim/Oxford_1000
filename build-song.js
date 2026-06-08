#!/usr/bin/env node
/**
 * build-song.js — помічник для додавання пісень у songs.js.
 *
 * Замінює тимчасовий /tmp/gen_*.js, який раніше переписувався щосесії.
 * Дві задачі:
 *   1) Калібрування — рахує score = lines + words/10 + slang×2 для всіх
 *      пісень у songs.js і друкує таблицю score→xp (довідник рангів).
 *   2) Форматування — бере дані нової пісні, вирівнює колонки (en/ua у lines,
 *      en/ua/note у slang), рахує score, пропонує xp за найближчими сусідами
 *      і друкує готовий до вставки блок.
 *
 * Використання:
 *   node build-song.js              # лише калібрувальна таблиця
 *   node build-song.js new-song.js  # форматує пісню з файлу + таблиця
 *
 * Файл нової пісні (new-song.js) експортує об'єкт БЕЗ поля xp:
 *   module.exports = {
 *     id: "neffex-...", artist: "NEFFEX", title: "... 🎵", ytId: "...",
 *     sections: [ { label: "КУПЛЕТ 1", lines: [ {en, ua}, ... ] }, ... ],
 *     glossary: { "слово": "переклад", ... },   // опц.
 *     slang:    [ { en, ua, note }, ... ]        // опц.
 *   };
 *
 * Вивід — у stdout. Скопіюй блок «БЛОК ДЛЯ ВСТАВКИ» і встав перед `];`
 * у songs.js, додавши кому після попереднього `}`. Поле xp уже підставлене
 * рекомендованим значенням — скоригуй вручну за потреби.
 *
 * Назви секцій: ВСТУП · КУПЛЕТ 1/2/3 · ПРИСПІВ · ПРЕД-ПРИСПІВ · БРИДЖ · ПРОГРАШ · КІНЦІВКА
 */

const fs = require("fs");
const path = require("path");

const SONGS_PATH = path.join(__dirname, "songs.js");

// ── 1. Парсинг наявного songs.js (для калібрування) ──────────────────────────
function loadSongs() {
  const src = fs.readFileSync(SONGS_PATH, "utf8");
  const i = src.indexOf("const SONGS");
  if (i < 0) throw new Error("Не знайдено `const SONGS` у songs.js");
  const arrText = src.slice(src.indexOf("[", i), src.lastIndexOf("];") + 1);
  // Масив — JS-літерал з коментарями; new Function безпечно його обчислює.
  return new Function("return " + arrText)();
}

// ── 2. score = lines + words/10 + slang×2 ─────────────────────────────────────
function scoreOf(song) {
  let lines = 0, words = 0;
  for (const s of (song.sections || [])) {
    for (const l of (s.lines || [])) {
      lines++;
      words += l.en.trim().split(/\s+/).filter(Boolean).length;
    }
  }
  const slang = (song.slang || []).length;
  return { lines, words, slang, score: +(lines + words / 10 + slang * 2).toFixed(1) };
}

// ── 3. Калібрування: усі пісні відсортовані за score ──────────────────────────
function calibrate(songs) {
  return songs.map(s => ({ title: s.title, xp: s.xp, ...scoreOf(s) }))
              .sort((a, b) => a.score - b.score);
}

function printCalibration(calib) {
  console.log("\n=== Калібрування (score → xp) ===");
  console.log("score   xp   lines words slang  title");
  for (const c of calib) {
    console.log(
      String(c.score).padStart(5) + "  " +
      String(c.xp).padStart(4) + "  " +
      String(c.lines).padStart(5) + " " +
      String(c.words).padStart(5) + " " +
      String(c.slang).padStart(5) + "  " +
      c.title
    );
  }
}

// ── 4. Рекомендація xp за трьома найближчими за score сусідами ────────────────
function recommendXp(score, calib) {
  const nearest = [...calib]
    .sort((a, b) => Math.abs(a.score - score) - Math.abs(b.score - score))
    .slice(0, 3);
  // мода xp серед сусідів; за нічиєї — xp НАЙБЛИЖЧОГО (ітеруємо nearest за близькістю,
  // стартуємо з nearest[0], тож при рівних count лишається найближчий, а не найменший xp).
  // ⚠️ Це лише орієнтир — на межі звіряй із формулою шкали (див. handoff, розділ «Пісні»).
  const counts = {};
  for (const n of nearest) counts[n.xp] = (counts[n.xp] || 0) + 1;
  let xp = nearest[0].xp, bestC = counts[nearest[0].xp];
  for (const n of nearest) {
    if (counts[n.xp] > bestC) { bestC = counts[n.xp]; xp = n.xp; }
  }
  return { xp, neighbors: nearest };
}

// ── 5. Форматування блоку ─────────────────────────────────────────────────────
const q = s => JSON.stringify(s);   // безпечний рядковий літерал (екранує лапки)

// Колонка ua вирівнюється по найдовшому en У МЕЖАХ СЕКЦІЇ (як у наявному файлі).
function fmtLines(lines, indent) {
  const left = lines.map(l => `{ en: ${q(l.en)},`);
  const w = Math.max(...left.map(s => s.length));
  return lines.map((l, i) => {
    const pad = " ".repeat(w - left[i].length + 1);
    const comma = i < lines.length - 1 ? "," : "";
    return indent + left[i] + pad + `ua: ${q(l.ua)} }` + comma;
  }).join("\n");
}

function fmtSections(sections) {
  return sections.map((s, i) => {
    const head = `      { label: ${q(s.label)}, lines: [\n`;
    const body = fmtLines(s.lines, "        ");
    const tail = "\n      ]}" + (i < sections.length - 1 ? "," : "");
    return head + body + tail;
  }).join("\n");
}

// glossary: кілька пар на рядок (перенос ~96 колонок) — компактно й читабельно.
function fmtGlossary(gloss) {
  const entries = Object.entries(gloss).map(([k, v]) => `${q(k)}: ${q(v)}`);
  const out = [];
  let cur = "";
  for (const e of entries) {
    const merged = cur ? cur + ", " + e : e;
    if (cur && ("      " + merged).length > 96) {
      out.push("      " + cur + ",");
      cur = e;
    } else {
      cur = merged;
    }
  }
  if (cur) out.push("      " + cur);
  return out.join("\n");
}

// slang: три вирівняні колонки (en | ua | note).
function fmtSlang(slang) {
  const c1 = slang.map(s => `{ en: ${q(s.en)},`);
  const w1 = Math.max(...c1.map(s => s.length));
  const c2 = slang.map(s => `ua: ${q(s.ua)},`);
  const w2 = Math.max(...c2.map(s => s.length));
  return slang.map((s, i) => {
    const p1 = " ".repeat(w1 - c1[i].length + 1);
    const p2 = " ".repeat(w2 - c2[i].length + 1);
    const comma = i < slang.length - 1 ? "," : "";
    return "      " + c1[i] + p1 + c2[i] + p2 + `note: ${q(s.note)} }` + comma;
  }).join("\n");
}

function buildBlock(song, xp) {
  const parts = [];
  parts.push("  {");
  parts.push(`    id: ${q(song.id)},`);
  parts.push(`    artist: ${q(song.artist)},`);
  parts.push(`    title: ${q(song.title)},`);
  parts.push(`    ytId: ${q(song.ytId)},`);
  parts.push(`    xp: ${xp},`);
  parts.push("    sections: [");
  parts.push(fmtSections(song.sections));
  // sections завжди закриваються комою, якщо далі є glossary/slang
  const hasGloss = song.glossary && Object.keys(song.glossary).length;
  const hasSlang = song.slang && song.slang.length;
  parts.push("    ]" + (hasGloss || hasSlang ? "," : ""));
  if (hasGloss) {
    parts.push("    glossary: {");
    parts.push(fmtGlossary(song.glossary));
    parts.push("    }" + (hasSlang ? "," : ""));
  }
  if (hasSlang) {
    parts.push("    slang: [");
    parts.push(fmtSlang(song.slang));
    parts.push("    ]");
  }
  parts.push("  }");
  return parts.join("\n");
}

// ── 6. main ───────────────────────────────────────────────────────────────────
function main() {
  const songs = loadSongs();
  const calib = calibrate(songs);
  const file = process.argv[2];

  if (!file) {
    printCalibration(calib);
    console.log("\nЩоб відформатувати нову пісню: node build-song.js new-song.js");
    console.log("(файл має робити module.exports = { ...дані пісні без xp... })");
    return;
  }

  const song = require(path.resolve(file));
  const sc = scoreOf(song);
  const rec = recommendXp(sc.score, calib);

  console.log(`\n=== ${song.title} ===`);
  console.log(`lines=${sc.lines}  words=${sc.words}  slang=${sc.slang}  →  score=${sc.score}`);
  console.log(`Рекомендований xp: ${rec.xp}`);
  console.log("Найближчі за score:");
  for (const n of rec.neighbors) {
    console.log(`   score ${String(n.score).padStart(5)}  ·  xp ${n.xp}  ·  ${n.title}`);
  }

  printCalibration(calib);

  console.log("\n=== БЛОК ДЛЯ ВСТАВКИ (перед `];` у songs.js; додай кому після попереднього `}`) ===\n");
  console.log(buildBlock(song, rec.xp));
}

main();
