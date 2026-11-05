#!/usr/bin/env node
// gt-audit.js — збирає переклади Google (той самий запит, що й Alt+Q у грі) для ВСІХ карток словника,
// щоб звірити їх із нашими відповідями. Запускати ЛОКАЛЬНО (у хмарному контейнері Google ставить капчу).
//
//   node audit/gt-audit.js
//
// • Потрібен Node 18+ (вбудований fetch). Нічого встановлювати не треба.
// • Пише в audit/gt-cache.jsonl, РЕЗЮМОВАНО: можна перервати Ctrl+C і запустити знову — продовжить з місця.
// • Якщо Google почне відмовляти (429/капча) — сам чекає 2 хв і пробує знову.
// • Коли напише «ГОТОВО» — закомить і запуш audit/gt-cache.jsonl, далі розбирає Claude.
const fs = require("fs"), path = require("path");
const OUT = path.join(__dirname, "gt-cache.jsonl");
const src = fs.readFileSync(path.join(__dirname, "..", "dict.js"), "utf8");
const WORDS = new Function(src + "; return WORDS;")();
const bare = u => String(u).replace(/\s*\([^)]*\)/g, "").trim();

const done = new Set();
if (fs.existsSync(OUT)) for (const l of fs.readFileSync(OUT, "utf8").split("\n")) if (l) { try { const o = JSON.parse(l); done.add(o.sl + "|" + o.q); } catch (e) {} }
const jobs = [], seen = new Set();
for (const w of WORDS) {
  for (const u of [].concat(w.ua)) { const q = bare(u), k = "uk|" + q; if (q && !seen.has(k)) { seen.add(k); if (!done.has(k)) jobs.push(["uk", "en", q]); } }
  for (const q of [].concat(w.en)) { const k = "en|" + q; if (!seen.has(k)) { seen.add(k); if (!done.has(k)) jobs.push(["en", "uk", q]); } }
}
console.log(`Вже є: ${done.size}. Лишилось зібрати: ${jobs.length}.`);
if (!jobs.length) { console.log("ГОТОВО — усе зібрано. Закомить і запуш audit/gt-cache.jsonl"); process.exit(0); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
let i = 0, ok = 0, pauseUntil = 0;
async function one([sl, tl, q]) {
  for (;;) {
    const wait = pauseUntil - Date.now(); if (wait > 0) await sleep(wait);
    try {
      const r = await fetch("https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dt=bd&sl=" + sl + "&tl=" + tl +
        "&q=" + encodeURIComponent(q), { signal: AbortSignal.timeout(20000) });
      const txt = await r.text();
      if (r.status !== 200 || txt[0] !== "[") {          // 429 / капча / збій
        if (pauseUntil < Date.now()) { pauseUntil = Date.now() + 120000; console.log(`  Google просить паузу (${r.status}) — чекаю 2 хв…`); }
        continue;
      }
      const j = JSON.parse(txt);
      const main = (j[0] || []).map(x => x && x[0] || "").join("").trim();
      const bd = (j[1] || []).map(p => [p[0], (p[1] || []).slice(0, 8)]);
      fs.appendFileSync(OUT, JSON.stringify({ sl, q, main, bd }) + "\n"); ok++; return;
    } catch (e) { await sleep(3000); }
  }
}
async function worker() { while (i < jobs.length) { const j = jobs[i++]; await one(j); await sleep(250); } }
const t0 = Date.now();
const iv = setInterval(() => {
  const m = (Date.now() - t0) / 60000, rate = ok / Math.max(m, 0.01);
  console.log(`${ok}/${jobs.length}  (~${Math.round(rate)}/хв, лишилось ~${Math.round((jobs.length - ok) / Math.max(rate, 1))} хв)`);
}, 20000);
Promise.all([worker(), worker(), worker()]).then(() => {
  clearInterval(iv);
  console.log("ГОТОВО — усе зібрано. Тепер: git add audit/gt-cache.jsonl && git commit -m \"gt-cache\" && git push");
});
