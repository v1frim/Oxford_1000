#!/usr/bin/env node
// oxford-gap.js — покриття офіційного Oxford 3000/5000 нашим словником.
//
// Джерело рівнів: oxford-cefr.json (4954 слова, мітки A1-C1 з Oxford Learner's
// Dictionaries). ⚠️ У Oxford НЕМАЄ рівня C2 — його шкала закінчується на C1.
//
// Використання:
//   node oxford-gap.js            — таблиця покриття + розклад дірок
//   node oxford-gap.js B2         — список слів рівня, яких бракує (нова лексика)
//   node oxford-gap.js B2 --all   — усі дірки рівня з розбивкою по категоріях
//
// Категорії дірок (додавати варто лише «нову лексику»):
//   службові  — артиклі/займенники/прийменники/модальні (вони в HW_SKIP)
//   вигуки    — hi, wow, oh
//   форми     — dancing, written: гра резолвить їх через stemEn
//   брит.     — colour, lorry: у enAlt до наявної картки, НЕ окремою карткою
//   похідні   — -ly/-ment/-tion від наявної бази; частина справді нові лексеми,
//               частина сміття — дивитись поштучно
//   НОВА      — реальні кандидати на повноцінну картку

const fs = require("fs");
const path = require("path");
const ROOT = __dirname;
const LINES = (fs.readFileSync(path.join(ROOT, "dict.js"), "utf8") + "\n" + fs.readFileSync(path.join(ROOT, "index.html"), "utf8")).split("\n");
const OX = JSON.parse(fs.readFileSync(path.join(ROOT, "oxford-cefr.json"), "utf8"));

function slice(startRe, endRe, label) {
  const s = LINES.findIndex((x) => startRe.test(x));
  if (s === -1) throw new Error("не знайдено блок: " + label);
  for (let i = s + 1; i < LINES.length; i++) if (endRe.test(LINES[i])) return LINES.slice(s, i + 1).join("\n");
  throw new Error("не знайдено кінець блоку: " + label);
}

const WORDS = new Function(slice(/^const WORDS = \[$/, /^\];$/, "WORDS") + "\nreturn WORDS;")();
const norm = (s) => String(s).trim().toLowerCase().replace(/\s+/g, " ");
const bare = (s) => norm(s).replace(/^to /, "");
const arr = (x) => (Array.isArray(x) ? x : [x]);

const keys = new Set();
WORDS.forEach((w) => [...arr(w.en), ...(w.enAlt || [])].forEach((e) => { keys.add(norm(e)); keys.add(bare(e)); }));
const has = (w) => keys.has(w) || keys.has("to " + w);

// stemEn + HW_SKIP беремо з самої гри — щоб «форми» рахувались точно як у hover
const { stemEn, HW_SKIP } = new Function(
  "EN_TO_UA",
  slice(/^const HW_SKIP = new Set\(\[$/, /^\]\);$/, "HW_SKIP") + "\n" +
  slice(/^const IRREGULAR = \{$/, /^\};$/, "IRREGULAR") + "\n" +
  slice(/^function stemEn\(word\) \{$/, /^\}$/, "stemEn") + "\nreturn {stemEn,HW_SKIP};"
)({ has: (k) => keys.has(k) });

// закриті класи (Oxford дає частину мови в самому списку — тут спрощений список)
const CLOSED = new Set(["a", "an", "the", "and", "or", "but", "if", "of", "to", "in", "on", "at", "by", "for",
  "with", "from", "into", "onto", "about", "over", "under", "up", "down", "out", "off", "as", "than", "then",
  "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "my", "your", "his", "its",
  "our", "their", "mine", "yours", "ours", "theirs", "this", "that", "these", "those", "there", "here",
  "who", "whom", "whose", "which", "what", "when", "where", "why", "how", "can", "could", "will", "would",
  "shall", "should", "may", "might", "must", "ought", "have to", "used to", "cannot", "not", "no", "yes",
  "some", "any", "each", "every", "all", "both", "few", "more", "most", "much", "other", "another", "else",
  "anyone", "anybody", "anything", "everyone", "everybody", "everything", "someone", "somebody", "something",
  "no one", "nobody", "nothing", "myself", "yourself", "himself", "herself", "itself", "ourselves", "themselves",
  "because", "since", "while", "although", "unless", "until", "whether", "neither", "either", "none", "nor",
  "per", "next to", "according to", "any more", "upon", "within", "throughout", "despite", "toward", "towards"]);
const EXCL = new Set(["hi", "hey", "bye", "oh", "ah", "wow", "yeah", "ok", "yes", "hello", "goodbye"]);

const brVar = (w) => [w.replace(/our\b/g, "or"), w.replace(/re\b/g, "er"), w.replace(/ise\b/g, "ize"),
  w.replace(/isation\b/g, "ization"), w.replace(/ll/g, "l"), w.replace(/ae|oe/g, "e"),
  w.replace(/ogue\b/g, "og"), w.replace(/tre\b/g, "ter"), w.replace(/practise/g, "practice")].filter((x) => x !== w);

const SUF = [["ly", ""], ["ness", ""], ["ment", ""], ["ation", "e"], ["ation", ""], ["tion", "te"], ["tion", ""],
  ["sion", "d"], ["sion", "de"], ["ity", ""], ["ity", "e"], ["ance", ""], ["ance", "e"], ["ence", ""], ["ence", "e"],
  ["al", ""], ["al", "e"], ["ive", ""], ["ive", "e"], ["ous", ""], ["ous", "e"], ["ful", ""], ["less", ""],
  ["er", ""], ["er", "e"], ["or", ""], ["or", "e"], ["ist", ""], ["ism", ""], ["ize", ""], ["ise", ""],
  ["able", ""], ["able", "e"], ["ible", ""], ["ing", ""], ["ing", "e"], ["ed", ""], ["ed", "e"],
  ["s", ""], ["es", ""], ["ies", "y"], ["ily", "y"], ["ally", ""], ["ically", "ic"]];
function derivedFrom(w) {
  for (const [s, r] of SUF) {
    if (w.length > s.length + 2 && w.endsWith(s)) {
      const b = w.slice(0, -s.length) + r;
      if (has(b)) return b;
      if (/(.)\1$/.test(b) && has(b.slice(0, -1))) return b.slice(0, -1);
    }
  }
  for (const p of ["un", "in", "im", "dis", "re", "non", "over", "under", "mis", "pre", "anti"]) {
    if (w.startsWith(p) && has(w.slice(p.length))) return w.slice(p.length);
  }
  return null;
}

const ORDER = ["A1", "A2", "B1", "B2", "C1"];
const B = {};
ORDER.forEach((L) => (B[L] = { have: [], closed: [], excl: [], form: [], spell: [], deriv: [], newlex: [] }));
for (const [w, L] of Object.entries(OX)) {
  const b = B[L];
  if (!b) continue;
  if (has(w) || keys.has(bare(w))) { b.have.push(w); continue; }
  if (CLOSED.has(w) || HW_SKIP.has(w)) { b.closed.push(w); continue; }
  if (EXCL.has(w)) { b.excl.push(w); continue; }
  if (brVar(w).some((v) => has(v))) { b.spell.push(w); continue; }
  const st = stemEn(w);
  if (st && st !== w) { b.form.push(w + "←" + st); continue; }
  const d = derivedFrom(w);
  if (d) { b.deriv.push(w + "←" + d); continue; }
  b.newlex.push(w);
}

const lvl = (process.argv[2] || "").toUpperCase();
if (ORDER.includes(lvl)) {
  const b = B[lvl];
  if (process.argv.includes("--all")) {
    for (const k of ["closed", "excl", "form", "spell", "deriv", "newlex"]) {
      console.log("── " + k + " (" + b[k].length + "):\n" + b[k].join(", ") + "\n");
    }
  } else {
    console.log(b.newlex.join("\n"));
  }
  process.exit(0);
}

const P = (s, n) => String(s).padEnd(n);
console.log(P("рів", 4), P("Oxford", 7), P("маємо", 6), P("%", 7), P("службові", 9), P("вигук", 6),
  P("форми", 6), P("брит", 5), P("похідні", 8), "НОВА ЛЕКСИКА");
const T = { have: 0, closed: 0, excl: 0, form: 0, spell: 0, deriv: 0, newlex: 0 };
let TT = 0;
for (const L of ORDER) {
  const b = B[L];
  const tot = Object.values(b).reduce((s, a) => s + a.length, 0);
  TT += tot;
  Object.keys(T).forEach((k) => (T[k] += b[k].length));
  console.log(P(L, 4), P(tot, 7), P(b.have.length, 6), P(((b.have.length / tot) * 100).toFixed(1) + "%", 7),
    P(b.closed.length, 9), P(b.excl.length, 6), P(b.form.length, 6), P(b.spell.length, 5), P(b.deriv.length, 8), b.newlex.length);
}
console.log(P("РАЗ", 4), P(TT, 7), P(T.have, 6), P(((T.have / TT) * 100).toFixed(1) + "%", 7),
  P(T.closed, 9), P(T.excl, 6), P(T.form, 6), P(T.spell, 5), P(T.deriv, 8), T.newlex);
console.log("\nсписок кандидатів рівня:  node oxford-gap.js B2   (з розбивкою: --all)");
