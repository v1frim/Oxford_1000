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

## Прогрес
- **Остання опрацьована сторінка: 19** (з 402)
- **Наступна: 20**

## Журнал по сторінках
| Стор. | Тема | Додано | Вже було / на розгляді |
|-------|------|--------|------------------------|
| 12–13 | Parts of the body / face / eyes | **+20:** abdomen, thigh, groin, genitals, calf(+теля), breast, nipple, armpit, waist, forearm, navel, shin, eyelid, eyebrow, jaw, nostril, eyelash, iris(+ірис), pupil(+учень), hazel. Раніше: green(фікс), gray(US). `temple` +«скроня». Пропущено: tear duct (фраза). | вже були: head, shoulder, chest, arm, hand, leg, foot, heel, ankle, wrist, hip, elbow, knee, neck, chin, cheek, forehead, hair, skin, eye, ear, nose, mouth, lips, teeth, blue, brown, grey |
| 14–15 | Hands and feet | **+26:** palm, fingernail, cuticle, knuckle, fist, sole, toe, instep, toenail, arch; wink, blink, blush, yawn, snore, lick, suck, sigh, shrug, bow, clap, sweat, perspire, shiver, sneeze, nod. **smile-група:** smile(+посмішка/усмішка), grin(уточнено «широко усміхатися»), +smirk, +beam. Пропущено: фрази (grin from ear to ear, flash/force/give a smile). | finger, thumb, wrist, heel, ankle, ball, ring, middle, big, little, bridge, laugh, cry, breathe, to wave, to frown |
| 16–17 | Muscles and skeleton / teeth | **+24:** skull, rib, rib cage, pelvis, joint, skeleton, buttock, cartilage, ligament, tendon, biceps, triceps, gum, nerve, enamel, pulp, collarbone, breastbone, shoulder blade, kneecap + фітнес: deltoid, quadriceps, hamstring, pectoral. **Пропущено вузьку латину:** latissimus dorsi, gluteus, humerus, scapula, clavicle, sternum, ulna, radius, carpals, metacarpals, phalanges, femur, tibia, fibula, patella, tarsals, metatarsals, sacrum, coccyx, vertebrae, obliques, abdominals, incisors, canines, molars, premolars. | tooth, back, bone, chest, calf, jaw, root, spine, muscle, front, hip |
| 18–19 | Internal organs / head / reproductive | **+41:** lung, liver, kidney, appendix(+додаток), spleen, pancreas, intestine(+кишка), small intestine, large intestine, gall bladder, thyroid gland, adrenal gland, trachea, gland; respiratory, digestive, urinary, endocrine, lymphatic, reproductive, cardiovascular, vein, artery; palate, spinal cord, esophagus, sinus(+синус), larynx, vocal cords, Adam's apple; male, female, penis, vagina, testicle, scrotum, ovary, uterus, womb, cervix, prostate. Компоненти багатослівних термінів (gall/bladder/thyroid/adrenal/spinal/cord/vocal) — hover через `m.set`. **Пропущено вузьке (за домовленістю):** pharynx, epiglottis, seminal gland, fallopian tube. | вже були: heart, stomach, nervous, brain, throat, tongue |

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
> guard(омонім: [охороняти,охоронець]+uaAlt), customer(+покупець/замовник).
> **Торговельний кластер (+11, за списком ChatGPT, верифіковано воркфлоу):** client(клієнт),
> buyer(покупець), consumer(споживач), vendor(торговець), seller(продавець), merchant(купець),
> retailer(роздрібний продавець), wholesaler(оптовик), supplier(постачальник), dealer(дилер),
> distributor(дистриб'ютор). Основні глоси РОЗВЕДЕНО (спільні продавець/торговець/постачальник →
> uaAlt), тож єдина колізія-синонім у ua-en — «клієнт» (client+customer). purchaser/shopper
> пропущено (дублювали «покупець» з buyer). «goods» у прикладах уникаємо (стемиться на good→«добрий»).
>
> За тематичним списком користувача (синоніми/частини мови, не зі сторінок): **+10 нових** —
> response, treatment, expansion, movement, criticism, universal, rapidly, correctly, politely,
> generally; **+значення (uaAlt)** — reply(відповідь), change(зміна), attack(атака/напад),
> surprise(дивувати), clear(очищати).
