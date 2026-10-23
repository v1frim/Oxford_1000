// Тест «🎮 Світ слів» — три прототипи (🌱 сад / 🧙 герой / 🏙️ місто), сесія 61.
// Запуск: npm i playwright-core && node test-world.js
const fs = require("fs"), path = require("path");
const PAGE = "file://" + path.join(__dirname, "index.html");
function chromium(){ for (const t of [process.env.PW_CORE,"playwright-core"].filter(Boolean)) { try { return require(t).chromium; } catch(e){} }
  console.log("⚠️  npm i playwright-core"); process.exit(2); }
function exe(){ const d=fs.readdirSync("/opt/pw-browsers").find(x=>/^chromium-\d/.test(x));
  if(!d){console.log("⚠️  немає Chromium");process.exit(2);} return "/opt/pw-browsers/"+d+"/chrome-linux/chrome"; }

(async () => {
  const b = await chromium().launch({ executablePath: exe(), args:["--no-sandbox"] });
  const p = await b.newPage({ viewport:{width:1500,height:1000} }); const errs=[];
  p.on("pageerror", e=>errs.push(e.message));
  p.on("console", m=>{ if (m.type()==="error") errs.push(m.text()); });
  await p.goto(PAGE); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  const ok=[],bad=[]; const t=(n,c,x="")=>(c?ok:bad).push(n+(x?" — "+x:""));

  // Сід: рівно 45 слів A1 у «Знаю» (2 рослини + 5 до третьої), 7 A1 «Вивчаю», 30 B1 у «Знаю»;
  // активність — лише 3 дні тому (сад має в'янути). Сьогоднішніх занять нема.
  const seed = await p.evaluate(() => {
    const keysOf = L => { const out = [], seen = new Set();
      for (const w of WORDS) { const k = wordKey(w); if (seen.has(k)) continue; seen.add(k); if (cefrLevelOf(w) === L) out.push(k); }
      return out; };
    const a1 = keysOf("A1"), b1 = keysOf("B1"), m = {};
    a1.slice(0, 45).forEach(k => m[k] = { s: 3, c: 3, w: 0 });
    a1.slice(45, 52).forEach(k => m[k] = { s: 1, c: 1, w: 0 });
    b1.slice(0, 30).forEach(k => m[k] = { s: 3, c: 3, w: 0 });
    localStorage.setItem("oxford_word_mastery_v1", JSON.stringify(m));
    const d = new Date(); d.setDate(d.getDate() - 3);
    const k3 = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    localStorage.setItem("oxford_days_v1", JSON.stringify({ [k3]: { games: 2, correct: 10, wrong: 3, skipped: 0 } }));
    // остання гра перевела в «Знаю» 6 слів A1 (39 → 45: перетнула межу 40 = друга рослина) і 1 слово B1
    localStorage.setItem("oxford_last_game_trans_v1", JSON.stringify({ date: k3, k: a1.slice(39, 45).concat([b1[29]]), l: [] }));
    localStorage.setItem("oxford_xp_v1", "0");
    return { a1Total: a1.length, b1Total: b1.length };
  });
  await p.reload(); await p.waitForTimeout(1200);

  // 1. Кнопка і відкриття
  t("кнопка «🌱 Світ слів» у лівому стовпчику", await p.isVisible("#bottom-left-btns #world-btn"));
  t("оверлей світу спершу закритий", !(await p.isVisible("#world-overlay")));
  await p.click("#world-btn"); await p.waitForTimeout(300);
  t("клік відкриває оверлей", await p.isVisible("#world-overlay"));
  const tabs = await p.$$eval(".w-tab", bs => bs.map(x => x.dataset.wtab));
  t("три прототипи: сад, герой, місто", tabs.join() === "garden,hero,city", tabs.join());
  t("стартова вкладка — 🌱 Сад", await p.$eval(".w-tab.active", x => x.dataset.wtab) === "garden");

  // 2. Сад: грядка A1 — 2 рослини, паросток, «ще 15 слів»; дані = бейдж «Знаю»
  const g = await p.evaluate(() => {
    const bed = document.querySelector('.g-bed[data-lv="A1"]');
    return {
      plants: bed.querySelectorAll(".g-p").length, sprouts: bed.querySelectorAll(".g-s").length,
      cells: bed.querySelectorAll(".g-cells i").length, head: bed.querySelector(".g-n").textContent,
      fresh: bed.querySelectorAll(".g-new").length,
      lastA1: bed.querySelector(".g-head").textContent, lastB1: document.querySelector('.g-bed[data-lv="B1"] .g-head').textContent,
      dry: document.querySelector(".garden").classList.contains("dry"),
      banner: document.querySelector(".garden .w-banner").textContent,
      badge: document.querySelector('#mastery-stats [data-cat="known"]').textContent,
      known: worldData().known
    };
  });
  t("A1: 45 слів у «Знаю» = 2 рослини", g.plants === 2, String(g.plants));
  t("A1: решта (5 знаю + 7 вивчаю) = 1 паросток", g.sprouts === 1, String(g.sprouts));
  t("A1: місць на грядці = ⌈слів рівня / 20⌉", g.cells === Math.ceil(seed.a1Total / 20), g.cells + " / " + seed.a1Total);
  t("A1: до нової рослини ще 15 слів", /ще 15 слів до нової рослини/.test(g.head), g.head);
  t("світ рахує «Знаю» так само, як бейдж меню", g.badge.includes(String(g.known)) && g.known === 75, g.badge + " / " + g.known);
  t("остання гра: «✨ +6» на A1 і «✨ +1» на B1", /\+6 з останньої гри/.test(g.lastA1) && /\+1 з останньої гри/.test(g.lastB1), g.lastA1 + " | " + g.lastB1);
  t("остання гра добудувала другу рослину → підсвічена саме одна", g.fresh === 1, String(g.fresh));
  t("3 дні без занять → сад в'яне", g.dry && /сохне/.test(g.banner), g.banner);

  // 3. Tab гортає прототипи, Shift+Tab — назад; Enter НЕ відкриває «Тренування» позаду
  await p.keyboard.press("Tab"); await p.waitForTimeout(200);
  t("Tab → 🧙 Герой", await p.$eval(".w-tab.active", x => x.dataset.wtab) === "hero");
  const hero = await p.evaluate(() => ({
    cls: document.querySelector(".h-cls").textContent,
    locked: document.querySelectorAll(".h-item.locked").length, items: document.querySelectorAll(".h-item").length,
    gearOk: HERO_GEAR.every((gg, i) => document.querySelectorAll(".h-item")[i].classList.contains("locked") === (worldAchLevel(gg.ach) === 0)),
    tired: /Втома/.test(document.querySelector(".h-buffs").textContent)
  }));
  t("0 XP → клас «Новачок»", hero.cls === "Новачок", hero.cls);
  t("8 предметів спорядження", hero.items === 8, String(hero.items));
  t("замкнені предмети = ачівки без ліги", hero.gearOk, hero.locked + " замкнено");
  t("пропуски → стан «Втома»", hero.tired);
  await p.keyboard.press("Tab"); await p.waitForTimeout(200);
  t("Tab → 🏙️ Місто", await p.$eval(".w-tab.active", x => x.dataset.wtab) === "city");
  t("3 дні без занять → місто спить (темне)", await p.$eval(".city", x => x.classList.contains("dark")));
  const cityA1 = await p.evaluate(() => {
    const row = document.querySelector('.c-row[data-lv="A1"]');
    return { built: row.querySelectorAll(".c-b.built").length, slots: row.querySelectorAll(".c-b").length,
             cons: row.querySelectorAll(".c-b.build").length };
  });
  // A1: 24 будинки, будинок = ⌈A1/24⌉ слів; 45 знаю → 1 будинок + 1 на будові
  const per = Math.ceil(seed.a1Total / 24);
  t("місто: квартал A1 — 24 ділянки", cityA1.slots === 24, String(cityA1.slots));
  t("місто: будинків A1 = ⌊45 / слів-на-будинок⌋", cityA1.built === Math.floor(45 / per), cityA1.built + " (по " + per + ")");
  t("місто: неповний будинок — на будові", cityA1.cons === (45 % per ? 1 : 0), String(cityA1.cons));
  await p.keyboard.press("Shift+Tab"); await p.waitForTimeout(200);
  t("Shift+Tab → назад на 🧙 Герой", await p.$eval(".w-tab.active", x => x.dataset.wtab) === "hero");
  await p.keyboard.press("Enter"); await p.waitForTimeout(250);
  t("Enter у світі НЕ відкриває «Тренування»", !(await p.isVisible("#train-modal")));
  await p.click('[data-wtab="city"]'); await p.waitForTimeout(200);
  t("клік по вкладці перемикає прототип", await p.$eval(".w-tab.active", x => x.dataset.wtab) === "city");
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  t("Esc закриває світ", !(await p.isVisible("#world-overlay")));
  await p.keyboard.press("Enter"); await p.waitForTimeout(250);
  t("після закриття Enter знову відкриває «Тренування»", await p.isVisible("#train-modal"));
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);

  // 4. Вкладка запам'ятовується; гра сьогодні «поливає» сад і запалює місто
  await p.evaluate(() => {
    const days = JSON.parse(localStorage.getItem("oxford_days_v1"));
    days[todayKey()] = { games: 1, correct: 5, wrong: 1, skipped: 0 };
    localStorage.setItem("oxford_days_v1", JSON.stringify(days));
    localStorage.setItem("oxford_xp_v1", "61000");
  });
  await p.reload(); await p.waitForTimeout(1200);
  await p.click("#world-btn"); await p.waitForTimeout(300);
  t("обрана вкладка пам'ятається після перезавантаження", await p.$eval(".w-tab.active", x => x.dataset.wtab) === "city");
  t("гра сьогодні → місто сяє", await p.$eval(".city", x => x.classList.contains("lit")));
  await p.click('[data-wtab="garden"]'); await p.waitForTimeout(200);
  const g2 = await p.evaluate(() => ({ dry: document.querySelector(".garden").classList.contains("dry"),
    banner: document.querySelector(".garden .w-banner").textContent }));
  t("гра сьогодні → сад полито, не в'яне", !g2.dry && /Полито сьогодні/.test(g2.banner), g2.banner);
  await p.click('[data-wtab="hero"]'); await p.waitForTimeout(200);
  t("61 000 XP (рівень 11) → клас «Мандрівник»", await p.$eval(".h-cls", x => x.textContent) === "Мандрівник");
  // клік по фону закриває
  await p.mouse.click(10, 500); await p.waitForTimeout(200);
  t("клік по фону закриває світ", !(await p.isVisible("#world-overlay")));

  console.log(bad.length ? "❌ ПРОВАЛЕНО:\n  " + bad.join("\n  ") : "✅ " + ok.length + " перевірок пройдено");
  console.log(errs.length ? "❌ помилки консолі:\n  " + errs.join("\n  ") : "✅ 0 помилок консолі");
  await b.close();
  process.exit(bad.length || errs.length ? 1 : 0);
})();
