// Генерує блок CEFR_DATA для index.html: слово-ключ → рівень A1..C2.
// Джерела: oxford-cefr.json (Oxford 3000/5000, A1-C1) → CEFR-J + Octanove (A1-C2).
const fs = require("fs");
const our = JSON.parse(fs.readFileSync("our-words.json", "utf8"));
const ox = JSON.parse(fs.readFileSync("/home/user/Oxford_1000/oxford-cefr.json", "utf8"));
const parse = (f) => fs.readFileSync(f, "utf8").split("\n").slice(1).filter(Boolean).map((l) => l.split(","));
const norm = (s) => String(s).trim().toLowerCase().replace(/\s+/g, " ");
const bare = (s) => norm(s).replace(/^to /, "");
const ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];

const alt = new Map();
[...parse("cefrj.csv"), ...parse("octanove.csv")].forEach((r) => {
  const w = norm(r[0]), L = (r[2] || "").trim();
  if (!ORDER.includes(L)) return;
  const c = alt.get(w);
  if (!c || ORDER.indexOf(L) < ORDER.indexOf(c)) alt.set(w, L);
});
const lvl = (w) => ox[w] || alt.get(w) || null;

const vars = (w) => [w.replace(/or\b/g, "our"), w.replace(/er\b/g, "re"), w.replace(/ize\b/g, "ise")];
const stems = (w) => {
  const o = [];
  if (w.endsWith("ies")) o.push(w.slice(0, -3) + "y");
  if (w.endsWith("es")) o.push(w.slice(0, -2));
  if (w.endsWith("s")) o.push(w.slice(0, -1));
  if (w.endsWith("ly")) o.push(w.slice(0, -2));
  if (w.endsWith("ing")) o.push(w.slice(0, -3), w.slice(0, -3) + "e");
  if (w.endsWith("ed")) o.push(w.slice(0, -2), w.slice(0, -1));
  return o;
};

const buckets = {};
ORDER.forEach((L) => (buckets[L] = []));
const seen = new Set();
let none = 0;
for (const w of our) {
  const key = norm(w.en[0]);
  if (seen.has(key)) continue;
  seen.add(key);
  const forms = [...w.en, ...(w.enAlt || [])].map(norm).flatMap((f) => [f, bare(f)]);
  let best = null;
  for (const f of forms) {
    const L = lvl(f);
    if (L && (!best || ORDER.indexOf(L) < ORDER.indexOf(best))) best = L;
  }
  if (!best) {
    const b = bare(key);
    for (const v of [...vars(b), ...stems(b)]) {
      const L = lvl(v);
      if (L && (!best || ORDER.indexOf(L) < ORDER.indexOf(best))) best = L;
    }
  }
  if (best) buckets[best].push(key);
  else none++;
}

let block = "// Рівні CEFR для слів словника (сесія 42). Ключ = wordKey у нижньому регістрі,\n";
block += "// рядки розділені «|». Джерела: Oxford 3000/5000 (A1-C1) → CEFR-J + Octanove (A1-C2).\n";
block += "// Слова, яких немає в жодному списку (тематичний шар EFE/пісень), сюди НЕ входять —\n";
block += "// у грі вони йдуть окремим кошиком «без рівня».\n";
block += "const CEFR_DATA = {\n";
ORDER.forEach((L) => {
  buckets[L].sort();
  block += "  " + L + ': "' + buckets[L].join("|") + '",\n';
});
block += "};\n";
fs.writeFileSync("cefr-block.js", block);
console.log("рівні:", ORDER.map((L) => L + " " + buckets[L].length).join(" · "), "| без рівня:", none);
console.log("розмір блоку:", (fs.statSync("cefr-block.js").size / 1024).toFixed(0) + " КБ");
