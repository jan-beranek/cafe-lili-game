(() => {
  // docs/js/config.js
  var CONFIG = {
    economy: {
      bankStartCZK: 200,
      allowNegativeBank: false,
      tip: { enabled: true, formula: "linear60to8" }
    },
    pricesCZK: { coffee: { S: 39, M: 49, L: 59 } },
    costsCZK: { dose_coffee: 7, cup_S: 3, cup_M: 4, cup_L: 5 },
    recipes: {
      coffee: {
        S: { dose_coffee: 1, cup_S: 1 },
        M: { dose_coffee: 2, cup_M: 1 },
        L: { dose_coffee: 3, cup_L: 1 }
      }
    },
    products: [
      { id: "coffee", name: "K\xE1va", sizes: ["S", "M", "L"], trainingVisible: true }
    ],
    sizes: ["S", "M", "L"],
    denominationsCZK: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1e3, 2e3],
    personas: [
      { id: "default", name: "B\u011B\u017En\xFD", startSatisfactionRange: [60, 80], decayPerSecond: 0.25 },
      { id: "rush", name: "Ve sp\u011Bchu", startSatisfactionRange: [55, 70], decayPerSecond: 0.35 },
      { id: "chill", name: "V pohod\u011B", startSatisfactionRange: [70, 90], decayPerSecond: 0.15 }
    ],
    spawn: { shiftDurationSec: 420, spawnIntervalSec: [8, 12], maxQueueVisual: 4 },
    orders: { itemCountWeights: { 1: 0.6, 2: 0.3, 3: 0.1 } },
    satisfaction: {
      clampMin: 0,
      clampMax: 100,
      penaltyScale: { base: 40, min: 0.5, max: 2 },
      rewardScale: { base: 50, min: 0.5, max: 1.8 },
      base: {
        goodGreeting: 3,
        badReply: -4,
        wrongItemsAtPayment: -10,
        fastService: 6,
        wrongTotalBeforeConfirm: -8
      },
      fastThresholdSec: 15
    },
    ui: { dialogChoicesPerPhase: 3, showMenuBoard: true, showRunningTotal: false, devConsole: { enabled: true } }
  };

  // docs/js/state.js
  var State = {
    tickHandle: null,
    decayHandle: null,
    spawnTimer: null,
    shiftRemaining: CONFIG.spawn.shiftDurationSec,
    bank: CONFIG.economy.bankStartCZK,
    bankStart: CONFIG.economy.bankStartCZK,
    customersServed: 0,
    reputationSum: 0,
    totalSpent: 0,
    totalRevenue: 0,
    queue: [],
    active: null,
    phase: "Idle",
    preparedForThisOrder: [],
    currentItem: null,
    eventLog: [],
    gameOver: false
  };
  function resetState() {
    State.shiftRemaining = CONFIG.spawn.shiftDurationSec;
    State.bank = CONFIG.economy.bankStartCZK;
    State.bankStart = CONFIG.economy.bankStartCZK;
    State.customersServed = 0;
    State.reputationSum = 0;
    State.totalSpent = 0;
    State.totalRevenue = 0;
    State.gameOver = false;
    State.eventLog = [];
    State.queue = [];
    State.active = null;
    State.phase = "Idle";
    State.preparedForThisOrder = [];
    State.currentItem = null;
  }

  // docs/js/utils.js
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }
  function randInt(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1));
  }
  var el = (id) => document.getElementById(id);
  function fmtTime(s) {
    s = Math.max(0, Math.floor(s));
    const m = Math.floor(s / 60), r = s % 60;
    return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  function logEvent(msg, deltaBank = 0, deltaS = 0) {
    const t = (/* @__PURE__ */ new Date()).toLocaleTimeString();
    State.eventLog.unshift(`[${t}] ${msg} ${deltaBank ? `(\u0394K\u010D ${deltaBank})` : ""} ${deltaS ? `(\u0394S ${deltaS})` : ""}`);
    if (State.eventLog.length > 200) State.eventLog.pop();
  }
  function formatOrderLabel(order) {
    if (!order) return "\u2014";
    return order.items.map((it) => `${it.size}`).join(" + ");
  }
  function pickPersona(personas) {
    return personas[Math.random() * personas.length | 0];
  }

  // docs/js/satisfaction.js
  function applyPenalty(base) {
    const S = State.active?.S ?? 50;
    const sc = CONFIG.satisfaction.penaltyScale;
    const factor = clamp((100 - S) / sc.base, sc.min, sc.max);
    const delta = Math.round(base * factor);
    if (State.active) {
      State.active.S = clamp(
        State.active.S - delta,
        CONFIG.satisfaction.clampMin,
        CONFIG.satisfaction.clampMax
      );
    }
    return -delta;
  }
  function applyReward(base) {
    const S = State.active?.S ?? 50;
    const sc = CONFIG.satisfaction.rewardScale;
    const factor = clamp((100 - S) / sc.base + 0.5, sc.min, sc.max);
    const delta = Math.round(base * factor);
    if (State.active) {
      State.active.S = clamp(
        State.active.S + delta,
        CONFIG.satisfaction.clampMin,
        CONFIG.satisfaction.clampMax
      );
    }
    return +delta;
  }
  function tipFromS(S) {
    if (!CONFIG.economy.tip.enabled) return 0;
    return Math.max(0, Math.floor((S / 100 - 0.6) * 20));
  }

  // docs/js/render.js
  function render() {
    const pp = el("paymentPanel");
    if (pp) pp.style.display = "block";
    const tEl = el("time");
    if (tEl) tEl.textContent = fmtTime(State.shiftRemaining);
    const bEl = el("bank");
    if (bEl) bEl.textContent = `${State.bank} K\u010D`;
    const sEl = el("served");
    if (sEl) sEl.textContent = `${State.customersServed}`;
    const rep = State.customersServed ? (State.reputationSum / State.customersServed).toFixed(1) : "0.0";
    const rEl = el("reputation");
    if (rEl) rEl.textContent = rep;
    const q = el("queueHeads");
    if (q) {
      q.innerHTML = "";
      const heads = Math.min(CONFIG.spawn.maxQueueVisual, State.queue.length);
      for (let i = 0; i < heads; i++) {
        const d = document.createElement("div");
        d.className = "head";
        d.textContent = "\u{1F642}";
        q.appendChild(d);
      }
    }
    const qcEl = el("queueCount");
    if (qcEl) qcEl.textContent = String(State.queue.length);
    const qt = el("queueTop");
    if (qt) qt.textContent = String(State.queue.length);
    if (State.active) {
      const ol = el("orderLabel");
      if (ol) ol.textContent = formatOrderLabel(State.active.order);
      const ph = el("phase");
      if (ph) ph.textContent = State.active.phase;
      const sb = el("sbar");
      if (sb) sb.style.width = `${State.active.S}%`;
    } else {
      const ol = el("orderLabel");
      if (ol) ol.textContent = "\u2014";
      const ph = el("phase");
      if (ph) ph.textContent = "\u2014";
      const sb = el("sbar");
      if (sb) sb.style.width = "0%";
    }
    const OL = el("orderedList");
    if (OL) OL.innerHTML = "";
    const PL = el("preparedList");
    if (PL) PL.innerHTML = "";
    if (State.active && State.active.order && OL && PL) {
      for (const it of State.active.order.items) {
        OL.appendChild(tag(it.size));
      }
      for (const it of State.active.order.prepared) {
        PL.appendChild(tag(it.size));
      }
    }
    renderCurrentItemPanel();
    if (document.getElementById("dev").style.display !== "none") {
      renderDev();
    }
  }
  function renderCurrentItemPanel() {
    const lbl = el("curItemLabel");
    const ing = el("curItemIngredients");
    if (!lbl || !ing) return;
    if (State.currentItem) {
      lbl.textContent = `K\xE1va ${State.currentItem.size}`;
      const a = State.currentItem.actual;
      const parts = [];
      if (a.cup_S) parts.push("kel\xEDmek S");
      if (a.cup_M) parts.push("kel\xEDmek M");
      if (a.cup_L) parts.push("kel\xEDmek L");
      if (a.dose_coffee) parts.push(`k\xE1va \xD7${a.dose_coffee}`);
      ing.textContent = parts.length ? parts.join(" + ") : "zat\xEDm bez ingredienc\xED";
    } else {
      lbl.textContent = "\u2014";
      ing.textContent = "\u2014";
    }
  }
  function tag(size) {
    const span = document.createElement("span");
    span.className = "tag " + size.toLowerCase();
    span.textContent = "K\xE1va " + size;
    return span;
  }
  function flashPhase(msg) {
    const elp = el("phase");
    if (!elp) return;
    const old = elp.textContent;
    elp.textContent = msg;
    elp.style.color = "#a33";
    setTimeout(() => {
      elp.textContent = State.active ? State.active.phase : "\u2014";
      elp.style.color = "";
    }, 900);
  }
  function showPayErrorInline(v) {
    const e = el("payErrorInline");
    if (e) e.style.display = v ? "block" : "none";
  }
  function buildKeypad() {
    const KP = el("keypadInline");
    if (!KP) return;
    KP.innerHTML = "";
    const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "C", "0", "\u2190"];
    keys.forEach((k) => {
      const b = document.createElement("button");
      b.textContent = k;
      b.addEventListener("click", () => {
        const input = el("payInputInline");
        if (k === "C") input.value = "";
        else if (k === "\u2190") input.value = input.value.slice(0, -1);
        else input.value += k;
        showPayErrorInline(false);
      });
      KP.appendChild(b);
    });
  }
  function renderDev() {
    const rows = (obj) => Object.entries(obj).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("");
    const avg = State.customersServed ? (State.reputationSum / State.customersServed).toFixed(1) : "0.0";
    el("tblGame").innerHTML = rows({
      Time: fmtTime(State.shiftRemaining),
      Bank: `${State.bank} / start ${State.bankStart} / profit ${State.bank - State.bankStart}`,
      Customers: `${State.customersServed}`,
      Reputation: `${avg}`,
      Queue: State.queue.length
    });
    const cust = State.active ? {
      Persona: `${State.active.personaId} (decay ${State.active.persona.decayPerSecond}/s)`,
      S: State.active.S.toFixed(1),
      Phase: State.active.phase,
      Order: formatOrderLabel(State.active.order),
      Prepared: State.active.order ? State.active.order.prepared.length + " ks" : "\u2014"
    } : { Persona: "-", S: "-", Phase: "-", Order: "-", Prepared: "-" };
    el("tblCust").innerHTML = rows(cust);
    const curIt = State.currentItem ? JSON.stringify(State.currentItem.actual) : "-";
    const must = State.currentItem ? JSON.stringify(CONFIG.recipes.coffee[State.currentItem.size]) : "-";
    el("tblOrder").innerHTML = rows({ CurrentItem: curIt, Recipe: must, Valid: "\u2014" });
    el("tblEco").innerHTML = rows({ TotalSpent: State.totalSpent, TotalRevenue: State.totalRevenue, TipModel: CONFIG.economy.tip.formula });
    const log = el("eventLog");
    log.innerHTML = State.eventLog.map((l) => `<div>${escapeHtml(l)}</div>`).join("");
  }
  function toggleDev() {
    const dv = el("dev");
    dv.style.display = dv.style.display === "none" ? "block" : "none";
    render();
  }

  // docs/js/economy.js
  function spend(cost, label) {
    State.bank -= cost;
    State.totalSpent += cost;
    logEvent(`Spot\u0159eba: ${label}`, -cost, 0);
    if (!CONFIG.economy.allowNegativeBank && State.bank <= 0) {
    }
    render();
  }
  function earn(amount, label) {
    State.bank += amount;
    State.totalRevenue += amount;
    logEvent(`Tr\u017Eba: ${label}`, +amount, 0);
    render();
  }

  // docs/js/orders.js
  function chooseItemCount() {
    const w = CONFIG.orders.itemCountWeights;
    const r = Math.random();
    const w1 = w[1] ?? 0.6, w2 = w[2] ?? 0.3, w3 = w[3] ?? 0.1;
    if (r < w1) return 1;
    if (r < w1 + w2) return 2;
    return 3;
  }
  function newOrderWeighted() {
    const n = chooseItemCount();
    const items = [];
    for (let i = 0; i < n; i++) {
      const size = CONFIG.sizes[Math.random() * CONFIG.sizes.length | 0];
      const recipe = CONFIG.recipes.coffee[size];
      items.push({ productId: "coffee", size, recipe });
    }
    return { id: "ORD" + Date.now(), items, prepared: [] };
  }
  function orderTotal(order) {
    let sum = 0;
    for (const it of order.items) {
      sum += CONFIG.pricesCZK[it.productId][it.size];
    }
    return sum;
  }

  // docs/js/report.js
  function showReport(title) {
    el("reportTitle").textContent = title;
    const avg = State.customersServed ? (State.reputationSum / State.customersServed).toFixed(1) : "0.0";
    const body = `
    <div>Obslou\u017Eeno: <strong>${State.customersServed}</strong></div>
    <div>Tr\u017Eby: <strong>${State.totalRevenue} K\u010D</strong> &nbsp; N\xE1klady: <strong>${State.totalSpent} K\u010D</strong> &nbsp; Profit: <strong>${State.bank - State.bankStart} K\u010D</strong></div>
    <div>Pr\u016Fm\u011Brn\xE1 spokojenost: <strong>${avg}</strong></div>
  `;
    el("reportBody").innerHTML = body;
    el("reportOverlay").style.display = "flex";
  }
  function hideReport() {
    el("reportOverlay").style.display = "none";
  }

  // docs/js/game.js
  function createCustomer() {
    const persona = pickPersona(CONFIG.personas);
    const S0 = randInt(persona.startSatisfactionRange[0], persona.startSatisfactionRange[1]);
    const cust = {
      id: "C" + Date.now(),
      personaId: persona.id,
      persona,
      S: S0,
      phase: "Ordering",
      order: null,
      timers: { enteredAt: performance.now(), lastEventAt: performance.now(), preparedAt: null }
    };
    return cust;
  }
  function promoteNext() {
    if (!State.active && State.queue.length > 0) {
      const next = State.queue.shift();
      State.active = next;
      State.preparedForThisOrder = [];
      State.currentItem = null;
      State.phase = "Ordering";
      render();
    }
  }
  function scheduleNextSpawn() {
    if (State.spawnTimer) clearTimeout(State.spawnTimer);
    const [minS, maxS] = CONFIG.spawn.spawnIntervalSec;
    const delay = randInt(minS * 1e3, maxS * 1e3);
    State.spawnTimer = setTimeout(() => {
      State.queue.push(createCustomer());
      logEvent("Nov\xFD \u010Dlov\u011Bk do fronty");
      promoteNext();
      render();
      scheduleNextSpawn();
    }, delay);
  }
  function toPreparing() {
    if (!State.active) return;
    if (!State.active.order) {
      flashPhase("Nejprve p\u0159ijmi objedn\xE1vku.");
      return;
    }
    State.active.phase = "Preparing";
    State.phase = "Preparing";
    render();
  }
  function finalizeItem() {
    if (!State.active) return;
    const it = State.currentItem;
    if (!it) return;
    State.active.order.prepared.push({ productId: it.productId, size: it.size, actual: it.actual });
    State.currentItem = null;
    if (State.active.order.prepared.length === State.active.order.items.length) {
      State.active.timers.preparedAt = performance.now();
    }
    render();
  }
  function pickSize(size) {
    if (!State.active) return;
    if (State.active.phase === "Ordering") toPreparing();
    const cupId = size === "S" ? "cup_S" : size === "M" ? "cup_M" : "cup_L";
    State.currentItem = { productId: "coffee", size, actual: { [cupId]: 1 } };
    spend(CONFIG.costsCZK[cupId], `Kel\xEDmek ${size}`);
    if (!CONFIG.economy.allowNegativeBank && State.bank <= 0) {
      gameOver("Bankrot: do\u0161la hotovost.");
    }
    render();
  }
  function tapPot() {
    if (!State.active) return;
    if (State.active.phase !== "Preparing") {
      toPreparing();
    }
    if (!State.currentItem) {
      spend(CONFIG.costsCZK.dose_coffee, "D\xE1vka k\xE1vy (vylito na pult)");
      logEvent("Chyba po\u0159ad\xED: k\xE1va bez kel\xEDmku \u2192 vylito na pult");
      flashPhase("Vylito na pult \u2014 nejd\u0159\xEDv kel\xEDmek!");
      render();
      return;
    }
    const act = State.currentItem.actual;
    act.dose_coffee = (act.dose_coffee || 0) + 1;
    spend(CONFIG.costsCZK.dose_coffee, "D\xE1vka k\xE1vy");
    if (!CONFIG.economy.allowNegativeBank && State.bank <= 0) {
      gameOver("Bankrot: do\u0161la hotovost.");
    }
    render();
  }
  function trashItem() {
    if (!State.currentItem) return;
    State.currentItem = null;
    logEvent("Ko\u0161: rozpracovan\xE1 polo\u017Eka zahozena");
    render();
  }
  function finishPayment(entered) {
    if (!State.active) return false;
    if (!State.active.order) {
      showPayErrorInline(true);
      logEvent("Platba bez objedn\xE1vky");
      return false;
    }
    const wantedCnt = State.active.order.items.length;
    const readyCnt = State.active.order.prepared.length;
    if (wantedCnt !== readyCnt) {
      showPayErrorInline(true);
      logEvent("Platba zablokov\xE1na: neshoduj\xED se seznamy");
      return false;
    }
    const sum = orderTotal(State.active.order);
    if (entered !== sum) {
      const d = applyPenalty(CONFIG.satisfaction.base.wrongTotalBeforeConfirm);
      logEvent(`\u0160patn\xE1 \u010D\xE1stka zad\xE1na: ${entered} \u2260 ${sum}`, 0, d);
      showPayErrorInline(true);
      render();
      return false;
    }
    const S = State.active.S;
    const tip = tipFromS(S);
    earn(sum + tip, `Platba ${sum} + sprop. ${tip}`);
    State.customersServed += 1;
    State.reputationSum += S;
    logEvent(`Z\xE1kazn\xEDk obslou\u017Een (S=${S})`);
    State.active = null;
    promoteNext();
    render();
    return true;
  }
  function startShift() {
    resetState();
    State.queue.push(createCustomer());
    promoteNext();
    scheduleNextSpawn();
    if (State.tickHandle) cancelAnimationFrame(State.tickHandle);
    const tick = () => {
      if (State.gameOver) return;
      render();
      State.tickHandle = requestAnimationFrame(tick);
    };
    State.tickHandle = requestAnimationFrame(tick);
    if (State.decayHandle) clearInterval(State.decayHandle);
    State.decayHandle = setInterval(() => {
      if (State.gameOver) return;
      if (State.shiftRemaining > 0) {
        State.shiftRemaining -= 1;
        if (State.shiftRemaining <= 0) {
          endShift();
        }
      }
      if (State.active) {
        State.active.S = Math.max(
          CONFIG.satisfaction.clampMin,
          Math.min(CONFIG.satisfaction.clampMax, State.active.S - State.active.persona.decayPerSecond)
        );
      }
      render();
    }, 1e3);
  }
  function endShift() {
    if (State.gameOver) return;
    State.gameOver = true;
    showReport("Sm\u011Bna skon\u010Dila", false);
  }
  function gameOver(reason) {
    if (State.gameOver) return;
    State.gameOver = true;
    logEvent(`Konec hry: ${reason}`);
    showReport(reason || "Konec hry", true);
  }

  // docs/js/ui.js
  function bind() {
    el("btnGreeting").onclick = () => {
      if (State.active) {
        const isNewOrder = !State.active.order;
        if (isNewOrder) {
          State.active.order = newOrderWeighted();
          logEvent("Zad\xE1na objedn\xE1vka z\xE1kazn\xEDka");
        }
        const d = applyReward(CONFIG.satisfaction.base.goodGreeting);
        logEvent("Replika: greeting", 0, d);
        render();
      }
    };
    el("btnConfirm").onclick = () => {
      if (State.active) {
        if (!State.active.order) {
          flashPhase("Nejprve p\u0159ijmi objedn\xE1vku.");
          return;
        }
        const d = applyReward(CONFIG.satisfaction.base.goodGreeting);
        logEvent("Replika: confirm", 0, d);
        render();
        toPreparing();
      }
    };
    el("btnBad").onclick = () => {
      if (State.active) {
        const d = applyPenalty(CONFIG.satisfaction.base.badReply);
        logEvent("Replika: nevhodn\xE1", 0, d);
        render();
      }
    };
    el("btnSizeS").onclick = () => pickSize("S");
    el("btnSizeM").onclick = () => pickSize("M");
    el("btnSizeL").onclick = () => pickSize("L");
    el("btnPot").onclick = () => tapPot();
    el("btnFinalize").onclick = () => finalizeItem();
    el("btnTrash").onclick = () => trashItem();
    el("btnPayConfirmInline").onclick = () => {
      const v = parseInt(el("payInputInline").value || "0", 10);
      finishPayment(isFinite(v) ? v : 0);
    };
    el("btnToggleDev").onclick = toggleDev;
    document.addEventListener("keydown", (e) => {
      if (e.key === "d" || e.key === "D") toggleDev();
    });
    el("btnRestart").onclick = () => {
      hideReport();
      startShift();
      render();
    };
    buildKeypad();
  }

  // docs/js/tests.js
  function runTests() {
    const tests = [];
    const assert = (name, cond) => tests.push({ name, pass: !!cond });
    ["time", "bank", "served", "reputation", "sbar", "queueHeads", "queueCount", "bubble", "orderLabel", "phase", "orderedList", "preparedList", "paymentPanel", "payInputInline", "keypadInline", "btnPayConfirmInline", "payErrorInline", "reportOverlay", "btnRestart"].forEach((id) => assert(`#${id} exists`, !!el(id)));
    const keepActive = State.active, keepServed = State.customersServed;
    State.active = { S: 70, order: { items: [{ productId: "coffee", size: "S" }], prepared: [] } };
    assert("finishPayment blocked when not prepared", finishPayment(CONFIG.pricesCZK.coffee.S) === false);
    State.active = keepActive;
    State.customersServed = keepServed;
    assert("clamp below", clamp(-5, 0, 10) === 0);
    assert("clamp inside", clamp(7, 0, 10) === 7);
    assert("clamp above", clamp(15, 0, 10) === 10);
    const failed = tests.filter((t) => !t.pass);
    if (failed.length) {
      console.warn("Self-tests failed:", failed.map((f) => f.name));
      const box = document.createElement("div");
      box.style.cssText = "position:fixed;left:8px;bottom:8px;background:#fff3f3;border:1px solid #ffcccc;color:#a00;padding:8px 10px;border-radius:8px;z-index:9999;font:12px/1.3 system-ui";
      box.textContent = `Self-testy nepro\u0161ly: ${failed.length}. Zkontroluj konzoli.`;
      document.body.appendChild(box);
    } else {
      console.log("Self-tests OK");
    }
  }

  // docs/js/main.js
  runTests();
  bind();
  startShift();
  render();
})();
//# sourceMappingURL=app.bundle.js.map
