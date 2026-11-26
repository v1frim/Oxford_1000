#!/usr/bin/env node
// defs-add.js — дописує тлумачення / синоніми / антоніми НАЯВНИМ словам (сесія 77, крок 4 плану).
// (Нові картки — через add-batch.js з полями def/syn/ant.)
//
//   node defs-add.js batch.json [--replace] ["коментар-роздільник"]
//     batch.json = [{"en":"dog","def":"…","syn":[..],"ant":[..]}, ...]   — будь-яке з полів def/syn/ant
//     en — ГОЛОВНЕ en картки (getEn(w)[0]), саме так його шукає гра.
//   Ключ, що вже є, пропускається (і друкується); --replace — переписати його рядок на місці.
//   Відхиляє (нічого не пише): en не з WORDS, тлумачення з самим словом/коренем (check-defs.leaks),
//   порожні syn/ant, syn/ant, що збігаються з самим словом.
// ⚠️ Після — ./verify.sh і `node check-defs.js --stats` (звіт партії — таблицею по рівнях CEFR).

const fs = require("fs"), path = require("path");
const { leaks } = require("./check-defs.js");
const P = path.join(__dirname, "dict.js");
const args = process.argv.slice(2), REPL = args.includes("--replace");
const [file, note] = args.filter(a => a !== "--replace");
const B = JSON.parse(fs.readFileSync(file, "utf8"));
let L = fs.readFileSync(P, "utf8").split("\n");
const D = new Function(L.join("\n") + ";return {WORDS};")();
const enKeys = new Set(D.WORDS.map(w => String(Array.isArray(w.en) ? w.en[0] : w.en)));
const q = s => JSON.stringify(s);

const errs = [];
for (const d of B) {
  if (!enKeys.has(d.en)) errs.push(d.en + " — нема картки з таким головним en");
  if (d.def != null && (typeof d.def !== "string" || !d.def.trim())) errs.push(d.en + " — порожнє def");
  if (d.def && leaks(d.en, d.def)) errs.push(d.en + " — def містить слово/корінь: «" + d.def + "»");
  for (const f of ["syn", "ant"]) if (d[f] != null) {
    if (!Array.isArray(d[f]) || !d[f].length || d[f].some(x => typeof x !== "string" || !x.trim())) errs.push(d.en + " — " + f + " має бути непорожнім масивом рядків");
    else if (d[f].some(x => x.toLowerCase() === d.en.toLowerCase().replace(/^to /, ""))) errs.push(d.en + " — " + f + " містить саме слово");
  }
}
const dupIn = B.map(d => d.en).filter((x, i, a) => a.indexOf(x) !== i);
if (dupIn.length) errs.push("дублі в партії: " + [...new Set(dupIn)].join(", "));
if (errs.length) { console.log("❌ нічого не записано:\n  " + errs.join("\n  ")); process.exit(1); }

const stat = {};
for (const [BL, f, v] of [["DEFS", "def", q], ["SYNS", "syn", a => "[" + a.map(q).join(",") + "]"], ["ANTS", "ant", a => "[" + a.map(q).join(",") + "]"]]) {
  const st = stat[BL] = { add: 0, repl: 0, skip: [] };
  const s = L.findIndex(x => x === "const " + BL + " = {");
  if (s < 0) throw Error("нема блоку " + BL);
  const add = [];
  for (const d of B) {
    if (d[f] == null) continue;
    let e = s + 1; while (L[e] !== "};") e++;
    const i = L.slice(s + 1, e).findIndex(x => x.startsWith("  " + q(d.en) + ":"));
    if (i >= 0) {
      if (!REPL) { st.skip.push(d.en); continue; }
      const ln = s + 1 + i, comma = /,\s*$/.test(L[ln]);
      L[ln] = "  " + q(d.en) + ":" + v(d[f]) + (comma ? "," : ""); st.repl++;
    } else { add.push("  " + q(d.en) + ":" + v(d[f]) + ","); st.add++; }
  }
  if (!add.length) continue;
  let e = s + 1; while (L[e] !== "};") e++;
  let k = e - 1; while (k > s && /^\s*(\/\/.*)?$/.test(L[k])) k--;     // останній запис (не коментар)
  if (k > s && !/,\s*$/.test(L[k]) && !L[k].endsWith("{")) L[k] += ",";
  add[add.length - 1] = add[add.length - 1].replace(/,$/, "");
  L.splice(e, 0, ...(note ? ["  // ── " + note + " ──"] : []), ...add);
}
fs.writeFileSync(P, L.join("\n"));
for (const k in stat) console.log(k + ": +" + stat[k].add + (stat[k].repl ? " · переписано " + stat[k].repl : "") + (stat[k].skip.length ? " · уже є (пропущено): " + stat[k].skip.join(", ") : ""));
