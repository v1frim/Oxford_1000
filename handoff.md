# Oxford 1000 — Handoff Document

> Документ для передачі контексту між сесіями Claude Code.
> Якщо нова сесія — спочатку прочитай цей файл, потім `CLAUDE.md`.

---

## Проект

Українсько-англійський словниковий тренажер на основі одного HTML-файлу.

- **Файл:** `/home/user/Oxford_1000/index.html` (~350 КБ)
- **Розгортання:** GitHub Pages → https://v1frim.github.io/Oxford_1000/
- **Git репо:** v1frim/Oxford_1000 (публічний)
- **Технології:** Single-file HTML/CSS/JS, без фреймворків, без build-step
- **Гілка для розробки:** `main` (push в `main` оновлює сайт автоматично — див. CLAUDE.md)

---

## Реалізовані фічі

### Режими гри (6 шт)

**Переклад:**
- `🇺🇦 → 🇺🇸` (ua-en) — показ UA → ввод EN
- `🇺🇸 → 🇺🇦` (en-ua) — показ EN → ввод UA

**English only:**
- `📖 Def` (en-def) — показ визначення → ввод слова
- `🔁 Syn` (en-syn) — показ слова → ввод синоніма
- `↔ Ant` (en-ant) — показ слова → ввод антоніма
- `📝 Cloze` (en-cloze) — речення з `____` → заповнити слово

### Гра
- 60 секунд на раунд
- При помилці — correction-панель 3.5 сек з правильною відповіддю, прикладом, TTS
- "Останнє слово" — після таймера ще одна спроба
- TTS через Web Speech API (preferred female US English voice)
- Звукові ефекти: Web Audio API — E5→G5 старт, G5→E5→C5 фініш

### Review-режим
- 3 правильні підряд = освоєно
- **TAINTED-логіка:** бодай 1 помилка/пропуск → слово НЕ видаляється з "помилок дня" навіть після 3 правильних
- Таймер рахує скільки пройшло (не зворотний відлік)
- Review direction modal: EN→UA / UA→EN / Випадковий

### Mastery tracking
- **Знаю** (streak ≥ 3): зелений ✓
- **Вивчаю** (streak 1-2): синій ↗
- **Нові** (streak 0): оранжевий ●
- localStorage: `oxford_word_mastery_v1` `{wordIndex: streak}`
- Review-сесії **не** оновлюють mastery (тільки звичайна гра)

### XP / Рівні (додано сесія 4)

**Ставки XP:**
| Дія | XP |
|-----|-----|
| Правильна відповідь (гра або review) | +1 |
| Нові → Вивчаю (перше правильне) | +3 бонус |
| Вивчаю → Знаю (streak = 3) | +5 бонус |
| Знаю → Вивчаю (регресія) | −3 |

**20 рівнів**, формула порогів: `n*(n+1)/2 * 800` XP (Level 20 = 152,000 XP):
```
1 Новачок 0 | 2 Початківець 800 | 3 Учень 2400 | 4 Практик 4800
5 Знавець 8000 | 6 Фахівець 12000 | 7 Досвідчений 16800 | 8 Майстер 22400
9 Провідний 28800 | 10 Експерт 36000 | 11 Старший Експерт 44000
12 Спеціаліст 52800 | 13 Провідний Спеціаліст 62400 | 14 Лінгвіст 72800
15 Старший Лінгвіст 84000 | 16 Поліглот 96000 | 17 Аналітик 108800
18 Майстер Мов 122400 | 19 Гуру 136800 | 20 Легенда 152000
```

**localStorage ключі XP:**
- `oxford_xp_v1` — загальний XP (число)
- `oxford_xp_day_v1` — `{date: xpGained}` щоденний приріст

**Функції:** `loadXp`, `saveXp`, `addXp(delta)` (також викликає `trackDayXp`), `trackDayXp`, `getTodayXpGain`, `getDayXpGain(date)`, `getLevelInfo(xp)`, `computeRetroXp()`, `renderXpBar()`

**UI:** `#xp-section` під mastery-bar: `⚡ Рівень N · Назва` + зелений піл `+N XP` (якщо > 0 сьогодні) + `N / N XP` дрібно праворуч знизу.

### Панель "Прогрес по днях"
- Рядки: `дата · ігри · ⚡+N` ліворуч, `+N ✓ +N ↗ 🔁+N +N •` праворуч
- ⚡+N — щоденний XP gain (ліворуч, жовтий, 11px)
- Тижні/місяці для старих записів

### Leaderboard (три вкладки)
1. 🏆 Найкращі ігри — топ-10
2. 📅 Найкращі дні — топ-10
3. 🔥 Серії днів підряд — топ-10

### Фіксовані UI-елементи (сесія 4)

**`#bottom-left-btns`** — fixed, bottom: 18px, left: 18px:
- 📈 Прогрес по днях (toggle progress panel)
- 💾 Копія (backup)
- 📂 Відновити (restore)
Стиль: матове скло `rgba(12,32,68,0.52)` + blur(18px), flex-column, gap 6px.

**`#lb-totals`** — fixed, bottom: 18px, right: 18px:
- Загальна статистика: Днів гри, Ігор, Відповідей, Правильних, Неправильних, Пропущених, Повторень, Досвід (XP)
- Функція: `renderLbTotals()` — викликається на старті і після кожної гри

### Візуальний дизайн (сесія 4)

**Фон:** CSS sky gradient + cloud radial-gradients (без зображень):
```css
background: radial-gradient(cloud1), radial-gradient(cloud2), ...,
  linear-gradient(180deg, #7ab8e0 0%, ..., #eef6fd 100%);
```

**Картки** (.card, .leaderboard): темне матове скло:
```css
background: rgba(12, 32, 68, 0.58);
backdrop-filter: blur(22px) saturate(1.3);
border: 1px solid rgba(255,255,255,0.22);
```

### Hover translations
- `.hw` spans в реченнях → тултіп з перекладом + IPA
- Клік → TTS
- `wrapEnWord(words)` — розбиває "A / B / C" на окремі spans

### Auto-backup
- File System Access API (Chrome/Edge) + IndexedDB handle
- Fallback: традиційне завантаження для Safari/Firefox

### Гарячі клавіші
- **Enter** — submit / advance / start
- **Esc** — end / close
- **Пробіл** — speak / start review
- **Tab/Shift+Tab** — cycle leaderboard tabs
- **LeftShift / RightShift** — cycle modes
- **Alt** — toggle "Прогрес по днях"
- **Shift** (en-ua під час гри) — озвучити слово

### Нормалізація відповідей
- "to X" / "X" — обидва прийнятні для дієслів
- `г` → `ґ` нормалізація (для UA відповідей без клавіші ґ)

---

## Архітектура коду

### Дані
- `WORDS` — масив `{en, ua}` (~2345 entries)
- `TRANS` — IPA (~2137 entries, 100% покриття)
- `EXAMPLES` / `EXAMPLES_UA` — EN/UA речення (~2172 пар)
- `DEFS` — визначення (~476) для Def-режиму
- `SYNS` — синоніми (~187) для Syn-режиму
- `ANTS` — антоніми (~143) для Ant-режиму
- `EN_TO_UA` — Map для hover-перекладів

### localStorage ключі (НЕ перейменовувати!)
- `oxford_scores_v1` — топ-10 ігор
- `oxford_days_v1` — `{date: {correct, wrong, skipped, games, wordCount, reviewCorrect}}`
- `oxford_today_best_v1` — найкраща гра сьогодні
- `oxford_latest_v1` — остання гра
- `oxford_day_mistakes_v1` — помилки `{date: [wordIndices]}`
- `oxford_word_mastery_v1` — mastery `{wordIndex: streak}`
- `oxford_mastery_history_v1` — знімки `{date: {k, l, t}}`
- `oxford_backup_date_v1` — дата backup
- `oxford_progress_open_v1` — стан панелі ("1" = відкрита)
- `oxford_xp_v1` — загальний XP
- `oxford_xp_day_v1` — `{date: xpGained}` щоденний приріст

### Хелпери
- `getEn(w)`, `getUa(w)` — string|array → array
- `isCorrect(input)` — з "to" та г→ґ нормалізацією
- `lookupExample(table, enWord, uaWord)`
- `wrapSentence(sentence)`, `wrapEnWord(words)`
- `stemEn(word)` — стемінг + irregular форми
- `speak(word)`, `sfxStart()`, `sfxEnd()`
- `fmtPool(n)`, `fmtElapsed(s)`

### Візуальна система кольорів
- `#ffd166` — жовтий (XP, highlight)
- `#87b4ff` — синій (review, остання гра)
- `#ff6b6b` — червоний (помилки)
- `#7be07b` — зелений (Знаю)
- `#ffa94d` — оранжевий (Нові)
- `#06d6a0` — зелений (daily XP gain pill)

---

## Наступний крок: Picture Mode (пілот)

### Ідея
Новий режим гри: показується фото → гравець вводить слова що бачить → кожне правильне слово зникає → в кінці показуються пропущені з перекладом.

### Технічна реалізація (узгоджена)
- **Зображення:** URL з Wikimedia Commons (стабільні, без hotlink-блокування)
- **Вплив на файл:** мінімальний (~2 КБ тільки URL-рядки)
- **Слова:** pre-defined список Oxford 1000 слів для кожного фото (15-30 слів)
- **Таймер:** 90 секунд
- **Пілот:** 5-10 картинок

### Структура даних (планована)
```javascript
const PICTURE_SCENES = [
  {
    url: "https://upload.wikimedia.org/...",
    title: "На пляжі",
    words: ["fire","flame","water","sand","tree","sky","cloud","branch","smoke","reflection","wood","lake","river","stone","night"]
  },
  // ...
];
```

### UI (планований)
- Новий режим кнопка на стартовому екрані: `🖼 Фото`
- Game screen: фото зверху (або збоку), input знизу
- Знайдені слова: колонка праворуч із зеленими чекмарками
- End screen: пропущені слова з UA перекладом

---

## Що залишилось / ідеї

- **Picture mode** — наступна задача (пілот 5-10 фото)
- **CEFR фільтр у грі** — відкласти до B2 500+ і C1 200+
- **XP множники** для складніших режимів (×2, ×3) — підготовлено в архітектурі
- **DEFS_UA** — українські переклади визначень
- **Полісемія** — точкові правки по ходу

---

## Що НЕ змінювати без узгодження
- localStorage ключі (зламає дані користувача)
- Структуру WORDS array
- TAINTED-логіку в review
- Кольорову схему

---

## Контакти / Особа
- Email: vovabestintheworld@gmail.com
- Рівень англійської: A2-B1, ціль B2/C1
- Грає щодня, активний продакшен
- Цінує: гарячі клавіші, мінімальний UI, естетику
- Спілкування: українською

---

## Версія документа
- Створено: 2026-05-26
- Останнє оновлення: 2026-05-30 (сесія 4)
- Зміни сесії 4:
  - XP/level система (20 рівнів, level×800, max 152k XP)
  - XP бар на стартовому екрані (рівень, daily gain, N/N XP)
  - Щоденний XP трекінг (oxford_xp_day_v1)
  - ⚡+N в "Прогресі по днях" (ліворуч у рядку)
  - Редизайн фону: ніжно-блакитне небо з CSS хмарками
  - Картки: темне матове скло (glassmorphism)
  - #lb-totals: фіксований віджет статистики (bottom-right)
  - #bottom-left-btns: фіксовані кнопки (bottom-left)
  - г→ґ нормалізація у UA відповідях
  - Додано приклади для "nutritious" (EN + UA)
  - Узгоджено архітектуру Picture mode (пілот — наступний крок)
