#!/usr/bin/env node
// loadtest.js — прогін ГОЛОВНОГО inline-скрипта index.html під мок-DOM.
//
// Навіщо: перевірка синтаксису (`new Function`) НЕ виконує код, тож не бачить
// TDZ / ReferenceError — саме так у сесії 41 enAlt-пас поклав прод при чистому
// синтаксисі. Цей стенд реально ВИКОНУЄ скрипт (з songs.js перед ним) на
// заглушках DOM/localStorage/Web Audio і падає з ненульовим кодом на будь-якому
// винятку верхнього рівня.
//
// ⚠️ Був сесійним файлом у scratchpad — у сесії 42 перенесений у репо, бо
// verify.sh посилався на дохлий шлях старої сесії.
//
// Використання: node loadtest.js   (або через ./verify.sh)

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = __dirname;
const HTML = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const SONGS = fs.readFileSync(path.join(ROOT, "songs.js"), "utf8");

// найбільший inline-скрипт без src = головний
const scripts = [...HTML.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (!scripts.length) {
  console.log("❌ LOADTEST: не знайдено inline-скриптів");
  process.exit(1);
}
const main = scripts.reduce((a, b) => (b.length > a.length ? b : a));

// ── мок-DOM: елемент, який терпить будь-яке звернення ──────────────────────
const elCache = new Map();
function makeEl(id) {
  const el = {
    id: id || "",
    tagName: "DIV",
    className: "",
    innerHTML: "",
    textContent: "",
    value: "",
    checked: false,
    scrollTop: 0,
    scrollHeight: 0,
    offsetTop: 0,
    offsetHeight: 0,
    clientHeight: 0,
    dataset: {},
    style: new Proxy({}, { get: () => "", set: () => true }),
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => this._s.add(x)); },
      remove(...c) { c.forEach((x) => this._s.delete(x)); },
      toggle(c, f) { const on = f === undefined ? !this._s.has(c) : f; on ? this._s.add(c) : this._s.delete(c); return on; },
      contains(c) { return this._s.has(c); },
    },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    appendChild(c) { return c; }, removeChild(c) { return c; }, insertBefore(c) { return c; },
    setAttribute() {}, removeAttribute() {}, getAttribute() { return null; }, hasAttribute() { return false; },
    focus() {}, blur() {}, click() {}, scrollIntoView() {}, remove() {},
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 100, height: 100 }),
    querySelector: (s) => makeEl(s), querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    children: [], childNodes: [], firstChild: null, parentNode: null, parentElement: null, nextElementSibling: null,
  };
  return el;
}
const el = (id) => {
  if (!elCache.has(id)) elCache.set(id, makeEl(id));
  return elCache.get(id);
};

const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  key: (i) => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};

const documentMock = {
  readyState: "complete",
  documentElement: Object.assign(makeEl("html"), { dataset: {} }),
  body: makeEl("body"),
  head: makeEl("head"),
  title: "",
  getElementById: (id) => el(id),
  querySelector: (s) => el(s),
  querySelectorAll: () => [],
  getElementsByClassName: () => [],
  getElementsByTagName: () => [],
  createElement: (t) => Object.assign(makeEl(""), { tagName: String(t).toUpperCase() }),
  createTextNode: (t) => ({ textContent: t }),
  createDocumentFragment: () => makeEl(""),
  addEventListener() {}, removeEventListener() {},
  activeElement: null, hidden: false, visibilityState: "visible",
};

const audioNode = () => ({
  connect: () => audioNode(), disconnect() {}, start() {}, stop() {},
  frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} },
  gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} },
  type: "sine",
});
class AudioContextMock {
  constructor() { this.currentTime = 0; this.destination = audioNode(); this.state = "running"; }
  createOscillator() { return audioNode(); }
  createGain() { return audioNode(); }
  resume() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}

const windowMock = {
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
  location: { href: "http://localhost/", search: "", hash: "", reload() {} },
  innerWidth: 1880, innerHeight: 980, devicePixelRatio: 1,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
  requestAnimationFrame: (fn) => { try { fn(0); } catch (e) { throw e; } return 1; },
  cancelAnimationFrame() {},
  setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
  localStorage,
  speechSynthesis: { getVoices: () => [], speak() {}, cancel() {}, addEventListener() {}, onvoiceschanged: null },
  SpeechSynthesisUtterance: function () { return { lang: "", rate: 1, voice: null, addEventListener() {} }; },
  AudioContext: AudioContextMock, webkitAudioContext: AudioContextMock,
  indexedDB: { open: () => ({ addEventListener() {}, set onsuccess(v) {}, set onerror(v) {}, set onupgradeneeded(v) {} }) },
  navigator: { userAgent: "node", language: "uk", clipboard: { writeText: () => Promise.resolve() } },
  open: () => null, alert() {}, confirm: () => true, prompt: () => null,
  scrollTo() {}, getComputedStyle: () => new Proxy({}, { get: () => "" }),
  document: documentMock, console,
};
windowMock.window = windowMock;
windowMock.self = windowMock;
windowMock.globalThis = windowMock;

const sandbox = Object.assign(Object.create(null), windowMock, {
  document: documentMock,
  localStorage,
  console,
  Math, JSON, Date, Object, Array, String, Number, Boolean, RegExp, Error, TypeError, RangeError,
  Map, Set, WeakMap, WeakSet, Promise, Symbol, Proxy, Reflect, parseInt, parseFloat, isNaN, isFinite,
  encodeURIComponent, decodeURIComponent, Intl, Blob: function () {}, URL: { createObjectURL: () => "", revokeObjectURL() {} },
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}), text: () => Promise.resolve("") }),
});
sandbox.globalThis = sandbox;

const ctx = vm.createContext(sandbox);
try {
  vm.runInContext(SONGS, ctx, { filename: "songs.js" });
} catch (e) {
  console.log("❌ LOADTEST (songs.js): " + e.message);
  process.exit(1);
}
// ⚠️ top-level const/let у vm НЕ стають властивостями контексту — тож дані
// знімаємо probe-хвостом, дописаним до самого скрипта.
const probe = "\n;globalThis.__probe={w:typeof WORDS!==\"undefined\"?WORDS.length:0," +
  "s:typeof SONGS!==\"undefined\"?SONGS.length:0,x:typeof EXAMPLES!==\"undefined\"?Object.keys(EXAMPLES).length:0};";
try {
  vm.runInContext(main + probe, ctx, { filename: "index.html:main" });
} catch (e) {
  console.log("❌ LOADTEST: " + (e && e.stack ? e.stack.split("\n").slice(0, 4).join("\n") : e));
  process.exit(1);
}

const p = sandbox.__probe || {};
if (!p.w || p.w < 100) {
  console.log("❌ LOADTEST: WORDS не ініціалізовано");
  process.exit(1);
}
console.log("✅ стенд завантаження (" + p.w + " записів, " + p.x + " прикладів, " + p.s + " пісень)");
