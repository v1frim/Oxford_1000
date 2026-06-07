/* ============================================================================
 * songs.js — дані для розділу «Пісні» (вивчення текстів NEFFEX тощо).
 * Підключається в index.html ПЕРЕД основним скриптом.
 *
 * Структура пісні:
 *   {
 *     id:      "унікальний-slug",      // ключ для статусу вивчення в localStorage
 *     artist:  "NEFFEX",
 *     title:   "Назва",
 *     ytId:    "YouTube video id",     // з https://youtube.com/watch?v=XXXX → "XXXX"
 *     sections: [ { label, lines: [ {en, ua} ] } ],
 *     glossary: { "слово": "переклад" } // hover для слів, яких НЕМАЄ в EN_TO_UA
 *                                       // (ключі — нижній регістр; апострофи можна)
 *     slang: [ {en, ua, note} ]         // ОКРЕМИЙ сленг/вирази (НЕ змішується з WORDS)
 *   }
 *
 * Назви секцій (узгоджена термінологія):
 *   ВСТУП · КУПЛЕТ 1/2/3 · ПРИСПІВ · ПРЕД-ПРИСПІВ · БРИДЖ · ПРОГРАШ · КІНЦІВКА
 *
 * Сленг тримається окремо від основного словника гри — під майбутній окремий
 * тренажер сленгу. Glossary — лише для hover у тексті пісні (доповнює EN_TO_UA).
 * ========================================================================== */

const SONGS = [
  {
    id: "neffex-baller",
    artist: "NEFFEX",
    title: "Baller",
    ytId: "42JyRjrLzjY",
    sections: [
      { label: "ПРИСПІВ", lines: [
        { en: "When everybody thinking that you won't make it",      ua: "Коли всі думають, що ти не впораєшся" },
        { en: "Forget 'em, yeah",                                    ua: "Забудь про них, так" },
        { en: "When everybody's thinking that you're just faking",   ua: "Коли всі думають, що ти просто вдаєш" },
        { en: "Forget 'em, yeah",                                    ua: "Забудь про них, так" },
        { en: "When everybody's thinking that you're just chasing",  ua: "Коли всі думають, що ти просто женешся за мрією" },
        { en: "Forget 'em, yeah",                                    ua: "Забудь про них, так" },
        { en: "When everybody out here is just hating",              ua: "Коли всі навколо просто ненавидять" },
        { en: "Forget 'em",                                          ua: "Забудь про них" }
      ]},
      { label: "КУПЛЕТ 1", lines: [
        { en: "Yo, yeah",                                            ua: "Йо, так" },
        { en: "I just wanna be on a tour bus",                       ua: "Я просто хочу бути в турне" },
        { en: "Sitting in the back with a cold one",                 ua: "Сидіти позаду з холодним пивком" },
        { en: "We all got dreams, know you got some",                ua: "У всіх є мрії, знаю і в тебе теж" },
        { en: "Yeah, we all got dreams, know you got some",          ua: "Так, у всіх є мрії, знаю і в тебе є" }
      ]},
      { label: "КУПЛЕТ 2", lines: [
        { en: "I want my own tour bus",                              ua: "Я хочу власний автобус для турне" },
        { en: "So I can be on tour, bruh",                           ua: "Щоб бути в турі, братан" },
        { en: "With everyone who loves us",                          ua: "З усіма, хто нас любить" },
        { en: "Been with us on the come up",                         ua: "Хто був поруч, поки ми йшли до успіху" },
        { en: "I will never give up",                                ua: "Я ніколи не здамся" }
      ]}
    ],
    // hover-переклади слів, яких немає в основному EN_TO_UA (доповнення)
    glossary: {
      "when": "коли", "everybody": "усі, кожен", "everyone": "усі, кожен",
      "thinking": "думає, думають", "that": "що", "you": "ти", "you're": "ти (ти є)",
      "won't": "не будеш (will not)", "make": "робити, досягати", "it": "це, воно",
      "forget": "забудь, забувати", "'em": "них (them)", "yeah": "так (вигук)",
      "just": "просто, лише", "faking": "вдаєш, прикидаєшся", "chasing": "женешся, переслідуєш",
      "out": "назовні, геть", "here": "тут", "is": "є", "hating": "ненавидять",
      "yo": "йо (вигук-привітання)", "wanna": "хочу (want to)", "be": "бути",
      "tour": "тур, гастролі", "bus": "автобус", "sitting": "сидіти, сидячи",
      "back": "спина, позаду", "with": "з, разом із", "cold": "холодний", "one": "один",
      "we": "ми", "all": "усі, все", "got": "маємо (have got)", "dreams": "мрії, сни",
      "know": "знати, знаю", "some": "якісь, трохи", "want": "хотіти, хочу",
      "my": "мій", "own": "власний", "so": "щоб, тож", "can": "можу, могти",
      "bruh": "братан (bro)", "who": "хто", "loves": "любить", "us": "нас",
      "been": "був, була (be)", "come": "приходити", "up": "вгору",
      "will": "(майбутній час)", "never": "ніколи", "give": "давати"
    },
    slang: [
      { en: "'em",         ua: "них",            note: "скорочення від «them»" },
      { en: "make it",     ua: "досягти успіху", note: "фраза: пробитися, домогтися свого" },
      { en: "cold one",    ua: "холодне пиво",   note: "розмовне: банка холодного пива" },
      { en: "bruh",        ua: "братан",         note: "сленгове звертання, від «bro/brother»" },
      { en: "the come up", ua: "шлях до успіху", note: "сленг: період пробивання нагору, становлення" },
      { en: "give up",     ua: "здаватися",      note: "фразове дієслово: припиняти, опускати руки" },
      { en: "wanna",       ua: "хочу",           note: "розмовне «want to»" },
      { en: "got some",    ua: "теж є / маєш",   note: "розмовне «have some»" }
    ]
  }
];

if (typeof window !== "undefined") { window.SONGS = SONGS; }
