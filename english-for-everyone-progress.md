# English for Everyone — журнал опрацювання (ТИМЧАСОВИЙ)

> Проходимо візуальний словник **English for Everyone** (PDF, 402 с.) зі скріншотів,
> запозичуючи в `index.html` лише доречну лексику.
> ⚠️ **Після завершення проходу цей файл ПРИБРАТИ** (за домовленістю з користувачем).
> 📌 Нова сесія: прочитай цей файл, щоб знати, на якій сторінці ми зупинились.

## Параметри відбору
- Цільовий рівень: **B2–C2**; перспектива словника — **~10 000 слів**.
- **Беремо:** загальновживане + помірно-спеціалізоване, корисне на B2–C2, чого ще немає.
- **Пропускаємо:** лише зовсім вузьку латину/терміни поза будь-яким загальним вжитком
  (напр. `latissimus dorsi`, `metacarpals`).
- Кожне нове слово — повноцінно (WORDS + IPA + приклад EN/UA + hover) + `node check-coverage.js`.
- Темп: показую кандидатів → користувач каже «давай» → додаю. Очевидні прогалини/прямі
  запити роблю одразу.

## Стандартна процедура нової сторінки (скріншот = завдання, без додаткових слів)

Коли користувач кидає скріншот сторінки — нічого не перепитуй, одразу:
1. Перевір покриття ВСІХ слів сторінки по WORDS (grep по index.html).
2. Покажи ДВА списки:
   - **«Точно варто додати»** — корисне в реальному житті, з пропонованими глосами;
   - **«Не сильно пригодяться / пропускаю»** — з коротким поясненням чому.
   Фільтруй ПОМІРКОВАНО — без надмірної критичності: сумнівне слово став у кандидати
   з позначкою «на межі», фінальне рішення за користувачем.
3. Чекай «давай» (або корекцій) → додай повноцінно (чеклист вище) + `node check-coverage.js`
   до ✅ OK → онови журнал і лічильник сторінок у цьому файлі → коміт у `main`.
- Фрази з 2+ слів за замовчуванням пропускаємо; виняток — усталені фразові дієслова
  (прецеденти: pick up, drop off) та терміни, де складники покриваються hover'ом через `m.set`.

## Прогрес
- **Остання опрацьована сторінка: 24** (з 402)
- **Наступна: 25**

> **⚠️ Декуттер анатомії (сесія 35):** за запитом користувача прибрано **20 вузьких
> анатомічних термінів** зі стор. 12–19 (він не вживає їх ні англійською, ні українською):
> larynx, trachea, lymphatic, adrenal gland, breastbone, instep, cuticle, quadriceps,
> pectoral, spleen, cervix, pancreas, gall bladder, thyroid gland, gland, ovary, navel,
> pelvis, cartilage, palate. **Лишено за прямим проханням:** esophagus, endocrine, small/large
> intestine, deltoid, scrotum, urinary («пригодиться»). «gland» → hover-only. Метод: панель
> суддів (3 лінзи: побут / медіа / тест рідною) класифікувала всі 91 анат. слово, користувач
> затвердив фінальний список. WORDS 2802→2782. Якщо колись знадобляться — дані в git-історії.

## Журнал по сторінках

### Стор. 24 — «07 Life events» (7.1 Relationships / 7.2 Life events / 7.3 Festivals)
- **+11 нових:** acquaintance(знайомий), honeymoon(медовий місяць), retire(виходити на пенсію),
  emigrate(емігрувати), Christmas(Різдво), Easter(Великдень+Пасха), Halloween(Геловін),
  Thanksgiving(День подяки), carnival(карнавал), baptism(хрещення), kindergarten(дитячий садок
  — МОЄ рішення замість preschool/nursery: універсальніше; christening пропущено як рідший
  синонім baptism).
- **+2 у «Вирази і сленг»** (рішення користувача: фрази НЕ в словник, а в розділ виразів):
  to fall in love(закохатися), make a will(скласти заповіт — замість слова will=заповіт,
  за порадою GPT: без плутанини з модальним will).
- **Пропущено:** Kwanzaa/Diwali/Holi/Baisakhi/Eid al-Fitr/Day of the Dead/Hajj/bar mitzvah/
  Passover/Hanukkah (вузькокультурні свята); складені фрази (pen pal, best friend, birth
  certificate, engaged/married couple тощо) — складники покриті.
- Вже було покрито: neighbor, friend, colleague, couple, partner, fiancé(e), bride, groom,
  to marry, birthday, present, wedding, anniversary, divorce, die, funeral, graduate, born, prize.
| Стор. | Тема | Додано | Вже було / на розгляді |
|-------|------|--------|------------------------|
| 12–13 | Parts of the body / face / eyes | **+20:** abdomen, thigh, groin, genitals, calf(+теля), breast, nipple, armpit, waist, forearm, navel, shin, eyelid, eyebrow, jaw, nostril, eyelash, iris(+ірис), pupil(+учень), hazel. Раніше: green(фікс), gray(US). `temple` +«скроня». Пропущено: tear duct (фраза). | вже були: head, shoulder, chest, arm, hand, leg, foot, heel, ankle, wrist, hip, elbow, knee, neck, chin, cheek, forehead, hair, skin, eye, ear, nose, mouth, lips, teeth, blue, brown, grey |
| 14–15 | Hands and feet | **+26:** palm, fingernail, cuticle, knuckle, fist, sole, toe, instep, toenail, arch; wink, blink, blush, yawn, snore, lick, suck, sigh, shrug, bow, clap, sweat, perspire, shiver, sneeze, nod. **smile-група:** smile(+посмішка/усмішка), grin(уточнено «широко усміхатися»), +smirk, +beam. Пропущено: фрази (grin from ear to ear, flash/force/give a smile). | finger, thumb, wrist, heel, ankle, ball, ring, middle, big, little, bridge, laugh, cry, breathe, to wave, to frown |
| 16–17 | Muscles and skeleton / teeth | **+24:** skull, rib, rib cage, pelvis, joint, skeleton, buttock, cartilage, ligament, tendon, biceps, triceps, gum, nerve, enamel, pulp, collarbone, breastbone, shoulder blade, kneecap + фітнес: deltoid, quadriceps, hamstring, pectoral. **Пропущено вузьку латину:** latissimus dorsi, gluteus, humerus, scapula, clavicle, sternum, ulna, radius, carpals, metacarpals, phalanges, femur, tibia, fibula, patella, tarsals, metatarsals, sacrum, coccyx, vertebrae, obliques, abdominals, incisors, canines, molars, premolars. | tooth, back, bone, chest, calf, jaw, root, spine, muscle, front, hip |
| 18–19 | Internal organs / head / reproductive | **+41:** lung, liver, kidney, appendix(+додаток), spleen, pancreas, intestine(+кишка), small intestine, large intestine, gall bladder, thyroid gland, adrenal gland, trachea, gland; respiratory, digestive, urinary, endocrine, lymphatic, reproductive, cardiovascular, vein, artery; palate, spinal cord, esophagus, sinus(+синус), larynx, vocal cords, Adam's apple; male, female, penis, vagina, testicle, scrotum, ovary, uterus, womb, cervix, prostate. Компоненти багатослівних термінів (gall/bladder/thyroid/adrenal/spinal/cord/vocal) — hover через `m.set`. **Пропущено вузьке (за домовленістю):** pharynx, epiglottis, seminal gland, fallopian tube. | вже були: heart, stomach, nervous, brain, throat, tongue |
| 20–21 | Family / life events | **+9:** couple(пара/подружжя — базове було ВІДСУТНЄ!), marriage(шлюб — теж), divorce(розлучення/розлучатися), divorced, widow(вдова), widower(вдівець), to grow up(виростати/дорослішати — фразове), toddler(«малюк (1-3 роки)» — хінт, бо малюк=baby), triplets(трійнята). **Збагачено:** engaged +заручений/заручена (було лише «зайнятий»). **Пропущено:** sister/brother-in-law (⚠️ guard сесії 32 — не повертати), twins (множина twin), to be born (born уже приймає народитися), single parent/middle-aged (прозорі композити → EXPRESSIONS як треба буде). | вже були: family, parents, husband, wife, twin, teenager, adult, partner, nephew, niece, uncle, aunt, cousin, step-родина, mother/father/son/daughter-in-law, born, generation, bride, groom, wedding, married, to marry, baby, grandson/granddaughter/great-* |
| 22–23 | Feelings and moods | **+19:** surprised(здивований), amazed(вражений), confused(розгублений), bored(знуджений), embarrassed(збентежений), frustrated(фрустрований — «розчарований»=disappointed), guilty(винний), shocked(шокований), stressed(у стресі), hopeful(сповнений надії), thrilled(у захваті — «захоплений»=keen→uaAlt), tearful(заплаканий), amused(розвеселений), distracted(розсіяний), indifferent(байдужий), sympathetic(співчутливий), intrigued(заінтригований), ecstatic(в екстазі), disgusted(з огидою/+огиджений). **compassionate розведено з sympathetic (GPT-нюанс):** compassionate=[милосердний,співчутливий] (милосердний+готовий допомогти) vs sympathetic=співчутливий (розуміє почуття). **Пропущено:** appreciative (вдячний=grateful), unenthusiastic/unimpressed (прозорі un-негативи). | вже були (36): pleased, cheerful, happy, delighted, grateful, lucky, interested, curious, proud, excited, calm, relaxed, confident, jealous, annoyed, irritated, disappointed, worried, anxious, nervous, frightened, scared, terrified, sad, unhappy, miserable, depressed, lonely, angry, mad, furious, tired, exhausted, serious, upset + surprise/stress/hope |

> Поза сторінками (за прямими запитами / зауваженнями під час гри): `race` +[раса,заїзд,перегони];
> `lift` +[піднімати,ліфт]; нове `elevator`=ліфт; `web`-приклад → «мережа»; `unexpected`/`clarify`
> +форми; `unexpectedly` виокремлено окремим словом; `offer` +пропозиція; `handle` → омограф
> (handle=ручка / to handle=справлятися — прибрано хибний pen на «справлятися»); `snack`
> +[перекус,закуска]; `spend` +[тратити,проводити]; `notice` +[повідомлення,оголошення].
> UI: кнопку фінал-екрану «Спробувати ще раз» → «🏠 На головну».
> `scramble` — прибрано хибне «метушитися» (→ ua:[збивати,дертися] + uaAlt); натомість
> нові `fuss`=[метушитися,метушня] (enAlt fidget) та `fidget`=[соватися,вертітися].
> bustle/scurry/fluster пропущено (вузькі, колізія кластера «метушитися»).
> Полісемії/uaAlt: destination(+пункт призначення), grab(+схопити), notebook(+записник/блокнот),
> guard(омонім: [охороняти,охоронець]+uaAlt), customer(+покупець/замовник),
> coat(+шар/покриття/шерсть uaAlt + hover «шар (фарби)»), unlocked(+відчинений/відкритий/
> розблокований та -о-форми uaAlt), unlock(+розблокувати/відімкнути uaAlt),
> prevail(«переважати» в ОСНОВНІ — свідомий дубль із to dominate; +uaAlt панувати/брати гору).
> **Торговельний кластер (+11, за списком ChatGPT, верифіковано воркфлоу):** client(клієнт),
> buyer(покупець), consumer(споживач), vendor(торговець), seller(продавець), merchant(купець),
> retailer(роздрібний продавець), wholesaler(оптовик), supplier(постачальник), dealer(дилер),
> distributor(дистриб'ютор). Основні глоси РОЗВЕДЕНО (спільні продавець/торговець/постачальник →
> uaAlt), тож єдина колізія-синонім у ua-en — «клієнт» (client+customer). purchaser/shopper
> пропущено (дублювали «покупець» з buyer). «goods» у прикладах уникаємо (стемиться на good→«добрий»).
> **Кластер «вплив/переконання» (+7, список ChatGPT, верифіковано воркфлоу):** нові sway(схиляти,
> +фіз. гойдатися/хитатися в uaAlt), persuade(умовляти), convince(переконувати), inspire(надихати),
> motivate(мотивувати), manipulate(маніпулювати), to shape(формувати — омограф до shape=форма за
> патерном handle). Збагачено uaAlt: impact(+впливати/сильний вплив), influence(+вплив),
> effect(+наслідок/результат/вплив/дія), affect(+позначатися/зачіпати),
> encourage(+підбадьорювати/підтримувати/спонукати), pressure(+тиснути/чинити тиск).
> Відхилені глоси ChatGPT: convince≠«довести»(=prove), manipulate≠«використовувати»(=use),
> influence≠«впливовість», pressure≠«примушувати»(=force). persuade/convince свідомо розведено
> (умовляти vs переконувати).
> **Логістичний кластер (+12, список GPT, верифіковано воркфлоу):** haul, tow, load(вантажити —
> «завантажувати»=download!), unload, wrap, mail, drop off, pick up (фразові — багатослівні ключі),
> convey(доносити (думку) — «передавати»=transfer), relay(переказувати), escort, deploy.
> Збагачено uaAlt: move(+рухати/переміщати/пересувати/переїжджати), ship(+відправляти/пересилати/
> судно — дієслово було непокрите), forward(+пересилати/переадресовувати), carry, drag(+волочити
> в основні), collect, receive, pack, package(+посилка), dispatch.
> **Кластер «страх» (+6, GPT):** worried, panic, horrified(у жаху), alarmed, startled, petrified;
> terrified→нажаханий (градація); fear/scared/frightened/afraid збагачено uaAlt.
> **«Шкала сили» (+5, GPT):** tap(+кран), pat, whack, slam, bang(грюкіт/бахнути).
> **«Відчуття» (+2, GPT):** sensation(фізичне відчуття/сенсація), perception(сприйняття);
> sense=[відчуття,чуття,сенс] (+глузд/зміст — make sense був непокритий); feel/feeling/emotion uaAlt.
> **«Будівництво» (+3, GPT):** builder, construction(+конструкція), construction site (site→m.set).
> **old/older/elder/elderly/aged (GPT):** elder+enAlt older; aged+віком/у віці; old+давній.
> **+mayor**(мер — пара плутання до major); major розширено (+серйозний/майор/мажор/спеціальність).
> Полісемії поточні: shift(+зсув), smooth(+рівний/плавний), seize(+вилучати), spread(+поширювати),
> email(+електронний лист), renowned(+відомий), amazing(+разючий), impossible(+неможливо),
> perform(+виступати), master(+оволодівати/майстер; набувати/добувати ВІДХИЛЕНО),
> pick/choose/select(+обирати), mom/mother і backward/back — взаємні enAlt, coat(+шар),
> unlocked/unlock(+розблокований), prevail(+переважати), cough(+кашель), treat(+лікувати/частувати),
> working/worker/employee (кластер «робочий»), cherish/treasure, transfer «перевести (гроші)» +
> slack «млявий (про справи)» — дисплей-підказки.
> **Логістичний кластер (+12, GPT, воркфлоу):** haul, tow, load(вантажити — завантажувати=download!),
> unload, wrap, mail, drop off, pick up (ПЕРШІ фразові — ключі з пробілом), convey(доносити (думку)),
> relay(переказувати), escort, deploy; збагачено move/ship(відправляти)/forward/carry/drag/collect/
> receive/pack/package/dispatch.
> **Кластер «плач/скорбота» (+3, GPT):** grieve(горювати), lament(голосити), death(смерть — базове,
> зловив чекер); sob=[ридати,схлипувати], weep/mourn збагачено. reveal(+виявляти).
> **ЧИСЛА (+14):** eleven/twelve (дірка між ten і thirteen!), billion, порядкові fourth,sixth-tenth,
> dozen, double, triple, pair(«пара (двох речей)»—хінт бо couple), once. Дні тижня 7/7 і місяці 12/12
> були повними.
> **ЧАС (+5):** today/tomorrow/yesterday/tonight (були лише hover m.set — всупереч правилу сесії 11!),
> weekday. **master**(+оволодівати/освоювати/майстер; набувати=acquire/добувати=extract ВІДХИЛЕНО).
>
> За тематичним списком користувача (синоніми/частини мови, не зі сторінок): **+10 нових** —
> response, treatment, expansion, movement, criticism, universal, rapidly, correctly, politely,
> generally; **+значення (uaAlt)** — reply(відповідь), change(зміна), attack(атака/напад),
> surprise(дивувати), clear(очищати).
