/* ============================================================================
 * songs.js — дані для розділу «Пісні» (вивчення текстів NEFFEX тощо).
 * Підключається в index.html ПЕРЕД основним скриптом.
 *
 * Структура пісні:
 *   {
 *     id:      "унікальний-slug",      // ключ для статусу вивчення в localStorage
 *     artist:  "NEFFEX",
 *     title:   "Назва",
 *     ytId:    "YouTube video id",     // напр. з https://youtube.com/watch?v=XXXX → "XXXX"
 *     sections: [
 *       { label: "ХОР" | "КУПЛЕТ 1" | ..., lines: [ {en, ua}, ... ] }
 *     ],
 *     slang: [ {en, ua, note} ]        // ОКРЕМИЙ сленг-словник цієї пісні (НЕ змішується з WORDS)
 *   }
 *
 * Сленг свідомо тримається окремо від основного словника гри — під майбутній
 * окремий тренажер сленгу.
 * ========================================================================== */

const SONGS = [
  {
    id: "neffex-dreams",
    artist: "NEFFEX",
    title: "Dreams",
    ytId: "42JyRjrLzjY",   // ⚠️ тимчасово (перший лінк) — підтвердити/замінити
    sections: [
      { label: "ХОР", lines: [
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
    slang: [
      { en: "'em",         ua: "них",           note: "скорочення від «them»" },
      { en: "cold one",    ua: "холодне пиво",  note: "розмовне: банка холодного пива" },
      { en: "bruh",        ua: "братан",        note: "сленгове звертання, від «bro/brother»" },
      { en: "the come up", ua: "шлях до успіху", note: "сленг: період пробивання нагору, становлення" },
      { en: "wanna",       ua: "хочу",          note: "розмовне «want to»" },
      { en: "got some",    ua: "теж є / маєш",  note: "розмовне «have some»" }
    ]
  }
];

if (typeof window !== "undefined") { window.SONGS = SONGS; }
