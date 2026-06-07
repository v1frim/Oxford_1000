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
    title: "Baller",
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
];

if (typeof window !== "undefined") { window.SONGS = SONGS; }
