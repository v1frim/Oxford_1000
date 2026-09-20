// Тест ПЛАНУВАЛЬНИКА ПОКАЗІВ (сесія 60): інтервали в показах, підлога в днях, ревізія
// «Знаю» з подвоєнням, черга гри з квотою, засів, заморожений борг.
// Запуск: npm i playwright-core && node test-sched.js   (або PW_CORE=... node test-sched.js)
const fs = require("fs"), path = require("path");
const PAGE = "file://" + path.join(__dirname, "index.html");
function chromium(){ for (const t of [process.env.PW_CORE,"playwright-core"].filter(Boolean)) { try { return require(t).chromium; } catch(e){} }
  console.log("⚠️  npm i playwright-core"); process.exit(2); }
function exe(){ const d=fs.readdirSync("/opt/pw-browsers").find(x=>/^chromium-\d/.test(x));
  if(!d){console.log("⚠️  немає Chromium");process.exit(2);} return "/opt/pw-browsers/"+d+"/chrome-linux/chrome"; }

(async () => {
  const b = await chromium().launch({ executablePath: exe(), args:["--no-sandbox"] });
  const p = await b.newPage(); const errs=[];
  p.on("pageerror", e=>errs.push(e.message));
  await p.goto(PAGE); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(1000);
  const ok=[],bad=[]; const t=(n,c,x="")=>(c?ok:bad).push(n+(x?" — "+x:""));
  const within = (v, lo, hi) => typeof v === "number" && v >= lo && v <= hi;

  // 1. хелпери й лічильник показів
  const h = await p.evaluate(() => {
    const before = loadSeen(); const after = bumpSeen();
    return { before, after, stored: localStorage.getItem("oxford_seen_v1"),
      fns: [typeof buildSchedQueue, typeof schedStats, typeof seedSchedForKnown, typeof schedTouch].every(x => x === "function"),
      iv: SCHED_IV, floor: SCHED_DAY_FLOOR, quota: SCHED_NEW_PER_GAME, span: SCHED_QUOTA_SPAN, backup: BACKUP_KEYS.includes("oxford_seen_v1"),
      rnd: Array.from({length: 300}, () => schedRand([100, 200])) };
  });
  t("лічильник показів стартує з 0 і росте", h.before === 0 && h.after === 1 && h.stored === "1", JSON.stringify([h.before, h.after, h.stored]));
  t("функції планувальника на місці", h.fns);
  t("вікно вставки квоти = 5 (гра на 9 слів мусить дійти до квотового)", h.span === 5, String(h.span));
  t("інтервали: 100-200 / 200-400 / 300-500 / 1500-2500", JSON.stringify(h.iv) === JSON.stringify({wrong:[100,200],s1:[200,400],s2:[300,500],rev:[1500,2500]}), JSON.stringify(h.iv));
  t("підлога 2 дні, квота 2 на гру", h.floor === 2 && h.quota === 2);
  t("oxford_seen_v1 у BACKUP_KEYS", h.backup);
  t("schedRand тримається меж [100,200] включно", h.rnd.every(v => v >= 100 && v <= 200) && h.rnd.some(v => v === 100 || v === 200) === (h.rnd.length > 0 && (Math.min(...h.rnd) === 100 || Math.max(...h.rnd) === 200)), String(Math.min(...h.rnd)) + ".." + String(Math.max(...h.rnd)));

  // 2-5. життєвий цикл одного слова у ЗВИЧАЙНІЙ грі: streak і план наступного показу
  const life = await p.evaluate(() => {
    const I = 100, key = wordKey(WORDS[I]);
    localStorage.setItem("oxford_word_mastery_v1", "{}");
    setMode("en-ua");
    const step = (status) => {
      startGame(null, { sched: true });
      currentWordIndex = I; currentWord = WORDS[I]; currentShown = getEn(WORDS[I])[0];
      const seenBefore = loadSeen();
      recordAnswer(status === "correct" ? getUa(WORDS[I])[0] : "хиба", status);
      const rec = loadMastery()[key];
      endGame(true);
      return { seenBefore, seenAfter: loadSeen(), rec, rel: rec.n - (seenBefore + 1), today: todayKey() };
    };
    return { c1: step("correct"), w: step("wrong"), c2: step("correct"), c3: step("correct"), c4: step("correct"),
             r1: step("correct"), r2: step("correct"), rw: step("wrong") };
  });
  const L = life;
  t("правильна відповідь бампає лічильник на 1", L.c1.seenAfter === L.c1.seenBefore + 1);
  t("1-ша правильна: s=1, n у [200,400] від цього показу, d=сьогодні, r=0",
    L.c1.rec.s === 1 && within(L.c1.rel, 200, 400) && L.c1.rec.d === L.c1.today && L.c1.rec.r === 0, JSON.stringify(L.c1.rec));
  t("помилка: s=0, n у [100,200]", L.w.rec.s === 0 && within(L.w.rel, 100, 200), JSON.stringify(L.w.rec));
  t("після помилки перша правильна знову s=1 у [200,400]", L.c2.rec.s === 1 && within(L.c2.rel, 200, 400), JSON.stringify(L.c2.rec));
  t("2-га правильна: s=2, n у [300,500] — інтервал від ЦЬОГО показу, не накопичується",
    L.c3.rec.s === 2 && within(L.c3.rel, 300, 500), JSON.stringify(L.c3.rec));
  t("3-тя правильна: s=3 («Знаю»), ревізія у [1500,2500], r=0",
    L.c4.rec.s === 3 && within(L.c4.rel, 1500, 2500) && L.c4.rec.r === 0, JSON.stringify(L.c4.rec));
  t("успішна ревізія: s лишається 3, r=1, інтервал подвоївся [3000,5000]",
    L.r1.rec.s === 3 && L.r1.rec.r === 1 && within(L.r1.rel, 3000, 5000), JSON.stringify(L.r1.rec));
  t("друга ревізія: r=2, [6000,10000]",
    L.r2.rec.s === 3 && L.r2.rec.r === 2 && within(L.r2.rel, 6000, 10000), JSON.stringify(L.r2.rec));
  t("провалена ревізія: s=0, r=0, назад у [100,200]",
    L.rw.rec.s === 0 && L.rw.rec.r === 0 && within(L.rw.rel, 100, 200), JSON.stringify(L.rw.rec));
  t("лічильники c/w не постраждали від розширення запису", L.rw.rec.c === 6 && L.rw.rec.w === 2, JSON.stringify([L.rw.rec.c, L.rw.rec.w]));

  // 6. повторення після раунду: ні лічильника, ні плану
  const rev = await p.evaluate(() => {
    const I = 101, key = wordKey(WORDS[I]);
    const seenBefore = loadSeen();
    startGame([I, 102]);                                    // activePool → повторення
    currentWordIndex = I; currentWord = WORDS[I]; currentShown = getEn(WORDS[I])[0];
    recordAnswer(getUa(WORDS[I])[0], "correct");
    recordAnswer("хиба", "wrong");
    const rec = loadMastery()[key];
    endGame(true);
    return { seenBefore, seenAfter: loadSeen(), rec };
  });
  t("повторення НЕ бампає лічильник показів", rev.seenAfter === rev.seenBefore, JSON.stringify([rev.seenBefore, rev.seenAfter]));
  t("повторення НЕ створює запис/план", rev.rec === undefined, JSON.stringify(rev.rec));

  // 7. черга гри: прострочені беруться, майбутні — ні, підлога в днях, квота нових у перших 10
  const q = await p.evaluate(() => {
    const dk = off => { const d = new Date(); d.setDate(d.getDate() + off);
      return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); };
    const m = {}, seen = loadSeen(), k = i => wordKey(WORDS[i]);
    for (const i of [10,11,12,13,14]) m[k(i)] = { s: 1, c: 1, w: 0, n: seen - 5, d: "2000-01-01", r: 0 };   // прострочені
    m[k(15)] = { s: 1, c: 1, w: 0, n: seen + 100, d: "2000-01-01", r: 0 };   // ще не час
    m[k(16)] = { s: 1, c: 1, w: 0, n: seen - 5, d: dk(0), r: 0 };            // показане сьогодні
    m[k(17)] = { s: 1, c: 1, w: 0, n: seen - 5, d: dk(-1), r: 0 };           // показане вчора
    m[k(18)] = { s: 1, c: 1, w: 0, n: seen - 5, d: dk(-2), r: 0 };           // позавчора — можна
    m[k(19)] = { s: 0, c: 0, w: 1 };                                          // старе «Вивчаю» без розкладу
    localStorage.setItem("oxford_word_mastery_v1", JSON.stringify(m));
    const pool = []; for (let i = 10; i <= 40; i++) pool.push(i);            // 20..40 — свіжі
    const out = buildSchedQueue(pool);
    const head = out.slice(0, SCHED_QUOTA_SPAN);
    return { out, has: i => out.includes(i), head,
      freshInHead: head.filter(i => i >= 20).length, oldInHead: head.includes(19),
      uniq: new Set(out.map(i => wordKey(WORDS[i]))).size === out.length,
      stats: schedStats(pool) };
  });
  t("прострочені (n ≤ seen) — у черзі", [10,11,12,13,14].every(i => q.out.includes(i)), JSON.stringify(q.out.slice(0,12)));
  t("слово, чий термін не настав — НЕ в черзі", !q.out.includes(15));
  t("показане сьогодні — НЕ в черзі", !q.out.includes(16));
  t("показане вчора — НЕ в черзі", !q.out.includes(17));
  t("показане позавчора — у черзі", q.out.includes(18));
  t("квота: старе «Вивчаю» без розкладу — у перших 5", q.oldInHead, JSON.stringify(q.head));
  t("квота: справді нове слово — у перших 5", q.freshInHead >= 1, JSON.stringify(q.head));
  t("черга ≤ 40 і без дублів ключів", q.out.length <= 40 && q.uniq, String(q.out.length));
  t("schedStats: на сьогодні 6 (5 прострочених + позавчорашнє), ревізій 0, у роботі 10 (усі записи зі streak<3)",
    q.stats.due === 6 && q.stats.rev === 0 && q.stats.active === 10, JSON.stringify(q.stats));

  // 7b. ⚠️ коли планів ще нема, черга добивається СТАРИМ «Вивчаю», а нових рівно квота
  const quotaOnly = await p.evaluate(() => {
    const m = {}, pool = [];
    for (let i = 800; i < 860; i++) { pool.push(i); m[wordKey(WORDS[i])] = { s: 1, c: 1, w: 0 }; }   // 60 старих без розкладу
    for (let i = 860; i < 920; i++) pool.push(i);                                                    // 60 справді нових
    localStorage.setItem("oxford_word_mastery_v1", JSON.stringify(m));
    const runs = [];
    for (let g = 0; g < 8; g++) { const out = buildSchedQueue(pool); runs.push(out.filter(i => i >= 860).length); }
    return { runs, max: Math.max(...runs) };
  });
  t("поки планів нема, нових у черзі рівно квота (1 з 2 слотів)", quotaOnly.max <= 1, JSON.stringify(quotaOnly.runs));

  // 8. найзатриманіші першими: 60 прострочених, черга 40 → беруться 40 найдавніших
  const late = await p.evaluate(() => {
    const m = {}, seen = loadSeen(), pool = [];
    for (let k = 1; k <= 60; k++) { const i = 200 + k; pool.push(i);
      m[wordKey(WORDS[i])] = { s: 1, c: 1, w: 0, n: seen - k, d: "2000-01-01", r: 0 }; }
    localStorage.setItem("oxford_word_mastery_v1", JSON.stringify(m));
    const out = buildSchedQueue(pool);
    return { len: out.length, allLate: out.every(i => i - 200 >= 21), sorted: JSON.stringify(out) === JSON.stringify([...out].sort((a,b)=>a-b)) };
  });
  t("з 60 прострочених беруться 40 найзатриманіших", late.len === 40 && late.allLate, JSON.stringify(late));
  t("порядок у черзі перемішаний (не за затримкою)", !late.sorted);

  // 9. без opts.sched — стара поведінка: шафл усього пулу
  const plain = await p.evaluate(() => {
    const pool = []; for (let i = 300; i < 400; i++) pool.push(i);
    startGame(pool, { timed: true });
    const r = { len: shuffledIndices.length, sched: schedThisGame };
    endGame(true);
    return r;
  });
  t("категорійна гра без sched = повний шафл пулу", plain.len === 100 && plain.sched === false, JSON.stringify(plain));

  // 10. пари з однаковим en (спільний запис) — один показ на ключ
  const pair = await p.evaluate(() => {
    const byKey = new Map(); WORDS.forEach((w, i) => { const k = wordKey(w); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(i); });
    const dup = [...byKey.entries()].find(([k, v]) => v.length > 1);
    if (!dup) return { skip: true };
    const [k, idxs] = dup, seen = loadSeen();
    localStorage.setItem("oxford_word_mastery_v1", JSON.stringify({ [k]: { s: 1, c: 1, w: 0, n: seen - 1, d: "2000-01-01", r: 0 } }));
    const out = buildSchedQueue(idxs);
    return { k, idxs, out, count: out.filter(i => idxs.includes(i)).length };
  });
  t("пара з однаковим en → один показ на ключ", pair.skip || pair.count === 1, JSON.stringify(pair));

  // 11. одноразовий засів ревізій для «Знаю»-слів без розкладу (і старий числовий формат)
  await p.evaluate(() => {
    localStorage.removeItem("oxford_sched_seed_v1");
    localStorage.setItem("oxford_seen_v1", "0");
    localStorage.setItem("oxford_word_mastery_v1", JSON.stringify({
      [wordKey(WORDS[500])]: { s: 3, c: 3, w: 0 },   // «Знаю» без n → засіяти
      [wordKey(WORDS[501])]: 3,                       // старий числовий формат «Знаю» → теж
      [wordKey(WORDS[502])]: { s: 1, c: 1, w: 0 },   // «Вивчаю» без n → НЕ чіпати
    }));
  });
  await p.reload(); await p.waitForTimeout(900);
  const seeded = await p.evaluate(() => { const m = loadMastery();
    return { a: m[wordKey(WORDS[500])], b: m[wordKey(WORDS[501])], c: m[wordKey(WORDS[502])], flag: localStorage.getItem("oxford_sched_seed_v1") }; });
  t("«Знаю» без розкладу дістає ревізію в [0,4000)", within(seeded.a.n, 0, 3999) && seeded.a.s === 3 && seeded.a.c === 3, JSON.stringify(seeded.a));
  t("старий числовий «Знаю» теж засіяно (c/w нулі)", within(seeded.b.n, 0, 3999) && seeded.b.s === 3 && seeded.b.c === 0, JSON.stringify(seeded.b));
  t("«Вивчаю» без розкладу засів НЕ чіпає", seeded.c.n === undefined && seeded.c.s === 1, JSON.stringify(seeded.c));
  t("прапор засіву виставлено", seeded.flag === "1");

  // 12. борг заморожено: не підмішується і не ставиться
  const frozen = await p.evaluate(() => {
    localStorage.setItem("oxford_due_v1", JSON.stringify({ [wordKey(WORDS[3])]: { due: "2000-01-01", waited: 9 } }));
    setMode("en-ua");
    startGame(null, { sched: true });
    const injected = dueThisGame.size;
    currentWordIndex = 7; currentWord = WORDS[7]; currentShown = getEn(WORDS[7])[0];
    recordAnswer("хиба", "wrong");
    const due = JSON.parse(localStorage.getItem("oxford_due_v1"));
    endGame(true);
    return { injected, keys: Object.keys(due) };
  });
  t("борг не підмішується у гру", frozen.injected === 0);
  t("помилка не пише в oxford_due_v1", frozen.keys.length === 1 && !frozen.keys.includes("x"), JSON.stringify(frozen.keys));

  // 13. ua-en: прогрес іде введеному слову, а ПОКАЗАНА картка дістає штамп дня (не завтра)
  const touch = await p.evaluate(() => {
    setMode("ua-en");
    const shown = 600, typed = 601;
    const ks = wordKey(WORDS[shown]), kt = wordKey(WORDS[typed]);
    localStorage.setItem("oxford_word_mastery_v1", JSON.stringify({ [ks]: { s: 1, c: 1, w: 0, n: 999999, d: "2000-01-01", r: 0 } }));
    startGame(null, { sched: true });
    currentWordIndex = shown; currentWord = WORDS[shown]; currentShown = getUa(WORDS[shown])[0];
    recordAnswer(getEn(WORDS[typed])[0], "correct");
    const m = loadMastery(); endGame(true);
    return { shown: m[ks], typed: m[kt], today: todayKey(), same: getUa(WORDS[typed]).includes(getUa(WORDS[shown])[0]) };
  });
  t("введене слово отримало streak і план", touch.same || (touch.typed && touch.typed.s === 1 && typeof touch.typed.n === "number"), JSON.stringify(touch.typed));
  t("показана картка: день оновлено, план n не зрушено", touch.same || (touch.shown.d === touch.today && touch.shown.n === 999999 && touch.shown.s === 1), JSON.stringify(touch.shown));

  // 14. ревізія лише коли «Знаю» є в пулі; не прострочене «Знаю» не береться
  const known = await p.evaluate(() => {
    const seen = loadSeen(), k = i => wordKey(WORDS[i]);
    localStorage.setItem("oxford_word_mastery_v1", JSON.stringify({
      [k(700)]: { s: 3, c: 3, w: 0, n: seen - 1, d: "2000-01-01", r: 0 },     // ревізія настала
      [k(701)]: { s: 3, c: 3, w: 0, n: seen + 999, d: "2000-01-01", r: 0 },   // ще не час
    }));
    const withKnown = buildSchedQueue([700, 701, 702, 703, 704]);
    const noKnown = buildSchedQueue([702, 703, 704]);
    return { a: withKnown.includes(700), b: withKnown.includes(701), c: noKnown.includes(700), stats: schedStats([700, 701, 702]) };
  });
  t("«Знаю» з простроченою ревізією — у черзі повного пулу", known.a);
  t("«Знаю», чий час не настав — ні", !known.b);
  t("у пулі без «Знаю» (📖) ревізій нема", !known.c);
  t("schedStats рахує ревізії окремо", known.stats.rev === 1 && known.stats.due === 0 && known.stats.active === 0, JSON.stringify(known.stats));

  // 15. плашка під кнопкою старту
  const banner = await p.evaluate(() => { renderStartSub(); const el = document.getElementById("due-banner");
    return { hidden: el.classList.contains("hidden"), text: el.textContent }; });
  t("плашка показує план по набору", !banner.hidden && /На сьогодні .* · ревізій \d+ · у роботі \d+/.test(banner.text), banner.text);

  // 16. живий прогін: гра з планувальником крутить nextWord без помилок
  const live = await p.evaluate(() => {
    setMode("en-ua");
    startGame(null, { sched: true });
    const seq = [currentWordIndex]; for (let i = 0; i < 20; i++) { nextWord(); seq.push(currentWordIndex); }
    const r = { len: shuffledIndices.length, ok: seq.every(i => typeof i === "number" && WORDS[i]) };
    endGame(true); return r;
  });
  t("живий прогін 21 слова без помилок; черга = 40 + 2 квотові", live.ok && live.len === 42, JSON.stringify(live));

  await b.close();
  console.log(`\n✅ ${ok.length} ok, ❌ ${bad.length} bad, console errors: ${errs.length}`);
  bad.forEach(x => console.log("  ❌ " + x));
  errs.forEach(x => console.log("  ⚠️ " + x));
  process.exit(bad.length || errs.length ? 1 : 0);
})();
