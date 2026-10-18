import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { SCENE_DEFAULTS } from '../lib/voice-service.js'

const source = fs.readFileSync(new URL('../lib/splash.js', import.meta.url), 'utf8')
function runtime({ speed = 3, interaction = false, suspended = false, scenes = SCENE_DEFAULTS, voicePreset = 'shaoluohuang', failAssets = false, speechSupported = false } = {}) {
  let now = 0, serial = 0, allowResume = !suspended
  const tasks = new Map(), elements = new Map(), contexts = [], playing = [], listeners = new Map()
  const requested = [], spoken = []
  const durations = [12, 9, 8, 11, 10, 13]
  function schedule(fn, delay, interval = 0) {
    const id = ++serial; tasks.set(id, { fn, time: now + Math.max(0, Number(delay) || 0), interval }); return id
  }
  const flush = async () => { for (let i = 0; i < 35; i++) await Promise.resolve() }
  async function advance(duration) {
    const end = now + duration
    await flush()
    while (true) {
      const next = [...tasks.entries()].sort((a, b) => a[1].time - b[1].time || a[0] - b[0])[0]
      if (!next || next[1].time > end) break
      const [id, task] = next; now = task.time
      if (task.interval) task.time += task.interval
      else tasks.delete(id)
      task.fn(); await flush()
    }
    now = end; await flush()
  }
  function eventTarget(target) {
    target._listeners = new Map()
    target.addEventListener = (type, fn) => { const set = target._listeners.get(type) || new Set(); set.add(fn); target._listeners.set(type, set) }
    target.removeEventListener = (type, fn) => target._listeners.get(type)?.delete(fn)
    target.dispatch = type => { for (const fn of [...(target._listeners.get(type) || [])]) fn({ type, preventDefault() {}, key: type === 'keydown' ? 'Enter' : '' }) }
    return target
  }
  function element(tag = 'div') {
    const classes = new Set()
    const el = eventTarget({ tagName: tag, style: { setProperty() {} }, dataset: {}, children: [], textContent: '', innerHTML: '', hidden: false, offsetWidth: 1,
      appendChild(child) { this.children.push(child); child.parentNode = this; return child },
      removeChild(child) { this.children = this.children.filter(c => c !== child); child.parentNode = null },
      setAttribute() {}, getAttribute() { return null }, getTotalLength() { return 100 },
      querySelector: lookup, querySelectorAll() { return [] }, animate() {}, focus() {},
      classList: { add: (...cs) => cs.forEach(c => classes.add(c)), remove: (...cs) => cs.forEach(c => classes.delete(c)),
        contains: c => classes.has(c), toggle(c, on) { if (on ?? !classes.has(c)) classes.add(c); else classes.delete(c) } }
    })
    Object.defineProperty(el, 'className', { get: () => [...classes].join(' '), set: value => { classes.clear(); String(value).split(/\s+/).forEach(c => classes.add(c)) } })
    return el
  }
  function lookup(selector) {
    if (!elements.has(selector)) { const el = element(); if (selector === '.dsu-audio-unlock' || selector === '.dsu-audio-error') el.hidden = true; elements.set(selector, el) }
    return elements.get(selector)
  }
  const root = element(), body = element('body')
  root.className = 'dsu-root dsu-boot'; body.appendChild(root)
  const document = eventTarget({ readyState: 'complete', body, head: element('head'), documentElement: element('html'),
    getElementById: id => id === 'dsh-startup-root' ? root : null,
    createElement: element, createElementNS: (_ns, tag) => element(tag), createDocumentFragment: element,
    createTextNode: text => ({ textContent: text }), querySelector: lookup })
  class AudioContext {
    constructor() { this.state = suspended ? 'suspended' : 'running'; this.destination = {}; contexts.push(this); this.sources = [] }
    resume() {
      if (allowResume && this.state === 'suspended') {
        this.state = 'running'
        this.sources.filter(s => s.waiting).forEach(s => s.begin())
      }
      return Promise.resolve()
    }
    close() { this.state = 'closed'; return Promise.resolve() }
    decodeAudioData(bytes) { return Promise.resolve({ duration: durations[new Uint8Array(bytes)[0]] }) }
    createGain() { return { gain: { value: 1 }, connect() {} } }
    createBufferSource() {
      const ctx = this
      const s = { buffer: null, timer: null, connect() {}, stops: 0,
        begin() {
          this.waiting = false; this.startedAt = now; this.scene = root.dataset.scene
          playing.push(this)
          this.timer = schedule(() => { this.endedAt = now; this.onended?.() }, this.buffer.duration * 1000)
        },
        start() { if (ctx.state === 'suspended') this.waiting = true; else this.begin() },
        stop() { this.stops++; tasks.delete(this.timer); this.onended?.() }
      }
      this.sources.push(s); return s
    }
  }
  class FakeDate extends Date { constructor(...args) { super(...(args.length ? args : [1700000000000 + now])) } static now() { return now } }
  const window = eventTarget({ __DSH_STARTUP__: { mode: 'always', speed, sound: false, voice: true, voiceLead: 240,
    voiceCue: false, requireInteraction: interaction, scenes, voicePreset,
    sceneAudio: scenes.map((_, i) => '/dsh-startup/asset/test-' + i + '.mp3') },
    AudioContext, location: { host: 'localhost', href: 'http://localhost/' },
    sessionStorage: { setItem() {} }, localStorage: { setItem() {} },
    CustomEvent: class { constructor(type) { this.type = type } }, dispatchEvent() {} })
  if (speechSupported) {
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text } }
    window.speechSynthesis = { getVoices: () => [], addEventListener() {}, removeEventListener() {}, cancel() {}, resume() {},
      speak(u) { spoken.push(u.text); u.onend?.() }, speaking: false, pending: false }
  }
  const sandbox = { window, document, console, Date: FakeDate,
    fetch: async url => {
      requested.push(url)
      const idx = /test-(\d)/.exec(url)?.[1] ?? (Number(/line-(\d)/.exec(url)?.[1] || 1) - 1)
      return { ok: !failAssets, arrayBuffer: async () => new Uint8Array([Number(idx)]).buffer }
    },
    setTimeout: (fn, ms) => schedule(fn, ms), clearTimeout: id => tasks.delete(id),
    setInterval: (fn, ms) => schedule(fn, ms, ms), clearInterval: id => tasks.delete(id), requestAnimationFrame: fn => schedule(fn, 0) }
  vm.runInNewContext(source, sandbox, { filename: 'splash.js' })
  return { root, window, lookup, advance, playing, contexts, requested, spoken, now: () => now,
    gesture() { allowResume = true; document.dispatch('pointerdown') } }
}

test('3x visual speed never advances past long recording; all six scenes and finale wait for onended', async () => {
  const r = runtime()
  await r.advance(2000)
  assert.equal(r.playing.length, 1); assert.equal(r.root.dataset.scene, '1')
  await r.advance(6000)
  assert.equal(r.root.dataset.scene, '1', '12 second first recording must still own the screen')
  assert.equal(r.playing[0].endedAt, undefined)
  await r.advance(50000)
  assert.equal(r.root.dataset.scene, '6')
  const welcome = r.playing[5]
  assert.ok(welcome); assert.equal(welcome.endedAt, undefined)
  assert.ok(!r.root.classList.contains('dsu-handoff'), 'welcome still playing after the visual sequence completes')
  await r.advance(20000)
  assert.equal(r.playing.length, 6)
  for (let i = 1; i < 6; i++) assert.ok(r.playing[i].startedAt >= r.playing[i - 1].endedAt)
  assert.ok(r.root.classList.contains('dsu-handoff'))
  assert.ok(r.playing.every(s => s.endedAt - s.startedAt === s.buffer.duration * 1000))
})

test('first gesture unlocks audio even with sound effects off; an early confirmation is retained', async () => {
  const r = runtime({ speed: 1, interaction: true, suspended: true })
  await r.advance(4670)
  assert.equal(r.root.dataset.scene, '1')
  assert.equal(r.lookup('.dsu-audio-unlock').hidden, false)
  assert.equal(r.playing.length, 0)
  r.gesture(); r.lookup('.dsu-btn').dispatch('click')
  await r.advance(1000)
  assert.equal(r.playing.length, 1)
  assert.equal(r.root.dataset.scene, '1')
  await r.advance(12000)
  assert.equal(r.root.dataset.scene, '2', 'click during first 520ms must not be lost')
  await r.advance(500)
  r.window.__DSH_STARTUP_API__.skip()
  assert.ok(r.playing[1].stops > 0, 'skip stops the actual BufferSource')
  assert.equal(r.contexts[0].state, 'closed')
  await r.advance(30000)
  assert.equal(r.root.dataset.scene, '2', 'old timeline must not start additional scenes after skip')
})

test('custom final subtitles and empty speech use the configured scene, including identity expansion', async () => {
  const scenes = SCENE_DEFAULTS.map(s => ({ ...s }))
  scenes[5] = { ...scenes[5], zh: '你好，{identity}', en: 'READY', speechText: '' }
  const r = runtime({ scenes })
  assert.equal(r.lookup('.dsu-w4').textContent, '你好，JOYCE MOORE')
  assert.equal(r.lookup('.dsu-w1').textContent, 'READY')
})

test('original runtime ignores custom captions and cached asset mappings', async () => {
  const scenes = SCENE_DEFAULTS.map(s => ({ ...s, zh: '自定义字幕', speechText: '自定义台词' }))
  const r = runtime({ voicePreset: 'original', scenes, speechSupported: true })
  assert.equal(r.lookup('.dsu-w4').textContent, '欢迎 JOYCE MOORE 访问')
  r.gesture()
  await r.advance(2000)
  assert.equal(r.playing.length, 1)
  const voiceRequests = r.requested.filter(url => !url.includes('/asset/sfx-'))
  assert.equal(voiceRequests.length, 6)
  assert.ok(voiceRequests.every(url => /^\/dsh-startup\/asset\/line-[1-6]\.mp3$/.test(url)))
  assert.equal(r.spoken.length, 0)
})

test('missing original recordings show an error instead of using an available system TTS', async () => {
  const r = runtime({ voicePreset: 'original', failAssets: true, speechSupported: true })
  await r.advance(2000)
  assert.equal(r.playing.length, 0)
  assert.equal(r.spoken.length, 0, 'original must never fall back to the operating system voice')
  assert.equal(r.lookup('.dsu-audio-error').hidden, false)
  assert.match(r.lookup('.dsu-audio-error').textContent, /原版录音加载失败/)
})
