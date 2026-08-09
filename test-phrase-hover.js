// Тест ФРАЗОВОГО ХОВЕРА в прикладних реченнях (сесія 45).
// Привід: «work out разом це тренування, а тут цього не вказано» — wrapSentence
// розбирала речення послівно, тож «worked out» показувалось як «працювати».
//
// ⚠️ Головна перевірка тут — №3: рендер НЕ СМІЄ втрачати ані символу тексту.
// Вона проганяє всі 8600+ прикладів; якщо фразовий розбір колись з'їсть пробіл
// чи пунктуацію, це впаде одразу.
//
// Запуск: npm i playwright-core && node test-phrase-hover.js  (або PW_CORE=... node …)
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
  await p.goto(PAGE); await p.waitForTimeout(1200);
  const ok=[],bad=[]; const t=(n,c,x="")=>(c?ok:bad).push(n+(x?" — "+x:""));

  // 1. привід: «worked out» склеюється і показує значення ФРАЗИ, а не слова work
  const slim = await p.evaluate(() => {
    const d = document.createElement("div"); d.innerHTML = wrapSentence(EXAMPLES["slim"]);
    const ph = [...d.querySelectorAll("[data-phrase]")];
    return { n: ph.length, text: ph[0] && ph[0].textContent, trans: ph[0] && ph[0].dataset.trans,
             sentence: EXAMPLES["slim"] };
  });
  t("«worked out» склеєно в один спан", slim.n === 1 && slim.text === "worked out", JSON.stringify(slim));
  t("показує значення фрази, а не «працювати»", slim.trans === "тренуватися", String(slim.trans));

  // 2. інші типові фрази: дієслівні, іменникові, багатослівна картка
  const others = await p.evaluate(() => {
    const get = key => { const d = document.createElement("div"); d.innerHTML = wrapSentence(EXAMPLES[key]);
      return [...d.querySelectorAll("[data-phrase]")].map(s => s.textContent + "⇒" + s.dataset.trans); };
    return { sit: get("sit"), nurse: get("nurse"), ac: get("air conditioner") };
  });
  t("«sit down» склеєно", /sit down⇒сідати/.test(others.sit.join()), others.sit.join());
  t("«blood pressure» склеєно", /blood pressure⇒/.test(others.nurse.join()), others.nurse.join());
  t("багатослівна картка склеєна", /air conditioner⇒кондиціонер/.test(others.ac.join()), others.ac.join());

  // 3. ⚠️ ІНВАРІАНТ: жодного втраченого символу в УСІХ прикладах
  const corpus = await p.evaluate(() => {
    const d = document.createElement("div");
    let broken = [], phrases = 0, noTrans = 0;
    for (const [k, s] of Object.entries(EXAMPLES)) {
      d.innerHTML = wrapSentence(s);
      if (d.textContent !== s) broken.push(k);
      d.querySelectorAll("[data-phrase]").forEach(sp => {
        phrases++;
        if (!sp.dataset.trans) noTrans++;
      });
    }
    return { total: Object.keys(EXAMPLES).length, broken: broken.slice(0, 5), brokenN: broken.length, phrases, noTrans };
  });
  t("рендер не втрачає тексту в жодному прикладі", corpus.brokenN === 0,
    corpus.brokenN + " шт: " + corpus.broken.join(", "));
  t("фрази реально знаходяться в корпусі", corpus.phrases > 300, String(corpus.phrases));
  t("кожен фразовий спан має переклад", corpus.noTrans === 0, String(corpus.noTrans));

  // 4. ⚠️ СПИСОК-ВИНЯТОК: там, де частка насправді прийменник, склейки НЕ буде
  const skip = await p.evaluate(() => {
    const count = s => { const d = document.createElement("div"); d.innerHTML = wrapSentence(s);
      return d.querySelectorAll("[data-phrase]").length; };
    return {
      sleepIn: count("The horses sleep in the barn."),
      stickTo: count("Nougat sticks to the teeth."),
      moveIn:  count("The rook moves in straight lines."),
      goThrough: count("The lace goes through each eyelet."),
      // контроль: справжня фраза поза списком склеюється
      real: count("Please turn on the lamp."),
    };
  });
  t("«sleep in» (буквально) не склеєно", skip.sleepIn === 0, String(skip.sleepIn));
  t("«sticks to» (буквально) не склеєно", skip.stickTo === 0, String(skip.stickTo));
  t("«moves in» (буквально) не склеєно", skip.moveIn === 0, String(skip.moveIn));
  t("«goes through» (буквально) не склеєно", skip.goThrough === 0, String(skip.goThrough));
  t("контроль: «turn on» склеюється", skip.real === 1, String(skip.real));

  // 5. фраза не перестрибує через пунктуацію й не чіпає сусідні слова
  const bounds = await p.evaluate(() => {
    const spans = s => { const d = document.createElement("div"); d.innerHTML = wrapSentence(s);
      return [...d.querySelectorAll("[data-phrase]")].map(x => x.textContent); };
    return {
      comma: spans("Sit, down there."),        // кома між словами → НЕ фраза
      normal: spans("Sit down there."),
      dash: spans("Wake up — you'll be late!"),
    };
  });
  t("кома між словами розриває фразу", bounds.comma.length === 0, JSON.stringify(bounds.comma));
  t("без коми та сама пара склеюється", bounds.normal.join() === "Sit down", JSON.stringify(bounds.normal));
  t("тире після фрази не потрапляє в спан", bounds.dash.join() === "Wake up", JSON.stringify(bounds.dash));

  // 6. TTS: клік по фразі озвучує фразу цілком (текст спана з пробілом усередині)
  const tts = await p.evaluate(() => {
    const d = document.createElement("div"); d.innerHTML = wrapSentence("Please turn on the lamp.");
    const sp = d.querySelector("[data-phrase]");
    return { text: sp && sp.textContent, hasClass: sp && sp.classList.contains("hw") };
  });
  t("фразовий спан лишається .hw (клік = TTS, наведення = тултіп)", tts.hasClass === true);
  t("озвучиться саме фраза", tts.text === "turn on", String(tts.text));

  console.log("✅ " + ok.length + " перевірок пройдено");
  if (bad.length) console.log("❌ ПРОВАЛЕНО:\n - " + bad.join("\n - "));
  console.log(errs.length ? "❌ " + errs.slice(0,3).join(" | ") : "✅ 0 помилок консолі");
  await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
