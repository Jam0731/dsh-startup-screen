import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export const VOICE_MODEL = 'FunAudioLLM/CosyVoice2-0.5B'
const API = 'https://api.siliconflow.cn/v1'
export const SCENE_DEFAULTS = [
  { id: 'line-1', zh: '需要访问许可', en: 'ACCESS PERMISSION REQUIRED', speechText: 'Access permission required.' },
  { id: 'line-2', zh: '身份资料确认', en: 'IDENTITY VERIFICATION', speechText: 'ID confirmed.' },
  { id: 'line-3', zh: '接收访问需求', en: 'ACCESS REQUEST RECEIVED', speechText: 'Request received.' },
  { id: 'line-4', zh: '开始读取权限', en: 'PERMISSION READ STARTED', speechText: 'Start processing.' },
  { id: 'line-5', zh: '读取完毕 · 核验通过', en: 'READ COMPLETE · VERIFIED', speechText: 'Permission authorized.' },
  { id: 'line-6', zh: '欢迎 {identity} 访问', en: 'WELCOME, {identity}', speechText: 'Welcome.' }
]
export const SYSTEM_VOICES = [
  { id: 'original', name: '原版播报', kind: 'system', prefix: '', reference: 'original-reference.mp3',
    referenceText: SCENE_DEFAULTS.map(s => s.speechText).join(' ') },
  { id: 'shaoluohuang', name: '少萝皇', kind: 'system', prefix: 'shaoluohuang-', reference: 'shaoluohuang-reference.mp3',
    referenceText: '我没夹呀，我在家跟我爸妈讲话也是极品少女音，略带一些娇弱破碎清冷感的。' }
]

const hash = value => crypto.createHash('sha256').update(value).digest('hex')
const readJson = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return fallback } }
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = file + '.' + crypto.randomUUID() + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), { mode: 0o600 })
  fs.renameSync(tmp, file)
}
const clean = (value, max = 1000) => String(value ?? '').trim().slice(0, max)
function providerName(name) {
  if (/^[A-Za-z0-9_-]{1,64}$/.test(name)) return name
  const encoded = 'dsh-u-' + Buffer.from(name).toString('base64url')
  return encoded.length <= 64 ? encoded : 'dsh-voice-' + hash(name).slice(0, 40)
}
function displayName(name) {
  if (name?.startsWith('dsh-u-')) {
    try { return Buffer.from(name.slice(6), 'base64url').toString('utf8') || name } catch { /* leave provider name */ }
  }
  return name
}
export function normalizeScenes(input) {
  if (!Array.isArray(input)) return SCENE_DEFAULTS.map(s => ({ ...s }))
  const keyed = input.some(s => s && typeof s.id === 'string')
  return SCENE_DEFAULTS.map((base, i) => {
    const src = (keyed ? input.find(s => s && s.id === base.id) : input[i]) || {}
    const zh = clean(src.zh, 200) || base.zh
    return { id: base.id, zh, en: src.en == null ? base.en : clean(src.en, 200),
      speechText: src.speechText == null ? (zh === base.zh ? base.speechText : '') : clean(src.speechText) }
  })
}
export function sceneText(scene, config) {
  return (scene.speechText || scene.zh).replaceAll('{identity}', clean(config.identity, 64) || 'JOYCE MOORE')
}
function synthesisSpeed(config) {
  const value = Number(config.synthesisSpeed ?? 1)
  return Number.isFinite(value) ? Math.min(1.10, Math.max(0.90, value)) : 1
}

/** All provider credentials and URIs stay in DSH_HOME; browser responses contain opaque IDs only. */
export function createVoiceService({ home, packageRoot, fetchImpl = globalThis.fetch }) {
  const root = path.join(home, 'startup-voices')
  const cacheDir = path.join(root, 'cache')
  const credentialFile = path.join(root, 'credentials.json')
  const libraryFile = path.join(root, 'library.json')
  const assetsDir = path.join(packageRoot, 'lib', 'assets')
  const inflight = new Map()
  const load = () => {
    const raw = readJson(libraryFile, {}) || {}
    const map = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {}
    return { voices: map(raw.voices), builtinUris: map(raw.builtinUris), overrides: map(raw.overrides) }
  }
  const key = () => clean(readJson(credentialFile, {}).apiKey || process.env.SILICONFLOW_API_KEY, 256)
  const account = () => key() ? hash(key()).slice(0, 20) : ''
  function setKey(value) {
    const apiKey = clean(value, 256)
    if (apiKey && (!/^sk-[A-Za-z0-9_-]+$/.test(apiKey) || apiKey.length < 10)) throw new Error('API key 格式不正确')
    writeJson(credentialFile, { apiKey })
    return { hasApiKey: !!key() }
  }
  function safeError(error) {
    return clean(error?.message || error, 400).replace(/sk-[A-Za-z0-9_-]+/g, '[已隐藏]').replace(/speech:[^\s"<>]+/g, '[声音标识]')
  }
  async function request(endpoint, init = {}) {
    const apiKey = key()
    if (!apiKey) throw new Error('请先填写并保存硅基流动 API key')
    let res
    try {
      res = await fetchImpl(API + endpoint, { ...init, redirect: 'error',
        headers: { ...init.headers, Authorization: 'Bearer ' + apiKey }, signal: AbortSignal.timeout(120000) })
    } catch (e) { throw new Error('硅基流动请求失败：' + safeError(e)) }
    if (!res.ok) {
      const raw = (await res.text()).slice(0, 2000)
      let message = raw
      try { message = JSON.parse(raw).message || raw } catch { /* plain-text provider error */ }
      throw new Error(`硅基流动 ${res.status}：${safeError(message)}`)
    }
    return res
  }
  function publicVoice(v) {
    return { id: v.id, name: v.name, kind: v.kind || 'custom', compatible: !v.model || v.model === VOICE_MODEL }
  }
  function list() {
    const lib = load(), acc = account()
    return { hasApiKey: !!key(), model: VOICE_MODEL,
      voices: [...SYSTEM_VOICES.map(publicVoice), ...Object.values(lib.voices)
        .filter(v => !acc || v.account === acc).map(publicVoice)] }
  }
  function recordVoice(raw, lib, acc) {
    if (!raw.uri || typeof raw.uri !== 'string' || !raw.uri.startsWith('speech:')) throw new Error('接口未返回有效声音标识')
    const id = 'custom-' + hash(raw.uri).slice(0, 24)
    const record = { id, name: clean(raw.name || lib.voices[id]?.name || displayName(raw.customName), 64) || '未命名声音', uri: raw.uri,
      model: raw.model || VOICE_MODEL, account: acc, kind: 'custom' }
    lib.voices[id] = record
    return record
  }
  async function refresh() {
    const data = await (await request('/audio/voice/list')).json()
    // Production currently returns `result`; the reference also documents `results`.
    const results = data.results || data.result
    if (!Array.isArray(results)) throw new Error('声音列表格式不正确')
    const lib = load(), acc = account()
    const previous = { ...lib.voices }
    for (const [id, v] of Object.entries(lib.voices)) if (v.account === acc) delete lib.voices[id]
    for (const raw of results) {
      const old = previous['custom-' + hash(String(raw.uri)).slice(0, 24)]
      if (old?.account === acc) raw.name = old.name
    }
    for (const raw of results) recordVoice(raw, lib, acc)
    const uris = new Set(results.map(v => v.uri))
    for (const [id, uri] of Object.entries(lib.builtinUris)) if (id.startsWith(acc + ':') && !uris.has(uri)) delete lib.builtinUris[id]
    writeJson(libraryFile, lib)
    return list()
  }
  async function upload({ audio, fileName, name, text }) {
    if (!clean(text)) throw new Error('请填写参考音频对应的文字')
    fileName = path.basename(clean(fileName, 160).replaceAll('\\', '/')) || 'voice.mp3'
    const match = /^data:(audio\/[a-zA-Z0-9.+-]+|application\/octet-stream);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(String(audio || ''))
    if (!match) throw new Error('请选择有效音频文件')
    const bytes = Buffer.from(match[2], 'base64')
    if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new Error('音频文件需大于 0 且不超过 10 MB')
    const customName = clean(name, 64) || fileName
    const form = new FormData()
    form.set('model', VOICE_MODEL); form.set('customName', providerName(customName)); form.set('text', clean(text))
    form.set('file', new Blob([bytes], { type: match[1] }), fileName)
    const raw = await (await request('/uploads/audio/voice', { method: 'POST', body: form })).json()
    const lib = load()
    const record = recordVoice({ ...raw, name: customName, model: VOICE_MODEL }, lib, account())
    writeJson(libraryFile, lib)
    return publicVoice(record)
  }
  async function remove(id) {
    if (SYSTEM_VOICES.some(v => v.id === id)) throw new Error('系统预设不可删除')
    const lib = load(), v = lib.voices[id]
    if (!v || v.account !== account()) throw new Error('当前账户中找不到该声音，请刷新列表')
    await request('/audio/voice/deletions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uri: v.uri }) })
    delete lib.voices[id]
    for (const [key, uri] of Object.entries(lib.builtinUris)) if (uri === v.uri) delete lib.builtinUris[key]
    writeJson(libraryFile, lib)
    return list()
  }
  function voiceRecord(id) {
    const builtin = SYSTEM_VOICES.find(v => v.id === id)
    if (builtin) return { ...builtin, uri: load().builtinUris[account() + ':' + id], model: VOICE_MODEL }
    const v = load().voices[id]
    if (!v) throw new Error('找不到所选声音，请刷新声音列表')
    if (v.model !== VOICE_MODEL) throw new Error('该声音不适用于 CosyVoice2，请选择或创建对应模型的声音')
    return v
  }
  function cacheName(uri, text, speed = 1) {
    return hash(JSON.stringify({ model: VOICE_MODEL, voice: uri, input: text, response_format: 'mp3', sample_rate: 44100, speed })) + '.mp3'
  }
  // Preserve the original cache identity at 1x; other speeds get separate files.
  const overrideKey = (id, text, speed = 1) => hash(JSON.stringify({ id, text, model: VOICE_MODEL, ...(speed === 1 ? {} : { speed }) }))
  function findAudio(id, scene, config) {
    const text = sceneText(scene, config), builtin = SYSTEM_VOICES.find(v => v.id === id), speed = synthesisSpeed(config)
    const override = load().overrides?.[overrideKey(id, text, speed)]
    if (override && cachedFile(override)) return '/dsh-startup/voice-cache/' + override
    if (builtin && speed === 1 && text === SCENE_DEFAULTS.find(s => s.id === scene.id).speechText) {
      const name = builtin.prefix + scene.id + '.mp3'
      if (fs.existsSync(path.join(assetsDir, name))) return '/dsh-startup/asset/' + name
    }
    let v
    try { v = voiceRecord(id) } catch { return null }
    if (!v.uri) return null
    const name = cacheName(v.uri, text, speed), file = path.join(cacheDir, name)
    if (fs.existsSync(file) && fs.statSync(file).size > 100) return '/dsh-startup/voice-cache/' + name
    return null
  }
  function decorate(config) {
    const scenes = normalizeScenes(config.scenes)
    return { ...config, scenes, sceneAudio: scenes.map(s => findAudio(config.voicePreset || 'original', s, config)) }
  }
  async function ensureVoice(id) {
    let v = voiceRecord(id)
    if (v.uri) {
      if (v.kind !== 'system' && v.account !== account()) throw new Error('该声音属于另一 API key，请重新选择当前账户中的声音')
      return v
    }
    const file = path.join(assetsDir, v.reference)
    if (!fs.existsSync(file)) throw new Error('系统声音缺少参考音频，请重新安装完整插件')
    const uploaded = await upload({ audio: 'data:audio/mpeg;base64,' + fs.readFileSync(file).toString('base64'),
      fileName: v.reference, name: v.name, text: v.referenceText })
    const lib = load()
    lib.builtinUris[account() + ':' + id] = lib.voices[uploaded.id].uri
    writeJson(libraryFile, lib)
    return voiceRecord(id)
  }
  function bindSystemVoice(id, customId) {
    if (!SYSTEM_VOICES.some(v => v.id === id)) throw new Error('无效系统预设')
    const lib = load(), voice = lib.voices[customId]
    if (!voice || voice.account !== account() || voice.model !== VOICE_MODEL) throw new Error('无法关联当前账户的声音')
    lib.builtinUris[account() + ':' + id] = voice.uri
    writeJson(libraryFile, lib)
  }
  async function generate(v, text, force, speed) {
    const name = cacheName(v.uri, text, speed), target = path.join(cacheDir, name)
    if (!force && fs.existsSync(target) && fs.statSync(target).size > 100) return name
    const operationKey = (force ? 'force:' : '') + name
    if (inflight.has(operationKey)) return inflight.get(operationKey)
    const task = (async () => {
      const res = await request('/audio/speech', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: VOICE_MODEL, input: text, voice: v.uri, response_format: 'mp3', sample_rate: 44100, speed }) })
      const data = Buffer.from(await res.arrayBuffer())
      // A JSON error with HTTP 200 must never become a playable cache entry.
      const isMp3 = data.subarray(0, 3).toString() === 'ID3' || (data[0] === 0xff && (data[1] & 0xe0) === 0xe0)
      if (!isMp3 || data.length < 100) throw new Error('接口没有返回有效 MP3，未写入音频缓存')
      fs.mkdirSync(cacheDir, { recursive: true })
      // Regeneration gets a content URL so neither the browser nor the old recording is overwritten.
      const outputName = force ? hash(data) + '.mp3' : name
      const outputFile = path.join(cacheDir, outputName)
      const tmp = outputFile + '.' + crypto.randomUUID() + '.tmp'
      fs.writeFileSync(tmp, data); fs.renameSync(tmp, outputFile)
      return outputName
    })().finally(() => inflight.delete(operationKey))
    inflight.set(operationKey, task)
    return task
  }
  async function sync(config, { force = false, sceneIds } = {}) {
    const normalized = { ...config, voicePreset: config.voicePreset || 'original', synthesisSpeed: synthesisSpeed(config), scenes: normalizeScenes(config.scenes) }
    let generated = 0, cached = 0, v
    const overrides = {}
    for (const scene of normalized.scenes) {
      const regenerate = force && (!sceneIds || sceneIds.includes(scene.id))
      if (!regenerate && findAudio(normalized.voicePreset, scene, normalized)) { cached++; continue }
      v ||= await ensureVoice(normalized.voicePreset)
      const text = sceneText(scene, normalized)
      overrides[overrideKey(normalized.voicePreset, text, normalized.synthesisSpeed)] = await generate(v, text, regenerate, normalized.synthesisSpeed)
      generated++
    }
    const lib = load()
    lib.overrides = { ...lib.overrides, ...overrides }
    writeJson(libraryFile, lib)
    return { config: decorate(normalized), generated, cached }
  }
  function cachedFile(name) {
    if (!/^[a-f0-9]{64}\.mp3$/.test(name)) return null
    const file = path.join(cacheDir, name)
    return fs.existsSync(file) ? file : null
  }
  return { list, refresh, upload, remove, sync, decorate, setKey, cachedFile, safeError, bindSystemVoice }
}
