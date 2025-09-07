# Kávový stánek — specifikace a návrh implementace (v1)

> Tento dokument popisuje aktuální návrh a referenční implementaci webové hry „Kávový stánek“ po posledních změnách: **platba je stále viditelná a aktivní (inline vpravo)**, **zrušeno tlačítko „K platbě“**, **aktivní zákazník se bere z fronty**. Dokument je psaný jako **requirements + technický návrh**, aby šlo hru rovnou implementovat či rozšířit. Volba frameworku je záměrně oddělená.

---

## Cíle

* Jedno-obrazovková webová hra (desktop + mobil) s minimem závislostí.
* Simulace obsluhy zákazníka na stánku: dialog, příprava položek, platba.
* Ekonomika bez abstraktních bodů: **náklady ingrediencí** vs **tržby položek**.
* Zákaznická **spokojenost (0–100)** a z ní plynoucí **reputace**.
* Laditelnost přes centrální **CONFIG**.

Mimo scope v1 (budoucí verze): reklamace po odchodu, stav zásob, hotovost a vracení peněz, stárnutí produktů, trpělivost a odchody z fronty do reputace (zatím ne), badge „Obsluhuji/Platba“.

---

## Slovník

* **Ingredience**: atomický vstup s nákladem (např. `dose_coffee`, `cup_S`).
* **Produkt**: pro v1 jen „Káva“ ve velikostech S/M/L.
* **Recept**: mapování ingredience → počet (např. Káva L: 3× `dose_coffee` + 1× `cup_L`).
* **Objednávka (order)**: 1–3 položky (váženo).
* **Aktuální položka**: rozpracovaný produkt během přípravy.
* **Spokojenost S**: 0–100 na zákazníka, mění se odměnami/penalizacemi.
* **Reputace**: průměr S obsloužených zákazníků (v1).

---

## Herní smyčka

1. **Spawn**: do fronty přichází zákazníci dle intervalu (v1: 8–12 s).
2. **Aktivace**: pokud není nikdo obsluhován, vezme se první z fronty jako `active`.
3. **Dialog**:

   * Barista pozdraví, vygeneruje se **objednávka** (1–3 položky, velikosti náhodně).
   * Možné další repliky zvyšují/snižují S.
4. **Příprava**:

   * **Pravidlo pořadí**: vždy nejdřív kelímek, až pak dávky kávy.
   * Každý klik na ingredienci **okamžitě účtuje náklad**.
   * „Koš“ zahodí jen rozpracovanou položku (už spotřebované náklady zůstávají).
   * „Dokončit položku“ přesune položku do **Připraveno**.
5. **Platba (inline vpravo, stále viditelná)**:

   * Zadání částky je **pořád aktivní**. Potvrzení je zvýrazněné.
   * Platba proběhne jen pokud **počet položek Objednáno = Připraveno** a částka je správně.
   * Po úspěchu se přičtou **tržby** + **spropitné** (dle S), reputace se aktualizuje.
6. **Další zákazník** nebo **konec směny / bankrot**.

---

## Stavový model

* Fáze hry: `Idle` → `Ordering` → `Preparing` → (volitelně `Payment` pouze logicky) → report.
* V v1 je platební panel stále otevřený; **logicky** platí, že potvrzení se smí provést až po splnění podmínek (viz níže).

---

## Ekonomika

### Náklady a tržby

* **Náklad** se strhává **okamžitě při použití ingredience**.
* **Tržba** se přičítá při úspěšné platbě za položky v objednávce.
* **Bank**: start dle `CONFIG.economy.bankStartCZK`. Pokud `allowNegativeBank=false` a bank ≤ 0, **konec hry (bankrot)**.

### Spropitné

* Aktivní (volitelně), v1: `linear60to8`
  `tip(S) = floor(max(0, (S/100 - 0.6) * 20))`  → max 8 Kč od cca S=100; 0 Kč pod S≈60.

---

## Spokojenost a reputace

### Penalizace a odměny

* Obecně:

  * **penalizace**: `ΔS = round( base * clamp( (100 - S)/penaltyBase, min, max ) )`, pak `S := clamp(S - ΔS, 0, 100)`
  * **odměna**: `ΔS = round( base * clamp( (100 - S)/rewardBase + 0.5, min, max ) )`, pak `S := clamp(S + ΔS, 0, 100)`
* Typické `base`:

  * `goodGreeting = +3`, `badReply = -4`
  * `wrongItemsAtPayment = -10`
  * `wrongTotalBeforeConfirm = -8`
* V čase (v1): S **decay** pro aktivního zákazníka dle persony, 1×/s.

### Reputace (v1)

* `reputation = average(S)` obsloužených zákazníků.
  Pozn.: Odchody z fronty do reputace započteme v další verzi.

---

## Fronta a persony

* **Fronta**: FIFO pole **objektů zákazníků**. Každý má `persona`, `S`, `phase` a časové značky.
* **Aktivace**: pokud `active == null`, vezmi `queue.shift()` jako aktuálního.
* **V1 spawn**: interval `[8, 12]` s; plánovaná změna na `[12, 18]` v dalším kole.
* **Trpělivost ve frontě**: v1 **ne**; budoucí verze zavede decay ve frontě a odchody.

---

## Uživatelské rozhraní (jedna obrazovka)

### Horní lišta

* **Vlevo**: Čas směny (`time`), Fronta (`queueTop`).
* **Střed**: nabídka replik (pozdrav, potvrzení, nevhodná replika).
* **Vpravo**: Pokladna (`bank`), Odbaveno (`served`), Reputace (`reputation`), Spokojenost barveným pruhem.

### Levý panel: Fronta

* Avatarem se zobrazuje prvních několik čekajících, počet v badge (`queueCount`).

### Střed: Příprava

* Bublina se stavem a shrnutím objednávky.
* **Aktuální položka**: ukazuje vybraný kelímek a přidané ingredience v pořadí.
* **Pracoviště**: Kelímky S/M/L, Konvice (dávka kávy), Dokončit položku, Koš, Dev konzole.

### Pravý panel: Výdej a Platba

* **Objednáno** vs **Připraveno** (seznam tagů).
* **Platba — stále viditelné**:

  * Input s číselnou klávesnicí.
  * Tlačítko **Potvrdit** výrazné (primární).
  * Chyba částky či blokace (neshoda seznamů) ukáže hlášku.

---

## Ovládací pravidla

* **Pořadí**: bez kelímku nelze nalévat kávu. Pokus o dávku bez kelímku:

  * účtuje **náklad dávky** a zaloguje „vylito na pult“,
  * zobrazí krátké varování,
  * stav S se nemění (v1; lze přidat penalizaci později).
* **Dokončit položku**:

  * přesune aktuální položku do „Připraveno“.
* **Koš**:

  * zruší jen **rozpracovanou položku**; náklady již proběhlých ingrediencí zůstávají.
* **Platba**:

  * potvrzení je možné pouze, když:

    1. existuje objednávka,
    2. `#Objednáno == #Připraveno`,
    3. částka = součet ceníkových cen položek.
  * jinak se platba **blokuje**, ukáže se chyba.

---

## Konfigurace (centrální)

```js
const CONFIG = {
  economy: {
    bankStartCZK: 200,
    allowNegativeBank: false,
    tip: { enabled: true, formula: "linear60to8" },
  },
  pricesCZK: { coffee: { S: 39, M: 49, L: 59 } },
  costsCZK: { dose_coffee: 7, cup_S: 3, cup_M: 4, cup_L: 5 },
  recipes: {
    coffee: {
      S: { dose_coffee: 1, cup_S: 1 },
      M: { dose_coffee: 2, cup_M: 1 },
      L: { dose_coffee: 3, cup_L: 1 },
    }
  },
  products: [{ id: "coffee", name: "Káva", sizes: ["S","M","L"], trainingVisible: true }],
  sizes: ["S","M","L"],
  personas: [
    { id: "default", name: "Běžný",     startSatisfactionRange: [60, 80], decayPerSecond: 0.25 },
    { id: "rush",    name: "Ve spěchu", startSatisfactionRange: [55, 70], decayPerSecond: 0.35 },
    { id: "chill",   name: "V pohodě",  startSatisfactionRange: [70, 90], decayPerSecond: 0.15 },
  ],
  spawn: { shiftDurationSec: 420, spawnIntervalSec: [8, 12], maxQueueVisual: 4 },
  orders: { itemCountWeights: { 1: 0.6, 2: 0.3, 3: 0.1 } },
  satisfaction: {
    clampMin: 0, clampMax: 100,
    penaltyScale: { base: 40, min: 0.5, max: 2.0 },
    rewardScale:  { base: 50, min: 0.5, max: 1.8 },
    base: {
      goodGreeting: 3,
      badReply: -4,
      wrongItemsAtPayment: -10,
      fastService: 6,
      wrongTotalBeforeConfirm: -8
    },
    fastThresholdSec: 15
  },
  ui: {
    dialogChoicesPerPhase: 3,
    showMenuBoard: true,
    showRunningTotal: false,
    devConsole: { enabled: true }
  },
};
```

---

## Datový model (typy)

```ts
type IngredientId = "dose_coffee" | "cup_S" | "cup_M" | "cup_L";
type Size = "S" | "M" | "L";

type Recipe = Record<IngredientId, number>; // požadované počty
type Actual = Partial<Record<IngredientId, number>>; // skutečné počty

type Product = { id: "coffee"; name: string; sizes: Size[] };

type OrderItem = { productId: "coffee"; size: Size; recipe: Recipe };
type Order = { id: string; items: OrderItem[]; prepared: Array<{productId:"coffee"; size: Size; actual: Actual}> };

type Persona = { id: string; name: string; startSatisfactionRange: [number, number]; decayPerSecond: number };

type Customer = {
  id: string;
  personaId: string;
  persona: Persona;
  S: number;                  // spokojenost 0..100
  phase: "Ordering" | "Preparing" | "Payment" | "Done";
  order: Order | null;
  timers: { enteredAt: number; lastEventAt: number; preparedAt: number | null };
};

type State = {
  shiftRemaining: number;
  bank: number; bankStart: number;
  customersServed: number; reputationSum: number;
  totalSpent: number; totalRevenue: number;
  queue: Customer[]; active: Customer | null;
  preparedForThisOrder: any[]; // záměrně jednoduché
  currentItem: { productId:"coffee"; size: Size; actual: Actual } | null;
  gameOver: boolean;
};
```

---

## Algoritmy a validační pravidla

### Výběr počtu položek v objednávce

```
r ← U(0,1)
if r < w1 then 1
else if r < w1+w2 then 2
else 3
```

### Penalizace/odměna

```
factorPenalty = clamp( (100 - S)/penaltyBase, min, max )
ΔS = round( base * factorPenalty )
S := clamp( S - ΔS, 0, 100 )
```

Analogicky pro odměnu.

### Platba

```
guard: active != null AND active.order != null
guard: count(ordered.items) == count(ordered.prepared)
sumExpected = Σ price(item)
if entered != sumExpected: show error, penalty(wrongTotalBeforeConfirm)
else:
  bank += sumExpected + tip(S)
  reputationSum += S; customersServed += 1
  active := null; promoteNext()
```

---

## Telemetrie a logování

* `eventLog`: textové záznamy s časem a volitelnými `ΔKč`, `ΔS`.
* Dev konzole (toggle `D`):

  * Tabulky: Game/Shift, Customer, Order/Recipe, Economy.
  * Log: posledních \~200 záznamů.

---

## Přístupnost a UX drobnosti (v1)

* Vizuální efekt stisku na všech tlačítkách.
* Tlačítko **Potvrdit** v platbě vizuálně zvýrazněné.
* Inline numpad pro mobil, `inputmode="numeric"`.
  (Volitelná v2: potvrzení Enterem, auto-focus při připravené objednávce.)

---

## Akceptační kritéria a testy (v1)

### Jednotkové/čisté funkce

* `fmtTime(0) → "00:00"`, `fmtTime(90) → "01:30"`, `fmtTime(599) → "09:59"`.
* `orderTotal([{S},{L}]) → 39+59`.
* `clamp(-5,0,10) → 0`, `clamp(7,0,10) → 7`, `clamp(15,0,10) → 10`.
* `formatOrderLabel(null) → "—"`, `formatOrderLabel({S,L}) → "S + L"`.

### Platba — blokace

* Bez objednávky: `finishPayment(...)` vrátí false, zobrazí chybu, nic se nezaúčtuje.
* Neshoda počtů: `finishPayment(correctSum)` vrátí false (blokace).
* Špatná částka: `finishPayment(wrongSum)` vrátí false, aplikuje se penalizace `wrongTotalBeforeConfirm`.
* Správná částka a shoda počtů: bank += sum + tip, reputace += S, `active := null`, fronta se posune.

### Pravidlo pořadí

* Klik na „Konvice“ bez kelímku: přičte **náklad dávky**, zaloguje chybu „vylito na pult“, nezmění `currentItem`.

### Ekonomika

* Každé kliknutí na ingredienci sníží `bank` o náklad ze `CONFIG.costsCZK`.
* „Koš“ nevrací náklady.

### Stav

* Spawn customer → fronta++ (vizualizace hlav).
* Pokud `active == null`, `promoteNext()` aktivuje prvního z fronty.

---

## Known gaps (zamýšlené změny pro další verzi)

* **Trpělivost ve frontě**: decay S čekajících, odchody při prahu, započtení do reputace.
* **Spawn interval**: změnit na `[12, 18]`.
* **Badge** „🙂 Obsluhuji / 🙂 Platba“ u přípravy/výdeje.
* **Reputace**: počítat i odcházející z fronty.
* **Hotovost a vrácení**: nový modul (bankovky/mince, zadání bankovky, výpočet vrácení).
* **Reklamace po odchodu**: možnost vrátit se a snížit reputaci.
* **Rozšířená nabídka**: mléko, sirupy, další produkty a recepty.

---

## Ne-funkční požadavky

* **Výkon**: žádné knihovny, DOM do stovek uzlů, 60 FPS nepotřebujeme, ale UI plynulé.
* **Kompatibilita**: poslední verze Chrome/Edge/Firefox, iOS Safari 15+.
* **Responsivita**: min. šířka 360 px.
* **Stabilita**: guardy při renderu, žádné pády při chybějících elementech.
* **Konfigurovatelnost**: všechny laditelné hodnoty v `CONFIG`.

---

## Referenční implementace (odděleně od frameworku)

* **Záměr**: držet implementaci „vanilla“ (HTML/CSS/JS) bez build kroku.
* Při přechodu na framework (React/Svelte/Vue/solid) zachovat:

  * Jediný globální `CONFIG`.
  * Čisté util funkce pro ekonomiku a S.
  * Stavový model `State`, ideálně převedený na store.
  * Oddělené komponenty pro: Topbar, Frontu, Přípravu, Výdej/Platbu, Dev konzoli.
* Testy lze přepsat do `vitest/jest` (čisté funkce) a `playwright` (E2E scénáře).

---

## Otevřené otázky k potvrzení

1. **Spropitné**: ponechat lineární model do max 8 Kč, nebo vazba na rychlost/počet chyb?
2. **Penalizace „káva bez kelímku“**: má krom nákladů krátce snižovat S?
3. **Konec směny**: pevná délka (7 min), nebo cíl „obsluž X zákazníků“?
4. **Mobilní UX**: má Enter z klávesnice potvrzovat platbu?
5. **Spawn**: okamžitě přepnout na `[12, 18]`, nebo až s trpělivostí fronty?

---

## Příloha A: minimální API událostí (log)

* `logEvent(message, deltaBank?, deltaS?)`
  Příklady:

  * „Zadána objednávka zákazníka“
  * „Spotřeba: Kelímek M“ `ΔKč -4`
  * „Dávka kávy (vylito na pult)“ `ΔKč -7`
  * „Pokus o platbu se špatným počtem položek“ `ΔS -X`
  * „Platba 98 + sprop. 6“ `ΔKč +104`

---

Tímhle máš shodu reality s implementací. Jakmile potvrdíš otevřené body, doplním v2 (trpělivost fronty, pomalejší spawn, badge) do dokumentu i kódu bez dalšího cukrování.
