import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createVoiceService, normalizeScenes, SCENE_DEFAULTS, VOICE_MODEL } from '../lib/voice-service.js'

const packageRoot = fileURLToPath(new URL('..', import.meta.url))
const mp3 = fs.readFileSync(new URL('../lib/assets/line-1.mp3', import.meta.url))
function fixture(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-voice-test-'))
  t.after(() => {
    assert.ok(path.resolve(home).startsWith(path.resolve(os.tmpdir()) + path.sep))
    fs.rmSync(home, { recursive: true, force: true })
  })
  const calls = [], remote = [{ model: VOICE_MODEL, customName: 'Existing', uri: 'speech:existing:test:001' }]
  let failAt = '', serial = 0, malformed = false
  const fetchImpl = async (url, init) => {
    const endpoint = url.replace('https://api.siliconflow.cn/v1', '')
    calls.push({ endpoint, init })
    assert.equal(init.headers.Authorization, 'Bearer sk-test-local-credential')
    if (endpoint === failAt) return new Response(JSON.stringify({ message: 'temporary failure' }), { status: 503 })
    if (endpoint === '/audio/voice/list') return Response.json({ result: remote })
    if (endpoint === '/uploads/audio/voice') {
      assert.equal(init.body.get('model'), VOICE_MODEL)
      const customName = init.body.get('customName')
      assert.match(customName, /^[A-Za-z0-9_-]{1,64}$/)
      const entry = { model: VOICE_MODEL, customName, uri: 'speech:' + customName + ':test:' + (++serial) }
      remote.push(entry)
      return Response.json({ uri: entry.uri })
    }
    if (endpoint === '/audio/voice/deletions') {
      const uri = JSON.parse(init.body).uri
      remote.splice(remote.findIndex(v => v.uri === uri), 1)
      return Response.json({ status: true })
    }
    if (endpoint === '/audio/speech') {
      const body = JSON.parse(init.body)
      assert.equal(body.model, VOICE_MODEL)
      assert.equal(body.response_format, 'mp3')
      if (malformed) return Response.json({ error: 'not audio' })
      return new Response(Buffer.concat([mp3, Buffer.from(String(++serial))]), { headers: { 'Content-Type': 'audio/mpeg' } })
    }
    throw new Error('unexpected endpoint ' + endpoint)
  }
  const service = createVoiceService({ home, packageRoot, fetchImpl })
  const speechCalls = () => calls.filter(c => c.endpoint === '/audio/speech')
  return { home, service, calls, speechCalls, remote, fail: endpoint => { failAt = endpoint }, malformed: () => { malformed = true } }
}
const config = id => ({ voicePreset: id, identity: '测试用户', scenes: normalizeScenes() })

test('a keyed scene edit cannot move one screen’s text into a different stage', () => {
  const scenes = normalizeScenes([{ id: 'line-4', zh: '自定义读取画面', speechText: '' }])
  assert.equal(scenes[0].zh, SCENE_DEFAULTS[0].zh)
  assert.equal(scenes[3].zh, '自定义读取画面')
  assert.equal(scenes[3].speechText, '')
})

test('both bundled presets work offline; default recordings are left intact', async t => {
  const f = fixture(t)
  const before = fs.readFileSync(new URL('../lib/assets/line-1.mp3', import.meta.url))
  for (const id of ['original', 'shaoluohuang']) {
    const result = await f.service.sync(config(id))
    assert.equal(result.cached, 6); assert.equal(result.generated, 0)
    assert.equal(result.config.sceneAudio.length, 6)
    assert.ok(result.config.sceneAudio.every(url => url.startsWith('/dsh-startup/asset/')))
  }
  assert.equal(f.calls.length, 0)
  assert.deepEqual(fs.readFileSync(new URL('../lib/assets/line-1.mp3', import.meta.url)), before)
})

test('Chinese names and filename defaults round trip through the real API shape without exposing URIs or keys', async t => {
  const f = fixture(t); f.service.setKey('sk-test-local-credential')
  await f.service.refresh()
  const audio = 'data:audio/mpeg;base64,' + mp3.toString('base64')
  const first = await f.service.upload({ audio, fileName: 'slh.mp3', name: '少萝皇', text: '参考原文' })
  const second = await f.service.upload({ audio, fileName: '声音.mp3', text: '参考原文' })
  assert.equal(first.name, '少萝皇'); assert.equal(second.name, '声音.mp3')
  const catalog = await f.service.refresh()
  assert.ok(catalog.voices.some(v => v.id === first.id && v.name === '少萝皇'))
  assert.ok(catalog.voices.some(v => v.id === second.id && v.name === '声音.mp3'))
  assert.ok(!JSON.stringify(catalog).includes('speech:'))
  assert.ok(!JSON.stringify(catalog).includes('sk-test'))
  assert.ok(!JSON.stringify(f.service.decorate(config(first.id))).includes('sk-test'))
  await assert.rejects(f.service.remove('original'), /不可删除/)
  await f.service.remove(first.id)
  assert.ok(!f.service.list().voices.some(v => v.id === first.id))
  assert.equal(f.calls.filter(c => c.endpoint === '/audio/voice/deletions').length, 1)
})

test('switches reuse all six cached clips; blank speech follows Chinese subtitles and only changed text generates', async t => {
  const f = fixture(t); f.service.setKey('sk-test-local-credential')
  const catalog = await f.service.refresh(), id = catalog.voices.find(v => v.kind === 'custom').id
  const first = await f.service.sync(config(id))
  assert.equal(first.generated, 6)
  const again = await f.service.sync(config(id))
  assert.equal(again.generated, 0); assert.equal(again.cached, 6)
  assert.deepEqual(first.config.sceneAudio, again.config.sceneAudio)
  const changed = config(id)
  changed.scenes[3] = { ...changed.scenes[3], zh: '欢迎使用我的工作台', speechText: '' }
  const updated = await f.service.sync(changed)
  assert.equal(updated.generated, 1); assert.equal(updated.cached, 5)
  assert.equal(JSON.parse(f.speechCalls().at(-1).init.body).input, '欢迎使用我的工作台')
  assert.notEqual(updated.config.sceneAudio[3], first.config.sceneAudio[3])
  assert.deepEqual(updated.config.sceneAudio.slice(0, 3), first.config.sceneAudio.slice(0, 3))
  const personalized = config(id)
  personalized.scenes[5].speechText = ''
  await f.service.sync(personalized)
  assert.equal(JSON.parse(f.speechCalls().at(-1).init.body).input, '欢迎 测试用户 访问')
})

test('single-scene and full regeneration bypass cache and publish new URLs only after success', async t => {
  const f = fixture(t); f.service.setKey('sk-test-local-credential')
  const id = (await f.service.refresh()).voices.find(v => v.kind === 'custom').id
  const first = await f.service.sync(config(id))
  const regenerated = await f.service.sync(config(id), { force: true, sceneIds: ['line-2'] })
  assert.equal(regenerated.generated, 1); assert.equal(regenerated.cached, 5)
  assert.notEqual(regenerated.config.sceneAudio[1], first.config.sceneAudio[1])
  assert.equal(regenerated.config.sceneAudio[0], first.config.sceneAudio[0])
  assert.ok(f.service.cachedFile(first.config.sceneAudio[1].split('/').pop()))
  const all = await f.service.sync(config(id), { force: true })
  assert.equal(all.generated, 6)
  f.fail('/audio/speech')
  await assert.rejects(f.service.sync(config(id), { force: true }), /503/)
  assert.deepEqual(f.service.decorate(config(id)).sceneAudio, all.config.sceneAudio)
  assert.equal(f.speechCalls().length, 14)
})

test('synthesis speed is sent to the provider and caches remain independent when switching speeds', async t => {
  const f = fixture(t); f.service.setKey('sk-test-local-credential')
  const id = (await f.service.refresh()).voices.find(v => v.kind === 'custom').id
  const normal = await f.service.sync(config(id))
  const faster = await f.service.sync({ ...config(id), synthesisSpeed: 1.05 })
  assert.equal(faster.generated, 6)
  assert.ok(f.speechCalls().slice(-6).every(c => JSON.parse(c.init.body).speed === 1.05))
  assert.ok(faster.config.sceneAudio.every((url, i) => url !== normal.config.sceneAudio[i]))
  assert.equal((await f.service.sync({ ...config(id), synthesisSpeed: 1.05 })).cached, 6)
  assert.deepEqual((await f.service.sync(config(id))).config.sceneAudio, normal.config.sceneAudio)
  const regenerate = await f.service.sync({ ...config(id), synthesisSpeed: 1.05 }, { force: true, sceneIds: ['line-1'] })
  assert.equal(regenerate.generated, 1)
  assert.equal(JSON.parse(f.speechCalls().at(-1).init.body).speed, 1.05)
  assert.deepEqual(f.service.decorate(config(id)).sceneAudio, normal.config.sceneAudio)
})

test('out-of-range synthesis speeds cannot reach the provider outside 0.90–1.10', async t => {
  const f = fixture(t); f.service.setKey('sk-test-local-credential')
  const id = (await f.service.refresh()).voices.find(v => v.kind === 'custom').id
  const fast = await f.service.sync({ ...config(id), synthesisSpeed: 1.25 })
  assert.equal(fast.config.synthesisSpeed, 1.10)
  assert.ok(f.speechCalls().every(c => JSON.parse(c.init.body).speed === 1.10))
  assert.equal((await f.service.sync({ ...config(id), synthesisSpeed: 1.10 })).cached, 6)
  const slow = await f.service.sync({ ...config(id), synthesisSpeed: 0.25 })
  assert.equal(slow.config.synthesisSpeed, 0.90)
  assert.ok(f.speechCalls().slice(-6).every(c => JSON.parse(c.init.body).speed === 0.90))
})

test('regenerating a system preset uses its reference and preserves its bundled clips', async t => {
  const f = fixture(t); f.service.setKey('sk-test-local-credential')
  const before = f.service.decorate(config('shaoluohuang')).sceneAudio
  const result = await f.service.sync(config('shaoluohuang'), { force: true, sceneIds: ['line-6'] })
  assert.equal(result.generated, 1)
  assert.match(result.config.sceneAudio[5], /voice-cache/)
  assert.deepEqual(result.config.sceneAudio.slice(0, 5), before.slice(0, 5))
  assert.equal(f.calls.filter(c => c.endpoint === '/uploads/audio/voice').length, 1)
  assert.ok(fs.existsSync(new URL('../lib/assets/shaoluohuang-line-6.mp3', import.meta.url)))
})

test('failed/malformed generation never replaces a usable recording; invalid paths and uploads are rejected', async t => {
  const f = fixture(t); f.service.setKey('sk-test-local-credential')
  const id = (await f.service.refresh()).voices.find(v => v.kind === 'custom').id
  const saved = await f.service.sync(config(id))
  f.malformed()
  await assert.rejects(f.service.sync(config(id), { force: true, sceneIds: ['line-1'] }), /有效 MP3/)
  assert.deepEqual(f.service.decorate(config(id)).sceneAudio, saved.config.sceneAudio)
  assert.equal(f.service.cachedFile('../credentials.json'), null)
  await assert.rejects(f.service.upload({ audio: 'not audio', fileName: 'x.mp3', text: 'test' }), /有效音频/)
  await assert.rejects(f.service.upload({ audio: 'data:audio/mpeg;base64,YQ==', fileName: 'x.mp3', text: '' }), /对应的文字/)
})
