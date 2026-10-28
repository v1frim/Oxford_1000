// Тест міграції XP formula_v18 (сесія 64): нові ставки під ~5 XP/хв, перерахунок усієї історії, окреме поле
// дня `arenaKill`, відновлене з журналу походів (арена 2 XP, post-game повторення 5 XP).
// Запуск: npm i playwright-core && node test-xp18.js
const fs = require("fs"), path = require("path");
const PAGE = "file://" + path.join(__dirname, "index.html");
function chromium(){ for (const t of [process.env.PW_CORE,"playwright-core"].filter(Boolean)) { try { return require(t).chromium; } catch(e){} }
  console.log("⚠️  npm i playwright-core"); process.exit(2); }
function exe(){ const d=fs.readdirSync("/opt/pw-browsers").find(x=>/^chromium-\d/.test(x));
  if(!d){console.log("⚠️  немає Chromium");process.exit(2);} return "/opt/pw-browsers/"+d+"/chrome-linux/chrome"; }

(async () => {
  const b = await chromium().launch({ executablePath: process.env.PW_CHROME || exe(), args:["--no-sandbox"] });
  const p = await b.newPage({ viewport:{width:1500,height:900} }); const errs=[];
  p.on("pageerror", e=>errs.push(e.message));
  p.on("console", m=>{ if (m.type()==="error") errs.push(m.text()); });
  const ok=[],bad=[]; const t=(n,c,x="")=>(c?ok:bad).push(n+(x?" — "+x:""));
  const D = "2026-09-10";
  await p.goto(PAGE);
  await p.evaluate(D => {
    localStorage.clear();
    const ts = new Date(D + "T15:00:00").getTime();
    localStorage.setItem("oxford_days_v1", JSON.stringify({ [D]: { correct: 10, wrong: 3, skipped: 0, games: 2, reviewCorrect: 6, questDrill: 2, questDrill2: 1, quests: 1 } }));
    localStorage.setItem("oxford_quest_log_v1", JSON.stringify([{ ts, won: 3, fled: 2, monsters: [], arena: [{ w: "a", tries: 3 }, { w: "b", tries: 4 }] }]));
    localStorage.setItem("oxford_duolingo_v1", JSON.stringify({ [D]: 1 }));
    localStorage.setItem("oxford_lingohut_v1", JSON.stringify({ 5: D, 40: D, 80: D }));
    localStorage.setItem("oxford_gpt_v1", JSON.stringify({ [D]: 2 }));
    localStorage.setItem("oxford_song_sessions_v1", JSON.stringify({ [D]: 1 }));
    localStorage.setItem("oxford_movies_v1", JSON.stringify({ [D]: 1 }));
    localStorage.setItem("oxford_expr_xp_v1", JSON.stringify({ [D]: { r: 3, k: 1 } }));
    localStorage.setItem("oxford_xp_v1", "999");
  }, D);
  await p.reload(); await p.waitForTimeout(1200);
  const r = await p.evaluate(D => ({ xp: loadXp(), day: JSON.parse(localStorage.getItem("oxford_xp_day_v1") || "{}")[D],
    ak: loadDays()[D].arenaKill, rc: loadDays()[D].reviewCorrect, flag: localStorage.getItem("oxford_xp_formula_v18"), flag19: localStorage.getItem("oxford_xp_formula_v19"),
    before: localStorage.getItem("oxford_xp_before_v18") }), D);
  // 10 відповідей + (6−2)×5 повторення + 2×2 арена + (2+1)×5 вивчені в поході + 25 Duolingo + 25+30+35 LingoHut
  // + 2×17 GPT + 75 пісні + 75 кіно + 3×1+1×3 вирази (v19) = 354
  t("arenaKill дня відновлено з журналу походів (2), reviewCorrect не чіпали", r.ak === 2 && r.rc === 6, JSON.stringify(r));
  t("XP дня перераховано новими ставками = 354 (v19: вирази 1/3)", r.day === 354, JSON.stringify(r));
  t("загальний XP = сума днів (354), прапори v18 і v19 стоять", r.xp === 354 && r.flag === "1" && r.flag19 === "1", JSON.stringify(r));
  // ідемпотентність: повторне завантаження нічого не міняє
  await p.reload(); await p.waitForTimeout(900);
  t("повторне завантаження не перераховує вдруге", await p.evaluate(() => loadXp()) === 354);
  // живі ставки збігаються з формулою
  const live = await p.evaluate(() => ({ gpt: GPT_XP, song: SONGSESS_XP, movie: MOVIE_XP, lh: [getLhXp(1), getLhXp(50), getLhXp(100)].join("/"),
    card: EXPR_CARD_XP, know: EXPR_KNOW_XP, drill: QUEST_DRILL_XP, rev: REVIEW_WORD_XP, arena: ARENA_KILL_XP, duo: DUO_XP }));
  t("ставки: GPT 17 · пісні 75 · кіно 75 · LingoHut 25/30/35 · картка 1 · «Знаю» 3 · вивчене 5 · повторення 5 · арена 2 · Duolingo 25",
    live.gpt === 17 && live.song === 75 && live.movie === 75 && live.lh === "25/30/35" && live.card === 1 && live.know === 3 &&
    live.drill === 5 && live.rev === 5 && live.arena === 2 && live.duo === 25, JSON.stringify(live));

  console.log(bad.length ? "❌ ПРОВАЛЕНО:\n  " + bad.join("\n  ") : "✅ " + ok.length + " перевірок пройдено");
  console.log(errs.length ? "❌ помилки консолі:\n  " + errs.join("\n  ") : "✅ 0 помилок консолі");
  await b.close();
  process.exit(bad.length || errs.length ? 1 : 0);
})();
