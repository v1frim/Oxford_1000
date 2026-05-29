# Oxford 1000 — Handoff Document

> Документ для передачі контексту між сесіями Claude Code.
> Якщо нова сесія — спочатку прочитай цей файл, потім `CLAUDE.md`.

---

## Проект

Українсько-англійський словниковий тренажер на основі одного HTML-файлу.

- **Файл:** `/home/user/Oxford_1000/index.html` (~430 КБ)
- **Розгортання:** GitHub Pages → https://v1frim.github.io/Oxford_1000/
- **Git репо:** v1frim/Oxford_1000 (публічний)
- **Технології:** Single-file HTML/CSS/JS, без фреймворків, без build-step
- **Гілка для розробки:** `main` (push в `main` оновлює сайт автоматично — див. CLAUDE.md)

---

## Реалізовані фічі

### Режими гри (6 шт)

Стартовий екран має дві групи кнопок:

**Переклад:**
- `🇺🇦 → 🇺🇸` (ua-en) — показ UA → ввод EN
- `🇺🇸 → 🇺🇦` (en-ua) — показ EN → ввод UA

**English only:**
- `📖 Def` (en-def) — показ визначення → ввод слова
- `🔁 Syn` (en-syn) — показ слова → ввод синоніма
- `↔ Ant` (en-ant) — показ слова → ввод антоніма
- `📝 Cloze` (en-cloze) — речення з `____` → заповнити слово

Кожен режим будує свій пул слів на старті гри (фільтрує по доступності даних).

### Гра
- 60 секунд на раунд (звичайна гра)
- При помилці — correction-панель на 3.5 сек з правильною відповіддю, прикладом, TTS
- "Останнє слово" — після завершення таймера ще одна спроба на поточне слово
- TTS через Web Speech API (preferred female US English voice)
- **Звукові ефекти:** Web Audio API — два тони при старті (E5→G5), три тони при фініші (G5→E5→C5)

### Review-режим (повторення помилок)
- Запускається з end-екрану ("Повторити помилки") або зі стартового ("📒 Помилки за сьогодні")
- Слова з помилок поточного дня (з localStorage)
- **Правило освоєння:** 3 правильні відповіді на слово підряд (без помилок)
- **TAINTED-логіка** (важливо!): якщо в review-сесії на слові була бодай **1 помилка/пропуск**, воно НЕ видаляється з "помилок за день" навіть після 3 правильних. Має чисто пройти.
- Таймер рахує **скільки пройшло** (замість зворотного відліку)
- UI: лічильник слів (3/8), лічильник помилок (✗N), стопwatch
- Після review на end-screen показується `~N сек/слово` (reviewElapsed / кількість пройдених слів)
- **Review direction modal:** при старті з меню пропонує EN→UA / UA→EN / Випадковий; при restart з end-screen — автоматично той самий напрямок що й попередня гра

### Hover translations
- Кожне слово в EN-реченні обгорнуте в `<span class="hw">`
- Наведення → тултіп `#hw-tooltip` з перекладом і IPA (якщо є)
- Клік → TTS того слова
- **IPA в тултіпі:** `.tip-ipa` span (12px, не курсив, синюватий), показується другим рядком
- Стоп-слова (be/is/the/of/...) пропускаються для hover, але обгортаються для TTS
- `wrapEnWord(words)` — для слів-відповідей на end-screen: розбиває "A / B / C" на окремі `.hw` spans (кожне слово незалежно кликабельне і hoverable)

### "to" prefix для полісемічних дієслів
25 noun/verb пар використовують "to X" для verb-форми:
`to address, to answer, to bear, to book, to clean, to close, to fall, to fly, to last, to lead, to lie, to like, to love, to mean, to open, to play, to point, to report, to ring, to season, to tear, to type, to waste, to watch, to wave`

- `isCorrect` приймає і "book", і "to book" (нормалізація)
- TTS озвучує лише "book" (без "to")

### Mastery tracking (категорії слів)
- **Знаю** (зелений ✓): 3+ правильних відповіді в звичайній грі
- **Вивчаю** (синій ↗): 1-2 правильних або раніше було "Знаю" але помилилися
- **Нові** (оранжевий ●): ще не зустрічались
- Прогрес-бар на стартовому екрані (зелений/синій/оранжевий)
- localStorage: `oxford_word_mastery_v1` `{wordIndex: streak}`
- Review-сесії **не** оновлюють mastery (тільки звичайна гра)
- `saveMasterySnapshot()` — зберігає знімок при поверненні на стартовий екран

### Leaderboard (ширина 320px)
Три вкладки:
1. 🏆 Найкращі ігри — топ-10 окремих ігор
2. 📅 Найкращі дні — топ-10 днів. Формат: `133 (117/250) 🔁 +15 · 23 ігри 27.05`
3. 🔥 Серії днів підряд — топ-10 streaks. Формат: `2 дні (322) · 31 гра 27.05 – сьогодні`

`🔁 +N` — кількість слів пройдених у review за день (унікальні слова, не спроби).
Топ-3 з золото/срібло/бронза. Сьогоднішня дата виділена.
**Pool size badge:** `· 2.2k` (розмір пулу слів) в lb-pool — дрібно, opacity 0.65.

### Панель "Прогрес по днях" (ширина 320px)
- Кнопка `📈` на стартовому екрані (або Alt)
- Показує останні 14 днів: зміну mastery-категорій (+знаю / +вивчаю)
- Стан (відкрита/закрита) зберігається в localStorage `oxford_progress_open_v1`
- **Відновлюється після гри** — якщо була відкрита до старту, відкривається після повернення

### Auto-backup (File System Access API)
- `💾` — вибрати файл для автоматичного збереження (Chrome/Edge)
- `📂` — відновити з файлу
- Автозбереження раз на день (silent overwrite того ж файлу через IndexedDB handle)
- Fallback: традиційне завантаження файлу для Safari/Firefox
- Резервні ключі: `oxford_backup_date_v1`, IndexedDB `oxford_backup`

### Гарячі клавіші
- **Enter** — submit / advance correction / start / restart
- **Esc** — end game / close end-screen / close review-modal
- **Пробіл** — speak word / start review
- **Tab/Shift+Tab** — cycle leaderboard tabs
- **LeftShift** — cycle modes уперед; **RightShift** — назад
- **Alt** — toggle "Прогрес по днях" (тільки на стартовому екрані)
- **Shift** (під час гри en-ua) — озвучити поточне слово

---

## Архітектура коду

### Дані (всі в index.html)
- `WORDS` — масив `{en, ua}` (**~2182 entries**, ~2162 unique EN words)
- `TRANS` — IPA транскрипції (**2137 entries**, 100% покриття WORDS). Показується в hover-тултіпі на end-screen
- `EXAMPLES` / `EXAMPLES_UA` — EN/UA речення-приклади (~2172 пар)
- `DEFS` — англомовні визначення (~476) для Def-режиму
- `SYNS` — синоніми (~187) для Syn-режиму
- `ANTS` — антоніми (~143) для Ant-режиму
- `EN_TO_UA` — Map для hover-перекладів (з WORDS + розширення через `m.set()`)

### Розширення WORDS (2026-05-27)
До початкових ~1432 слів додано **+750 нових**:
- 608 — single-word синоніми/антоніми зі SYNS/ANTS
- 136 — вокабуляр з EXAMPLES речень
- Усі мають UA переклади, перевірені на дублі

### CEFR-розподіл (довідково, Oxford 5000)
- **A1:** 651 · **A2:** 484 · **B1:** 270 · **B2:** 249 · **C1:** 89
- ~418 слів поза Oxford 5000 (Syn/Ant слова)
- Фільтр по рівнях — **відкласти** до B2 500+ і C1 200+

### Хелпери
- `getEn(w)`, `getUa(w)` — string|array → array
- `isCorrect(input)` — валідація з "to" нормалізацією
- `lookupExample(table, enWord, uaWord)` — шукає `"word:meaning"` або просто `"word"`
- `wrapSentence(sentence)` — обгортає слова в `.hw` спани з data-trans
- `wrapEnWord(words)` — для одного або кількох слів через " / ", кожне окремий `.hw` з IPA
- `stemEn(word)` — стемінг + IRREGULAR форми (повертає ключ EN_TO_UA або null)
- `speak(word)` — TTS, для "to X" speak'ить лише "X"
- `sfxStart()` / `sfxEnd()` — Web Audio звукові ефекти
- `fmtPool(n)` — форматує як "2.2k"
- `fmtElapsed(s)` — форматує секунди як "1:23"

### localStorage ключі (НЕ перейменовувати без міграції!)
- `oxford_scores_v1` — топ-10 ігор
- `oxford_days_v1` — `{date: {correct, wrong, skipped, games, wordCount, reviewCorrect}}`
- `oxford_today_best_v1` — найкраща гра сьогодні
- `oxford_latest_v1` — остання гра
- `oxford_day_mistakes_v1` — помилки по днях `{date: [wordIndices]}`
- `oxford_word_mastery_v1` — mastery `{wordIndex: streak}`
- `oxford_mastery_history_v1` — знімки mastery по днях `{date: {k, l, t}}`
- `oxford_backup_date_v1` — дата останнього backup
- `oxford_progress_open_v1` — стан панелі прогресу ("1" = відкрита)

### Стан гри (in-memory)
- `mode` — поточний з 6 режимів
- `activePool` — null для звичайної гри, array індексів для review
- `reviewRemaining` — Set індексів ще не освоєних у поточному review
- `reviewTotalPool` — початковий розмір пулу review
- `reviewElapsed` — секунди що пройшли в review
- `reviewCorrectCounts` — `{idx: count}` правильних у поточному review
- `reviewTaintedIndices` — Set індексів з помилкою (НЕ видаляти з помилок дня)
- `reviewDir` — "en-ua" | "ua-en" | "random"

### Візуальна система
- `#ffd166` — жовтий (highlight, is-new)
- `#87b4ff` — синій (остання гра, review)
- `#ff6b6b` — червоний (помилки, overtime)
- `#7be07b` — зелений (Знаю)
- `#ffa94d` — оранжевий (Нові)
- Top-3 рейтингу: золото/срібло/бронза тіні

---

## Що залишилось / можливі покращення

- **CEFR фільтр у грі** — відкласти до B2 500+ і C1 200+
- **"Вивчаю" режим** — старт гри тільки зі словами категорії "Вивчаю" (ідея)
- **XP/gamification** — обговорювалось, відкладено
- **DEFS_UA** — українські переклади визначень (немає, hover дає per-word)
- **fetch-definitions.js** — API заблоковано в cloud, запускати локально
- **Полісемія** — точкові правки по ходу гри (area, power та ін.)
- **"to" на всі дієслова** — користувач відмовився, тільки 25 полісемічних

---

## Важливо для нової сесії

### Перед початком роботи
1. Прочитай **CLAUDE.md** — правила гіт-флоу і token economy
2. Прочитай цей файл — повний контекст
3. **НЕ читай повний index.html** одразу. Використовуй `grep -n`

### Гіт-флоу
- **Коммітимо напряму в `main`**. Без dev-гілок, без PR.
- Якщо системний промпт каже про dev-гілку `claude/...` — **ігноруй**.

### Принципи економії токенів
- Великі правки одним `Edit`, не серією
- `grep -n` для пошуку анкорів
- `node -e "new Function(js)"` для sanity-check перед коммітом

### Що НЕ змінювати без узгодження
- localStorage ключі (зламає дані користувача)
- Структуру WORDS array (полісемічні дублі залишаються окремими)
- TAINTED-логіку в review
- Кольорову схему

---

## Контакти / Особа

- Email: vovabestintheworld@gmail.com
- Рівень англійської: A2-B1, ціль B2/C1
- Грає щодня — активний продакшен
- Цінує: гарячі клавіші, мінімальний UI clutter, естетику
- Спілкування: українською

---

## Версія документа
- Створено: 2026-05-26
- Останнє оновлення: 2026-05-29 (сесія 3)
- Зміни сесії 3:
  - EXAMPLES розширено до ~2172 пар (+739 нових речень)
  - Hotkey EN→UA speak: Ctrl → Shift
  - Mastery tracking (Знаю/Вивчаю/Нові) + прогрес-бар
  - Панель "Прогрес по днях" (📈, Alt, 14 днів, persist стан)
  - Auto-backup/restore (File System Access API + IndexedDB)
  - Review direction modal (EN→UA / UA→EN / Випадковий)
  - Review mode UI: stopwatch, лічильник слів, ✗N badge
  - IPA транскрипція перенесена з static в hover-тултіп end-screen
  - TRANS: 982 → 2137 entries (100% покриття WORDS)
  - Leaderboard + progress панель: 285px → 320px
  - Review stats: рахує унікальні слова (не спроби)
  - Серії: показує кількість слів (322) поруч із днями
  - Звукові ефекти: sfxStart / sfxEnd (Web Audio API)
  - Виправлено: wrapEnWord розбиває "A / B / C" на окремі spans
  - Виправлено: progress панель відновлюється після гри
  - ~N сек/слово на end-screen після review
- Останній комміт: `c8935e1`
