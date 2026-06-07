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
 * Назви секцій: ВСТУП · КУПЛЕТ 1/2/3 · ПРИСПІВ · ПРЕД-ПРИСПІВ · БРИДЖ · ПРОГРАШ · КІНЦІВКА
 * ========================================================================== */

const SONGS = [
  {
    id: "neffex-baller",
    artist: "NEFFEX",
    title: "Baller 🍾",
    ytId: "42JyRjrLzjY",
    sections: [
      { label: "КУПЛЕТ 1", lines: [
        { en: "Ooh, like Lebron though or like Lonzo",                ua: "У-у, наче Леброн, або як Лонзо" },
        { en: "Ooh, I'm a baller, yeah, shot caller",                 ua: "У-у, я крутій, так, я тут усе вирішую" },
        { en: "Yeah, they love me, you can't touch me",               ua: "Так, мене люблять, мене не дістати" },
        { en: "Nah, can't trust me, I'm too lucky",                   ua: "Не-а, мені не довіряй, я надто везучий" },
        { en: "Look at me, look at you, what you see, what you do",    ua: "Глянь на мене, глянь на себе — що ти бачиш, що ти робиш" },
        { en: "Baby, please, think it through, drink it up, enjoy the view", ua: "Крихітко, прошу, обдумай це, випий до дна, насолоджуйся краєвидом" },
        { en: "MVP, got my crew, Nike on my shoes",                   ua: "Найцінніший гравець, зі мною моя братва, Nike на кросівках" },
        { en: "Might be sippin' booze, slightly feelin' loose",       ua: "Може, потягую випивку, трохи розслабився" },
        { en: "If I want it, then I'll have it",                      ua: "Якщо я цього хочу — я це отримаю" },
        { en: "Got an iced wrist causin' damage",                     ua: "Зап'ястя в діамантах — аж сліпить" },
        { en: "Just like I planned it, I'll be damn rich",            ua: "Точно як і планував — буду до біса багатий" },
        { en: "Have a chef in the back, make a sandwich",             ua: "Маю кухаря там позаду — хай зробить сендвіч" },
        { en: "Ooh, she got it all, all, I just want it all, all",    ua: "У-у, у неї є все-все, а я просто хочу все-все" },
        { en: "Baby, we could ba-all, you just gotta fa-all",         ua: "Крихітко, ми могли б відриватися, тобі лиш треба піддатися" },
        { en: "I could be your ma-an, payin' for your ta-an",         ua: "Я міг би бути твоїм чоловіком, платити за твою засмагу" },
        { en: "I'm your biggest fa-an, you said this your ja-am, yeah (Yeah)", ua: "Я твій найбільший фанат, ти сказала — це твій улюблений трек, так (Так)" }
      ]},
      { label: "ПРИСПІВ", lines: [
        { en: "Oh, yeah, I'm livin' up life, like a baller (Baller)", ua: "О так, я живу на повну, як крутій (Крутій)" },
        { en: "I'm livin' like white, like I'm Walter (Like I'm Walter)", ua: "Живу шикарно, наче я Волтер (Наче я Волтер)" },
        { en: "She always call me, I never call her (Never call her)", ua: "Вона завжди дзвонить мені, я їй — ніколи (Ніколи їй)" },
        { en: "Oh, yeah, I'm livin' this life like a baller (Baller)", ua: "О так, я живу це життя як крутій (Крутій)" }
      ]},
      { label: "КУПЛЕТ 2", lines: [
        { en: "I pull up in a coup up in a Chevy",                    ua: "Під'їжджаю на купе, на Chevy" },
        { en: "I'ma hit it in the back, if she let me",               ua: "Зроблю своє на задньому сидінні, якщо вона дозволить" },
        { en: "And take your time, baby, gettin' ready",              ua: "І не поспішай, крихітко, збирайся" },
        { en: "I want you lookin' fine, oh, lookin' sexy, yeah, yeah", ua: "Хочу, щоб ти мала чудовий вигляд, о, сексуальний, так, так" },
        { en: "I be, I be, I be, I be, I be turnin' up",              ua: "Я відриваюсь, відриваюсь, відриваюсь" },
        { en: "Got no ID, ID, ID, ID, but she cute as fuck",          ua: "Без документів, але вона до біса мила" },
        { en: "So, I told her, she could kick it, but I said she couldn't touch", ua: "Тож я сказав, що вона може зависнути, але торкатися — зась" },
        { en: "Now, all she, all she, all she wants to do is kiss and hug", ua: "А тепер усе, чого вона хоче — цілуватись і обійматись" },
        { en: "I could go all day, I'ma do my thing",                 ua: "Я можу хоч цілий день, робитиму своє" },
        { en: "I'ma stay ballin', like it's my driveway",             ua: "Лишатимусь на коні, наче це моя під'їзна доріжка" },
        { en: "I'ma go all-in, party like Friday",                    ua: "Піду ва-банк, гулятиму як у п'ятницю" },
        { en: "I'ma take this day, turn it to my day",                ua: "Візьму цей день і зроблю його своїм" },
        { en: "Ooh, ooh, she love me, sippin' bubbly",                ua: "У-у, вона любить мене, попиваючи шампанське" },
        { en: "Champagne, cocaine, kiss and hug me",                  ua: "Шампанське, кокаїн, цілуй і обіймай мене" },
        { en: "It ain't nothin', droppin' money",                     ua: "Це дрібниці — смітити грошима" },
        { en: "Okay, all day, gettin' lucky, yeah (Yeah)",            ua: "Окей, цілий день щастить, так (Так)" }
      ]},
      { label: "ПРИСПІВ", lines: [
        { en: "Oh, yeah, I'm livin' up life, like a baller (Baller)", ua: "О так, я живу на повну, як крутій (Крутій)" },
        { en: "I'm livin' like white, like I'm Walter (Like I'm Walter)", ua: "Живу шикарно, наче я Волтер (Наче я Волтер)" },
        { en: "She always call me, I never call her (Never call her)", ua: "Вона завжди дзвонить мені, я їй — ніколи (Ніколи їй)" },
        { en: "Oh, yeah, I'm livin' this life like a baller (Baller)", ua: "О так, я живу це життя як крутій (Крутій)" }
      ]},
      { label: "КУПЛЕТ 3", lines: [
        { en: "Yeah, you can catch me in the studio",                 ua: "Так, можеш застати мене в студії" },
        { en: "Yeah, and you'll hear me on the radio",                ua: "Так, і почуєш мене по радіо" },
        { en: "Yeah, you'll hear me through your stereo",             ua: "Так, почуєш мене зі своєї стереосистеми" },
        { en: "Yeah, while I'm lookin' for my cameo",                 ua: "Так, поки я шукаю своє камео" },
        { en: "Yeah, she's textin' me, ooh, wanna get at me, ooh",    ua: "Так, вона пише мені, у-у, хоче підкотити, у-у" },
        { en: "Now she's sextin' me, yeah, she's testin' me",         ua: "Тепер шле мені пікантні повідомлення, так, випробовує мене" },
        { en: "I just let it be, yeah, I'm a vet, you see",           ua: "Я просто пускаю на самоплив, так, я бувалий, розумієш" },
        { en: "Since I was seventeen, welcome to the team, ooh, ooh", ua: "Ще з сімнадцяти, ласкаво просимо в команду, у-у" },
        { en: "Yeah, I deal in bulk, like I'm Costco",                ua: "Так, торгую оптом, наче я Costco" },
        { en: "Yeah, I got this shit on lock, though",                ua: "Так, я все тримаю під контролем" },
        { en: "Yeah, invest my money in my stock, oh",               ua: "Так, вкладаю гроші у свої акції, о" },
        { en: "Yeah, so, I'm growin' round the clock, yo",           ua: "Так, тож я росту цілодобово, йо" },
        { en: "Oh, she like that, wanna try that",                   ua: "О, їй таке подобається, хоче спробувати" },
        { en: "Wanna bite that, she got a nice ass",                 ua: "Хоче вкусити, у неї гарна дупа" },
        { en: "Tr-treat her right, yeah, she sippin' white, yeah",   ua: "Стався до неї добре, так, вона попиває біле, так" },
        { en: "We go all night, 'til we see the sunlight, yeah (Yeah)", ua: "Гуляємо всю ніч, поки не побачимо світанок, так (Так)" }
      ]},
      { label: "ПРИСПІВ", lines: [
        { en: "Oh, yeah, I'm livin' up life, like a baller (Baller)", ua: "О так, я живу на повну, як крутій (Крутій)" },
        { en: "I'm livin' like white, like I'm Walter (Like I'm Walter)", ua: "Живу шикарно, наче я Волтер (Наче я Волтер)" },
        { en: "She always call me, I never call her (Never call her)", ua: "Вона завжди дзвонить мені, я їй — ніколи (Ніколи їй)" },
        { en: "Oh, yeah, I'm livin' this life like a baller (Baller)", ua: "О так, я живу це життя як крутій (Крутій)" }
      ]}
    ],
    // hover-переклади слів (контекстні для цієї пісні; доповнюють основний словник)
    glossary: {
      "ooh": "у-у (вигук)", "nah": "не-а (ні)", "yo": "йо (вигук)",
      "lebron": "Леброн (Джеймс — баскетболіст)", "lonzo": "Лонзо (Болл — баскетболіст; гра слів з «ball»)",
      "baller": "крутій, успішний багатій", "shot": "постріл (тут: shot caller — головний)",
      "caller": "той, хто командує", "touch": "торкатися", "trust": "довіряти",
      "lucky": "везучий", "view": "краєвид, вид", "through": "крізь, наскрізь",
      "mvp": "найцінніший гравець (Most Valuable Player)", "crew": "команда, братва",
      "nike": "Nike (бренд)", "shoes": "взуття, кросівки", "might": "можливо, може",
      "sippin'": "потягую (sip — пити маленькими ковтками)", "booze": "випивка, алкоголь",
      "slightly": "трохи, злегка", "feelin'": "відчуваю", "loose": "розкутий, розслаблений",
      "iced": "у діамантах, в брильянтах", "wrist": "зап'ястя", "causin'": "спричиняє",
      "damage": "шкода (тут: «б'є наповал»)", "planned": "запланував", "damn": "до біса (підсилення)",
      "rich": "багатий", "chef": "шеф-кухар", "sandwich": "сендвіч", "gotta": "мусиш (got to)",
      "ball": "відриватися, розкошувати", "fall": "впасти; закохатися", "payin'": "плачу",
      "tan": "засмага", "biggest": "найбільший", "jam": "улюблений трек",
      "livin'": "живу", "walter": "Волтер (відсилання до Walter White, «Breaking Bad»)",
      "pull": "під'їжджати (pull up)", "coup": "купе (авто, coupe)", "chevy": "Chevy (Chevrolet)",
      "hit": "вдарити; тут «hit it» — переспати (натяк)", "gettin'": "стаю; gettin' ready — збираюсь",
      "ready": "готовий", "fine": "чудовий (вигляд)", "sexy": "сексуальний",
      "turnin'": "відриваюсь (turn up — тусити)", "cute": "милий, симпатичний",
      "kick": "копати; kick it — зависати, тусити", "kiss": "цілувати", "hug": "обіймати",
      "driveway": "під'їзна доріжка", "ballin'": "розкошую, живу красиво",
      "all-in": "ва-банк, поставити все", "party": "вечірка; гуляти",
      "bubbly": "шампанське (розм.)", "champagne": "шампанське", "cocaine": "кокаїн",
      "ain't": "не / немає (розм.)", "nothin'": "нічого, дрібниця", "droppin'": "смітити (грошима)",
      "studio": "студія", "radio": "радіо", "stereo": "стереосистема", "cameo": "камео, епізодична поява",
      "textin'": "пише повідомлення", "sextin'": "шле інтимні повідомлення (sexting)",
      "testin'": "випробовує", "vet": "бувалий, досвідчений (від veteran)",
      "seventeen": "сімнадцять", "team": "команда", "deal": "мати справу; торгувати",
      "bulk": "опт, великими партіями", "costco": "Costco (мережа гуртових магазинів)",
      "shit": "лайно (тут: «все це»)", "lock": "замок; on lock — під контролем",
      "invest": "вкладати, інвестувати", "stock": "акції", "growin'": "росту",
      "clock": "годинник; round the clock — цілодобово", "bite": "кусати",
      "ass": "дупа (груб.)", "treat": "ставитися; пригощати", "sunlight": "сонячне світло, світанок",
      "i'ma": "я зараз / я буду (I'm gonna)"
    },
    slang: [
      { en: "baller",          ua: "крутій, багатій",       note: "той, хто «грає по-крупному»; від баскетболу → успішна заможна людина" },
      { en: "shot caller",     ua: "головний, бос",          note: "той, хто приймає рішення і всім керує" },
      { en: "iced",            ua: "в діамантах",            note: "ice = діаманти; iced wrist — зап'ястя у брильянтах" },
      { en: "causin' damage",  ua: "б'є наповал",            note: "букв. «завдає шкоди» → справляє сильне враження" },
      { en: "ball / ballin'",  ua: "розкошувати",            note: "жити красиво, купатися в розкошах" },
      { en: "this your jam",   ua: "це твій улюблений трек", note: "jam — улюблена пісня" },
      { en: "livin' up life",  ua: "жити на повну",          note: "проживати життя на максимум" },
      { en: "like I'm Walter", ua: "як Волтер Вайт",         note: "відсилання до Walter White («Breaking Bad»); гра слів з «white» — і розкіш, і натяк" },
      { en: "hit it",          ua: "переспати",              note: "натяк (груб.-розм.)" },
      { en: "turn up",         ua: "відриватися",            note: "веселитися на повну, тусити" },
      { en: "kick it",         ua: "зависати",               note: "проводити час, тусити (без зобов'язань)" },
      { en: "as fuck",         ua: "до біса (груб.)",        note: "підсилювач: «cute as fuck» — неймовірно мила" },
      { en: "do my thing",     ua: "робити своє",            note: "займатися своєю справою, бути собою" },
      { en: "all-in",          ua: "ва-банк",                note: "поставити все, видатися повністю (з покеру)" },
      { en: "bubbly",          ua: "шампанське",             note: "розмовна назва шампанського (через бульбашки)" },
      { en: "droppin' money",  ua: "смітити грошима",        note: "багато й легко витрачати" },
      { en: "gettin' lucky",   ua: "щастить / переспати",    note: "подвійний сенс: і «везе», і інтимний натяк" },
      { en: "get at me",       ua: "підкотити",              note: "звертатися/залицятися, «дістатися» до когось" },
      { en: "sexting",         ua: "секстинг",               note: "обмін інтимними повідомленнями" },
      { en: "vet",             ua: "бувалий",                note: "досвідчений, «ветеран» своєї справи" },
      { en: "deal in bulk",    ua: "торгувати оптом",        note: "продавати великими партіями; гра слів з «deal» — оборудка" },
      { en: "on lock",         ua: "під контролем",          note: "повністю під контролем, «схоплено»" },
      { en: "round the clock", ua: "цілодобово",             note: "24/7, без перерви" },
      { en: "sippin' white",   ua: "попиває біле (вино)",    note: "ймовірно біле вино; можливий подвійний сенс" },
      { en: "coup",            ua: "купе",                   note: "від «coupe» — двомісне авто" },
      { en: "booze",           ua: "випивка",                note: "алкоголь (розм.)" }
    ]
  }
  ,
  {
    id: "neffex-lit",
    artist: "NEFFEX",
    title: "Lit 🔥",
    ytId: "AHhiRc0Lnq4",
    sections: [
      { label: "КУПЛЕТ 1", lines: [
        { en: "I'm just fuckin' lit, man, I'm just fuckin' lit",              ua: "Я просто до біса бухий, чуваку, просто бухий" },
        { en: "Drank a bottle of this shit, man, bottle of this shit",         ua: "Ковтнув пляшку цього добра, чуваку, пляшку" },
        { en: "I'm about to write a hit, man, about to write a hit",           ua: "Зараз напишу хіт, чуваку, напишу хіт" },
        { en: "No, I'm never gonna quit, man, never gonna quit",               ua: "Ні, я ніколи не здамся, чуваку, ніколи" },
        { en: "I just took another hit, man, took another hit",                ua: "Щойно ще разок затягнувся, чуваку, ще разок" },
        { en: "I'm about to lose my shit, man, about to lose my shit",         ua: "Зараз зірвусь, чуваку, зірвусь" },
        { en: "Does she have a fuckin' wristband? Yeah, she needs that shit",  ua: "У неї є браслет? Так, їй він потрібен" },
        { en: "Better get her out real quick, man, get her out real quick (Quick)", ua: "Краще виводь її звідси швидко, чуваку, швидко (Швидко)" }
      ]},
      { label: "ПРИСПІВ", lines: [
        { en: "Are you the present or the future? (Present or the future)",    ua: "Ти теперішнє чи майбутнє? (Теперішнє чи майбутнє)" },
        { en: "Are you a drinker or a boozer? (Drinker or a boozer)",          ua: "Ти п'єш по-людськи чи бухаєш? (П'єш чи бухаєш)" },
        { en: "Are you a giver or a user? (Giver or a user)",                  ua: "Ти даєш чи тільки береш? (Даєш чи береш)" },
        { en: "Are you a winner or a loser? (Winner or a loser)",              ua: "Ти переможець чи невдаха? (Переможець чи невдаха)" },
        { en: "Yeah, and I said that I would never back down",                 ua: "Так, і я казав, що ніколи не здамся" },
        { en: "And I said that I would never back down",                       ua: "І казав, що ніколи не здамся" },
        { en: "And I said that I would never back down",                       ua: "І казав, що ніколи не здамся" },
        { en: "I swore that I would never fuckin' back down",                  ua: "Клявся, що ніколи до біса не здамся" }
      ]},
      { label: "КУПЛЕТ 2", lines: [
        { en: "Pass the bottle and the fifth, man, bottle and the fifth",      ua: "Передай пляшку і п'ятак, чуваку, пляшку і п'ятак" },
        { en: "'Cause I'm feeling like the shit, man, feeling like the shit",  ua: "Бо я відчуваю себе вершиною, чуваку, вершиною" },
        { en: "Yeah, her body's like a gift, man, body's like a gift",         ua: "Так, її тіло — наче подарунок, чуваку, подарунок" },
        { en: "'Cause she's looking hella fit, man, looking hella fit",        ua: "Бо вона до біса у формі, чуваку, у формі" },
        { en: "And I can't always commit, man, can't always commit",           ua: "І я не завжди можу зобов'язуватись, чуваку" },
        { en: "Pull a trigger on this shit, man, trigger on this shit",        ua: "Вирішуюсь на це, чуваку, вирішуюсь" },
        { en: "'Cause I feel I haven't lived, man, feel I haven't lived",      ua: "Бо відчуваю, що не жив по-справжньому, чуваку" },
        { en: "'Til I got nothing to miss, man, got nothing to miss (Miss)",   ua: "Поки мені нема чого більше втрачати, чуваку (Втрачати)" }
      ]},
      { label: "ПРИСПІВ", lines: [
        { en: "Are you the present or the future? (Present or the future)",    ua: "Ти теперішнє чи майбутнє? (Теперішнє чи майбутнє)" },
        { en: "Are you a drinker or a boozer? (Drinker or a boozer)",          ua: "Ти п'єш по-людськи чи бухаєш? (П'єш чи бухаєш)" },
        { en: "Are you a giver or a user? (Giver or a user)",                  ua: "Ти даєш чи тільки береш? (Даєш чи береш)" },
        { en: "Are you a winner or a loser? (Winner or a loser)",              ua: "Ти переможець чи невдаха? (Переможець чи невдаха)" },
        { en: "Yeah, and I said that I would never back down",                 ua: "Так, і я казав, що ніколи не здамся" },
        { en: "And I said that I would never back down",                       ua: "І казав, що ніколи не здамся" },
        { en: "And I said that I would never back down",                       ua: "І казав, що ніколи не здамся" },
        { en: "I swore that I would never fuckin' back down",                  ua: "Клявся, що ніколи до біса не здамся" }
      ]}
    ],
    glossary: {
      "lit":       "бухий, п'яний (під кайфом)",
      "fuckin'":   "до біса (підсилення, груб.)",
      "man":       "чуваку (звернення)",
      "drank":     "випив (від drink)",
      "gonna":     "збираюся (going to)",
      "never":     "ніколи",
      "quit":      "здаватися, кидати",
      "took":      "взяв (від take)",
      "hit":       "хіт (пісня); тут: затягнутися",
      "lose":      "втрачати, зривати",
      "shit":      "лайно; тут: «добро», підсилення (груб.)",
      "wristband": "браслет (клубний — допуск на вечірку)",
      "real":      "справжній; real quick = дуже швидко",
      "quick":     "швидкий, швидко",
      "future":    "майбутнє",
      "drinker":   "той, хто п'є (помірно)",
      "boozer":    "п'яниця, бухар",
      "giver":     "той, хто дає",
      "user":      "той, хто бере/використовує (тут: споживач)",
      "winner":    "переможець",
      "loser":     "невдаха",
      "back":      "назад; back down — відступати",
      "down":      "вниз; back down — здаватися",
      "swore":     "клявся (від swear)",
      "swear":     "клястися",
      "'til":      "поки не (until)",
      "'cause":    "бо, тому що (because)",
      "pass":      "передати, подати",
      "fifth":     "п'ятак (750 мл пляшка — п'ята частина галона)",
      "feeling":   "відчуваю, відчуття",
      "body":      "тіло",
      "hella":     "дуже, до біса (каліфорнійський сленг)",
      "fit":       "у формі, підтягнутий/а",
      "gift":      "подарунок",
      "commit":    "зобов'язуватися (у стосунках)",
      "pull":      "тягнути; pull a trigger — натиснути на гашок",
      "trigger":   "курок, гашок; тут: вирішитися",
      "lived":     "жив (від live)",
      "nothing":   "нічого"
    },
    slang: [
      { en: "lit",                   ua: "бухий, п'яний",             note: "тут: п'яний/під кайфом (від алкоголю); ширше сленгове значення — «класний, у вогні»" },
      { en: "take a hit",            ua: "затягнутися",               note: "зробити затяжку (наркотичний натяк)" },
      { en: "lose my shit",          ua: "зірватися, збожеволіти",    note: "втратити контроль, вийти з себе" },
      { en: "wristband",             ua: "клубний браслет",           note: "браслет допуску на вечірку; без нього — виходь" },
      { en: "feeling like the shit", ua: "відчуваю себе вершиною",    note: "«the shit» (з артиклем) = найкращий, бог; без артикля — образа" },
      { en: "hella",                 ua: "дуже, до біса",             note: "каліфорнійський сленг-підсилювач (hella fit = неймовірно у формі)" },
      { en: "the fifth",             ua: "п'ятак (750 мл)",           note: "п'ята частина галона — стандартна пляшка міцного (США)" },
      { en: "commit",                ua: "зобов'язуватися",           note: "тут: у стосунках — «бути серйозним»" },
      { en: "pull a trigger",        ua: "натиснути на гашок",        note: "тут метафора: вирішитися на щось, зробити крок" },
      { en: "back down",             ua: "відступати, здаватися",     note: "back down = відмовлятися від позиції під тиском" },
      { en: "nothing to miss",       ua: "нема чого втрачати",        note: "коли вже все пережив — нема чого боятися" },
      { en: "boozer",                ua: "п'яниця, бухар",            note: "гірше ніж drinker: важкий алкоголік" },
      { en: "drinker vs boozer",     ua: "п'єш чи бухаєш",           note: "приспів ставить риторичні пари: даєш/береш, перемагаєш/програєш" },
      { en: "giver vs user",         ua: "даєш чи тільки береш",      note: "класичне протиставлення: той хто вкладає vs хто лише отримує" }
    ]
  }
];

if (typeof window !== "undefined") { window.SONGS = SONGS; }
