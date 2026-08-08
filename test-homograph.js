// Тест пар з ОДНАКОВИМ англійським словом (сесія 45, привід «match»).
// Правило: в US→UA промпт — саме англійське слово, тож він не каже, який сенс питають →
// приймається глос БУДЬ-ЯКОЇ картки пари. UA→US лишається розведеним (промпт український).
// Запуск: npm i playwright-core && node test-homograph.js   (або PW_CORE=... node test-homograph.js)
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

  // Хелпер: поставити конкретну картку і спитати isCorrect у заданому напрямку.
  const ask = (en, ua, dir, input) => p.evaluate(([en, ua, dir, input]) => {
    const i = WORDS.findIndex(w => getEn(w)[0] === en && getUa(w)[0] === ua);
    if (i < 0) return "НЕМА КАРТКИ " + en + "=" + ua;
    currentWordIndex = i; currentWord = WORDS[i];
    mode = dir;
    currentShown = dir === "en-ua" ? getEn(currentWord)[0] : getUa(currentWord)[0];
    return isCorrect(input);
  }, [en, ua, dir, input]);

  // 1. привід: картка «сірник», відповідь «матч» (і навпаки)
  t("US→UA: сірник ← «матч» зараховано", await ask("match","сірник","en-ua","матч") === true);
  t("US→UA: матч ← «сірник» зараховано", await ask("match","матч","en-ua","сірник") === true);
  t("US→UA: власний глос як і був", await ask("match","сірник","en-ua","сірник") === true);

  // 2. те саме на інших парах (різні типи омонімії)
  t("US→UA: cool ← «крутий»", await ask("cool","прохолодний","en-ua","крутий") === true);
  t("US→UA: bank ← «берег»",  await ask("bank","банк","en-ua","берег") === true);
  t("US→UA: light ← «світлий»", await ask("light","легкий","en-ua","світлий") === true);
  t("US→UA: tip ← «порада»",  await ask("tip","чайові","en-ua","порада") === true);

  // 3. НЕ приймається чужий глос (слово з іншим ключем) — правило не «все підряд»
  t("US→UA: cool ← «чудовий» НЕ зараховано", await ask("cool","прохолодний","en-ua","чудовий") === false);
  t("US→UA: match ← «гра» НЕ зараховано",    await ask("match","матч","en-ua","гра") === false);

  // 4. ⚠️ UA→US НЕ зачеплено: сенси пар лишаються розведеними
  const uaEn = await p.evaluate(() => {
    const out = {};
    const set = (en, ua) => { const i = WORDS.findIndex(w => getEn(w)[0]===en && getUa(w)[0]===ua);
      currentWordIndex = i; currentWord = WORDS[i]; mode = "ua-en"; currentShown = getUa(currentWord)[0]; };
    set("match","сірник"); out.matchOk = isCorrect("match");
    set("cool","крутий");  out.coolOk  = isCorrect("cool");
    return out;
  });
  t("UA→US: «сірник» приймає match", uaEn.matchOk === true);
  t("UA→US: «крутий» приймає cool",  uaEn.coolOk === true);

  // 5. регресія gorgeous (сесія 30): uaAlt НЕ тече в UA→US. «чудовий» лежить у власному
  // uaAlt слова gorgeous, тож у US→UA він приймається (так і має бути) — а от промпт
  // «розкішний» у зворотному напрямку НЕ сміє приймати wonderful/lovely/stunning.
  t("US→UA: gorgeous ← «чудовий» (власний uaAlt) зараховано",
    await ask("gorgeous","розкішний","en-ua","чудовий") === true);
  const leak = await p.evaluate(() => {
    const i = WORDS.findIndex(w => getEn(w)[0]==="gorgeous");
    currentWordIndex = i; currentWord = WORDS[i]; mode = "ua-en"; currentShown = getUa(currentWord)[0];
    return { own: isCorrect("gorgeous"), wonderful: isCorrect("wonderful"), lovely: isCorrect("lovely") };
  });
  t("UA→US: «розкішний» приймає gorgeous", leak.own === true);
  t("UA→US: uaAlt не тече — wonderful/lovely НЕ зараховані",
    leak.wonderful === false && leak.lovely === false, JSON.stringify(leak));

  // 6. пари ділять один mastery-ключ → streak іде в те саме місце (тому напрям не важить)
  const sameKey = await p.evaluate(() => {
    const a = WORDS.find(w => getEn(w)[0]==="match" && getUa(w)[0]==="матч");
    const c = WORDS.find(w => getEn(w)[0]==="match" && getUa(w)[0]==="сірник");
    return wordKey(a) === wordKey(c) && sameKeyWords("match").length === 2;
  });
  t("пара ділить один wordKey і бачить обидві картки", sameKey === true);

  // 6b. ПАРИ «X» / «to X» (сесія 45, привід «mean»): промпт-ГОЛЕ слово не каже частини
  // мови → приймає обидві картки; промпт «to X» каже → лишається розведеним.
  const toPairs = await p.evaluate(() => {
    const ask = (en, ua, input) => {
      const i = WORDS.findIndex(w => getEn(w)[0] === en && getUa(w)[0] === ua);
      if (i < 0) return "НЕМА " + en + "=" + ua;
      currentWordIndex = i; currentWord = WORDS[i]; mode = "en-ua"; currentShown = getEn(currentWord)[0];
      return isCorrect(input);
    };
    return {
      meanVerb:  ask("mean", "підлий", "означати"),      // голе «mean» → приймає дієслово
      meanOwn:   ask("mean", "підлий", "підлий"),
      bookVerb:  ask("book", "книга", "бронювати"),
      watchVerb: ask("watch", "годинник", "спостерігати"),
      toMeanNoun: ask("to mean", "означати", "підлий"),  // «to mean» → НЕ приймає прикметник
      toBookNoun: ask("to book", "бронювати", "книга"),
      alien:     ask("mean", "підлий", "щедрий"),         // чужий глос як і був — помилка
    };
  });
  t("голе «mean» приймає «означати»", toPairs.meanVerb === true);
  t("голе «mean» приймає власний глос", toPairs.meanOwn === true);
  t("голе «book» приймає «бронювати»", toPairs.bookVerb === true);
  t("голе «watch» приймає «спостерігати»", toPairs.watchVerb === true);
  t("«to mean» НЕ приймає «підлий» (частина мови названа)", toPairs.toMeanNoun === false);
  t("«to book» НЕ приймає «книга»", toPairs.toBookNoun === false);
  t("чужий глос на «mean» не проходить", toPairs.alien === false);

  // 6c. НЕПРАВИЛЬНІ ФОРМИ (сесія 45, привід «saw»): промпт-форма приймає глоси базового
  // слова; базове слово НЕ приймає глоси форми (воно однозначне).
  const irr = await p.evaluate(() => {
    const set = en => { const i = WORDS.findIndex(w => getEn(w)[0] === en); if (i < 0) return false;
      currentWordIndex = i; currentWord = WORDS[i]; mode = "en-ua"; currentShown = getEn(currentWord)[0]; return true; };
    const ask = (en, input) => set(en) ? isCorrect(input) : "НЕМА " + en;
    return {
      sawBase: ask("saw", "бачити"), sawOwn: ask("saw", "пилка"),
      roseBase: ask("rose", "зростати"), spokeBase: ask("spoke", "говорити"),
      teethBase: ask("teeth", "зуб"),
      pastForm: ask("saw", "бачив"),        // морфології немає — свідомо
      backwards: ask("see", "пилка"),       // односторонньо
      backwards2: ask("rise", "троянда"),
      alien: ask("saw", "стілець"),
      hint: (() => { set("saw"); return getCorrectAnswer(); })(),
    };
  });
  t("«saw» приймає глос базового see", irr.sawBase === true);
  t("«saw» приймає власний глос", irr.sawOwn === true);
  t("«rose» приймає глос базового rise", irr.roseBase === true);
  t("«spoke» приймає глос базового speak", irr.spokeBase === true);
  t("«teeth» приймає глос базового tooth", irr.teethBase === true);
  t("форма минулого «бачив» НЕ проходить (морфології немає)", irr.pastForm === false);
  t("базове «see» НЕ приймає «пилка» (односторонньо)", irr.backwards === false);
  t("базове «rise» НЕ приймає «троянда»", irr.backwards2 === false);
  t("чужий глос на «saw» не проходить", irr.alien === false);
  t("«saw» має підказку про форму see", /не форма see/.test(irr.hint), irr.hint);

  // 7. ВЗАЄМНІ ПАРИ-СИНОНІМИ через enAlt (сесія 45). Патерн `idle`↔`lazy`: обидва слова
  // визнають глос одне одного в uaAlt і стоять поруч у SYNS → у UA→US приймаються обидва.
  // ⚠️ Це НЕ загальний дозвіл на синоніми: перевірки-контролі нижче мусять лишатись ❌,
  // інакше ми відтворили б витік сесії 30 (на «розкішний» проходили wonderful/lovely).
  const mutual = await p.evaluate(() => {
    const ask = (en, input) => {
      const i = WORDS.findIndex(w => getEn(w)[0] === en);
      currentWordIndex = i; currentWord = WORDS[i]; mode = "ua-en"; currentShown = getUa(currentWord)[0];
      return isCorrect(input);
    };
    const pairs = [["cry","sob"],["sob","cry"],["slow","sluggish"],["sluggish","slow"],
      ["clear","lucid"],["lucid","clear"],["shy","timid"],["timid","shy"],["want","wish"],
      ["reply","answer"],["famous","celebrated"],["silly","stupid"],["colossal","huge"],
      ["lazy","idle"],["idle","lazy"]];
    return {
      bad: pairs.filter(([a, b]) => !ask(a, b)).map(([a, b]) => a + "←" + b),
      leaks: [["beautiful","gorgeous"],["dark","gloomy"],["big","great"],["clear","transparent"],
              ["slow","gradual"],["angry","furious"]].filter(([a, b]) => ask(a, b)).map(([a, b]) => a + "←" + b),
    };
  });
  t("взаємні пари-синоніми приймаються в UA→US", mutual.bad.length === 0, mutual.bad.join(", "));
  t("не-синоніми НЕ протікають (межа сесії 30)", mutual.leaks.length === 0, mutual.leaks.join(", "));

  // 8. ДИСПЛЕЙНА ДУЖКА В ГЛОСІ не ховає картку в UA→US (сесія 45, привід «bill»).
  // «рахунок (до сплати)» мусить знаходитись під голим промптом «рахунок»; так само
  // британські варіанти centre/programme/tinned під «центр»/«програма»/«консервований».
  const paren = await p.evaluate(() => {
    const set = en => { const i = WORDS.findIndex(w => getEn(w)[0] === en); if (i < 0) return false;
      currentWordIndex = i; currentWord = WORDS[i]; mode = "ua-en"; currentShown = getUa(currentWord)[0]; return true; };
    const ask = (en, input) => set(en) ? isCorrect(input) : "НЕМА " + en;
    set("score");
    return {
      bill: ask("score", "bill"), centre: ask("center", "centre"),
      programme: ask("program", "programme"), pair: ask("couple", "pair"),
      own: ask("score", "score"),
      alienReceipt: ask("score", "receipt"), alienMiddle: ask("center", "middle"),
      panel: (() => { set("score"); return getCorrectAnswer(); })(),
      selfPrompt: ask("bill", "bill"),
    };
  });
  t("«рахунок» приймає bill (глос із дужкою)", paren.bill === true);
  t("«центр» приймає centre", paren.centre === true);
  t("«програма» приймає programme", paren.programme === true);
  t("«пара» приймає pair", paren.pair === true);
  t("власне слово як і було", paren.own === true && paren.selfPrompt === true);
  t("чужі слова не проходять", paren.alienReceipt === false && paren.alienMiddle === false,
    JSON.stringify([paren.alienReceipt, paren.alienMiddle]));
  t("панель показує bill із поясненням", /bill \(до сплати\)/.test(paren.panel), paren.panel);

  console.log("✅ " + ok.length + " перевірок пройдено");
  if (bad.length) console.log("❌ ПРОВАЛЕНО:\n - " + bad.join("\n - "));
  console.log(errs.length ? "❌ " + errs.slice(0,3).join(" | ") : "✅ 0 помилок консолі");
  await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
