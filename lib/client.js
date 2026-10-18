/**
 * dsh-startup-screen — 浏览器半侧（设置页「启动动画」）
 * ----------------------------------------------------------------------------
 * 以 dsh.client bundle 格式加载（手写 ModuleLoader bundle，无需构建）：
 * 在 DSH 设置里注册一个 `settings.section`，用来改启动动画的身份名称、
 * 权限等级、配色、速度、交互开关等等。
 *
 * 数据不走 settings 命名空间，而是走 Host 半侧自带的 HTTP API
 * （GET/POST /dsh-startup/config）——与 dsh-meme 同款做法，少受
 * dsh-settings 版本变更影响。注册 id 必须等于 loader entry 名
 * （dsh-startup-screen），否则 ModuleLoader 会报
 * "loaded without registering dsh-startup-screen"。
 */
window.__ModuleLoader__.load({
  id: 'dsh-startup-screen',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    var react = require('react')
    var h = react.createElement

    var API = '/dsh-startup/config'
    var VOICES_API = '/dsh-startup/voices'

    /* ── CSS ─────────────────────────────────────────────────────────────── */
    var CSS = [
      '.__ss_root{max-width:620px;display:flex;flex-direction:column;gap:14px;font-size:13px;color:var(--dsw-alias-label-primary)}',
      '.__ss_version{font-family:ui-monospace,Consolas,monospace;font-size:12px;letter-spacing:.04em;color:var(--dsw-alias-label-tertiary)}',
      '.__ss_group{border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:11px}',
      '.__ss_groupTitle{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary)}',
      '.__ss_field{display:flex;flex-direction:column;gap:5px}',
      '.__ss_label{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.__ss_hint{font-size:11px;line-height:1.55;color:var(--dsw-alias-label-tertiary)}',
      '.__ss_row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '.__ss_input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);font:inherit;color:var(--dsw-alias-label-primary);border-radius:8px;padding:6px 10px;font-size:13px;box-sizing:border-box;width:100%;outline:none}',
      '.__ss_input:focus{border-color:var(--dsw-alias-state-business-primary)}',
      '.__ss_inputMono{font-family:ui-monospace,Consolas,monospace;font-size:12px;letter-spacing:.06em}',
      '.__ss_select{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);border-radius:8px;padding:6px 8px;font:inherit;font-size:13px;min-width:180px}',
      '.__ss_check{display:flex;align-items:flex-start;gap:8px;cursor:pointer}',
      '.__ss_check input{margin-top:2px;accent-color:var(--dsw-alias-state-business-primary)}',
      '.__ss_checkText{display:flex;flex-direction:column;gap:2px}',
      '.__ss_two{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
      '.__ss_actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:2px}',
      '.__ss_btn{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);border-radius:8px;padding:6px 14px;font:inherit;font-size:13px;cursor:pointer}',
      '.__ss_btn:hover:not(:disabled){border-color:var(--dsw-alias-state-business-primary)}',
      '.__ss_btn:disabled{opacity:.5;cursor:default}',
      '.__ss_btnPrimary{border-color:var(--dsw-alias-state-business-primary,#3964fe);background:var(--dsw-alias-state-business-primary,#3964fe);color:#fff}',
      '.__ss_status{font-size:12px;color:var(--dsw-alias-label-tertiary)}',
      '.__ss_ok{font-size:12px;color:var(--dsw-alias-state-business-primary)}',
      '.__ss_err{font-size:12px;color:var(--dsw-alias-state-error-primary,#f85149)}',
      '.__ss_swatch{width:38px;height:26px;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;cursor:pointer}',
      '.__ss_preview{margin-top:2px;border:1px dashed var(--dsw-alias-border-l2);border-radius:10px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px}',
      '.__ss_previewText{font-size:12px;color:var(--dsw-alias-label-tertiary);line-height:1.5}',
      '.__ss_voiceList{max-height:240px;overflow:auto}',
      '.__ss_voiceRow{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--dsw-alias-border-l2)}',
      '.__ss_scene{padding:12px 0;border-top:1px solid var(--dsw-alias-border-l2);display:flex;flex-direction:column;gap:10px}',
      '.__ss_scene audio{width:100%;height:32px}',
      '.__ss_root textarea{resize:vertical;min-height:64px;font-family:inherit}',
      '.__ss_root>.__ss_ok,.__ss_root>.__ss_err,.__ss_progress{position:sticky;top:10px;z-index:4;background:var(--dsw-alias-bg-layer-3,#fff);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:10px;box-shadow:0 3px 12px #0000000d}',
      '@media(max-width:600px){.__ss_two{grid-template-columns:1fr}.__ss_select{min-width:0;width:100%}}'
    ].join('')
    var tagId = 'dsh-startup-screen/main.css'
    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="' + tagId + '"]') === null) {
      var tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-startup-screen'
      tag.dataset.pluginCss = tagId
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    /* ── 表单原子 ────────────────────────────────────────────────────────── */
    function Field(props) {
      return h('div', { className: '__ss_field' },
        h('label', { className: '__ss_label' }, props.label),
        props.children,
        props.hint ? h('div', { className: '__ss_hint' }, props.hint) : null
      )
    }

    function TextInput(props) {
      return h('input', {
        className: '__ss_input' + (props.mono ? ' __ss_inputMono' : ''),
        type: props.type || 'text',
        value: props.value == null ? '' : String(props.value),
        placeholder: props.placeholder || '',
        maxLength: props.maxLength || 64,
        disabled: props.disabled,
        'aria-label': props.label,
        autoComplete: props.type === 'password' ? 'new-password' : undefined,
        spellCheck: false,
        onChange: (e) => props.onChange(e.target.value)
      })
    }

    function Select(props) {
      function option(o) { return h('option', { key: o[0], value: o[0], disabled: !!o[2] }, o[1]) }
      return h('select', {
        className: '__ss_select',
        value: props.value,
        disabled: props.disabled,
        'aria-label': props.label,
        onChange: (e) => props.onChange(e.target.value)
      }, props.groups ? props.groups.map(g => h('optgroup', { key: g[0], label: g[0] }, g[1].map(option))) : props.options.map(option))
    }

    function Check(props) {
      return h('label', { className: '__ss_check' },
        h('input', {
          type: 'checkbox',
          checked: !!props.checked,
          onChange: (e) => props.onChange(e.target.checked)
        }),
        h('span', { className: '__ss_checkText' },
          h('span', null, props.label),
          props.hint ? h('span', { className: '__ss_hint' }, props.hint) : null
        )
      )
    }

    function ColorInput(props) {
      return h('input', {
        className: '__ss_swatch',
        type: 'color',
        value: props.value,
        onChange: (e) => props.onChange(e.target.value)
      })
    }

    function Range(props) {
      return h('div', { className: '__ss_row' },
        h('input', {
          type: 'range',
          min: props.min, max: props.max, step: props.step || 0.05,
          value: props.value,
          style: { flex: '1 1 200px' },
          disabled: props.disabled,
          'aria-label': props.label,
          onChange: (e) => props.onChange(Number(e.target.value))
        }),
        h('span', { className: '__ss_status' }, props.display)
      )
    }

    /* ── 语音：读系统里可用的音色，女声排在前面 ─────────────────────────── */
    var NATURAL_HINTS = ['natural', 'neural', 'online', 'premium', 'enhanced', 'siri', 'google']
    var FEMALE_HINTS = [
      'aria', 'jenny', 'michelle', 'emma', 'ava', 'libby', 'sonia', 'maisie',
      'zira', 'samantha', 'karen', 'moira', 'tessa', 'victoria', 'serena', 'allison',
      'susan', 'fiona', 'hazel', 'female', 'woman',
      'xiaoxiao', 'xiaoyi', 'xiaomo', 'huihui', 'yaoyao', '晓晓', '晓伊', '女声'
    ]
    var MALE_HINTS = ['david', 'mark', 'guy', 'ryan', 'george', 'daniel', 'alex', 'fred',
      'male', 'yunxi', 'yunjian', 'kangkang']

    function hits(name, list) {
      for (var i = 0; i < list.length; i++) if (name.indexOf(list[i]) !== -1) return true
      return false
    }
    /** 神经网络音色优先，其次女声，最后剔掉男声 —— 和运行时 splash.js 的打分口径一致 */
    function scoreVoice(name, lang, want) {
      var sc = 0
      if (hits(name, NATURAL_HINTS)) sc += 60
      if (hits(name, FEMALE_HINTS)) sc += 40
      if (hits(name, MALE_HINTS)) sc -= 45
      if (String(lang || '').indexOf(want) === 0) sc += 25
      return sc
    }

    function readVoices() {
      try {
        var s = window.speechSynthesis
        if (!s || typeof s.getVoices !== 'function') return []
        var list = s.getVoices() || []
        var want = 'en'
        var scored = list.map(function (v, i) {
          var name = String(v.name || '').toLowerCase()
          return {
            v: v,
            natural: hits(name, NATURAL_HINTS),
            female: hits(name, FEMALE_HINTS),
            sc: scoreVoice(name, String(v.lang || '').toLowerCase(), want),
            i: i
          }
        })
        scored.sort(function (a, b) {
          if (a.sc !== b.sc) return b.sc - a.sc
          return a.i - b.i
        })
        return scored.map(function (x) { return x.v })
      } catch (e) { return [] }
    }

    function speakSample(text, draft) {
      try {
        var s = window.speechSynthesis
        if (!s) return false
        s.cancel()
        var u = new window.SpeechSynthesisUtterance(text || 'Access permission required.')
        var list = readVoices()
        var target = null
        for (var i = 0; i < list.length; i++) if (list[i].name === draft.voiceName) target = list[i]
        if (target) { u.voice = target; u.lang = target.lang }
        u.rate = Math.min(2, Math.max(0.5, Number(draft.voiceRate) || 1))
        u.pitch = Math.min(2, Math.max(0, Number(draft.voicePitch) || 1))
        u.volume = Math.min(1, Math.max(0, Number(draft.voiceVolume) || 0.9))
        if (draft.voiceLang === 'zh') { u.text = '需要访问许可，验证通过。'; u.lang = 'zh-CN' }
        s.speak(u)
        return true
      } catch (e) { return false }
    }

    function VoicePicker(props) {
      var [list, setList] = react.useState(readVoices)
      react.useEffect(function () {
        var s = window.speechSynthesis
        if (!s) return
        var on = function () { setList(readVoices()) }
        try { s.addEventListener('voiceschanged', on) } catch (e) {}
        var t = setTimeout(on, 400)
        return function () {
          try { s.removeEventListener('voiceschanged', on) } catch (e) {}
          clearTimeout(t)
        }
      }, [])
      var auto = window.__DSH_STARTUP_API__ && window.__DSH_STARTUP_API__.voice
      var opts = [['', '自动（优先神经网络女声）' + (auto ? ' → ' + auto : '')]].concat(
        list.map(function (v) {
          var name = String(v.name || '').toLowerCase()
          var mark = hits(name, NATURAL_HINTS) ? '★ ' : (hits(name, FEMALE_HINTS) ? '♀ ' : '')
          return [v.name, mark + v.name + ' · ' + (v.lang || '')]
        })
      )
      return h('div', { className: '__ss_field' },
        h('label', { className: '__ss_label' }, '音色'),
        h('div', { className: '__ss_row' },
          h(Select, { value: props.value || '', options: opts, onChange: props.onChange }),
          h('button', {
            className: '__ss_btn',
            type: 'button',
            onClick: props.onPreview
          }, '试听')
        ),
        h('div', { className: '__ss_hint' },
          list.length
            ? '★ = 神经网络音色（念长句自然，推荐）；♀ = 女声但多为老式拼接合成，念长句会发塑料。'
              + '共 ' + list.length + ' 个，已按"神经网络 → 女声 → 排除男声"排好序。'
            : '这台机器暂时读不到系统音色（浏览器可能要等 voiceschanged，或系统没装英语语音包）。'
        )
      )
    }

    /* ── 面板 ────────────────────────────────────────────────────────────── */
    /* 本地兜底默认值：Host 半侧若是旧版本（配置里还没有语音字段），
       面板也要能正常显示这些控件，而不是一片 undefined。 */
    var FALLBACK = {
      voice: true, voiceLang: 'en', voiceName: '', voiceRate: 0.88, voicePitch: 0.85,
      voiceVolume: 0.9, voiceCue: true, voiceLead: 240, voiceSource: 'asset',
      synthesisSpeed: 1,
      sound: true, soundVolume: 0.5
    }
    function num(v, d) {
      var n = Number(v)
      return isFinite(n) ? n : d
    }

    /* 版本号的来源，按可靠性排序：
       1) 面板自己从 /dsh-startup/config 拿到的（Host 读的是它自己的 package.json）
       2) Host 往 index 里注入的 window.__DSH_STARTUP_VERSION__
          —— 桌面端走浏览器半侧自举时没有 1，就靠这一条
       3) 下面这个常量：两份都没拿到时的兜底，别让面板显示 undefined
       版本号本身只在 lib/index.js 里读一次，这里不重复维护。 */
    var FALLBACK_VERSION = '1.2.1'
    function readInjectedVersion() {
      try {
        var v = window.__DSH_STARTUP_VERSION__
        return v ? String(v) : ''
      } catch (e) { return '' }
    }

    function Panel() {
      var [draft, setDraft] = react.useState(null)
      var [defaults, setDefaults] = react.useState(null)
      var [file, setFile] = react.useState('')
      var [version, setVersion] = react.useState(readInjectedVersion)
      var [error, setError] = react.useState(null)
      var [notice, setNotice] = react.useState(null)
      var [busy, setBusy] = react.useState(false)
      var [catalog, setCatalog] = react.useState({ voices: [], hasApiKey: false })
      var [apiKey, setApiKey] = react.useState('')
      var [newFile, setNewFile] = react.useState(null)
      var [newName, setNewName] = react.useState('')
      var [referenceText, setReferenceText] = react.useState('')
      var [deleteId, setDeleteId] = react.useState('')
      var [speedText, setSpeedText] = react.useState('1.00')

      function voiceRequest(payload) {
        return fetch(VOICES_API, payload ? {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        } : { headers: { Accept: 'application/json' } }).then(r => r.json()).then(j => {
          if (!j || j.ok !== true) throw new Error((j && j.error) || '声音操作失败')
          return j
        })
      }
      function acceptConfig(config) {
        var speed = Math.min(1.10, Math.max(0.90, num(config.synthesisSpeed, 1)))
        var next = Object.assign({}, config, { synthesisSpeed: speed })
        setDraft(next)
        setSpeedText(speed.toFixed(2))
        window.__DSH_STARTUP__ = next
      }
      function runVoice(operation) {
        if (busy) return Promise.resolve()
        setBusy(true); setError(null); setNotice(null)
        return Promise.resolve().then(operation).catch(e => setError(String(e.message || e))).then(() => setBusy(false))
      }
      function syncVoice(next) {
        if (!validSpeed()) return Promise.reject(new Error('合成语速只能在 0.90～1.10 之间'))
        return voiceRequest({ action: 'sync', config: next }).then(j => {
          acceptConfig(j.config)
          setNotice('已保存并同步：复用 ' + j.cached + ' 段，生成 ' + j.generated + ' 段。')
          return j
        })
      }
      function switchVoice(id) {
        runVoice(() => syncVoice(Object.assign({}, draft, { voicePreset: id, voiceSource: 'asset' })))
      }
      function changeSynthesisSpeed(value) {
        if (busy) return
        setNotice(null)
        setDraft(d => d.synthesisSpeed === value ? d : Object.assign({}, d, { synthesisSpeed: value, sceneAudio: (d.sceneAudio || []).map(() => null) }))
      }
      function validSpeed(value) {
        var text = value == null ? speedText : value
        var n = Number(text)
        return String(text).trim() !== '' && isFinite(n) && n >= 0.90 && n <= 1.10
      }
      function editSpeed(value) {
        if (busy) return
        setSpeedText(value)
        if (validSpeed(value)) changeSynthesisSpeed(Number(value))
      }
      function commitSpeed() {
        if (busy) return
        var n = speedText.trim() === '' ? 1 : num(speedText, 1)
        var speed = Math.round(Math.min(1.10, Math.max(0.90, n)) * 100) / 100
        setSpeedText(speed.toFixed(2))
        changeSynthesisSpeed(speed)
      }
      function regenerate(sceneId) {
        if (!validSpeed()) { setError('合成语速只能在 0.90～1.10 之间'); return }
        runVoice(() => voiceRequest({ action: 'regenerate', sceneId,
          config: Object.assign({}, draft, { voiceSource: 'asset' }) }).then(j => {
          acceptConfig(j.config)
          setNotice('已重新生成 ' + j.generated + ' 段录音，可点击对应播放器试听。')
        }))
      }
      function saveKey() {
        runVoice(() => voiceRequest({ action: 'key', apiKey }).then(j => {
          setApiKey(''); setCatalog(c => Object.assign({}, c, { hasApiKey: j.hasApiKey }))
          return voiceRequest({ action: 'refresh' })
        }).then(j => { setCatalog(j); setNotice('API key 已保存，声音列表已刷新。') }))
      }
      function refreshVoices() {
        runVoice(() => voiceRequest({ action: 'refresh' }).then(j => { setCatalog(j); setNotice('声音列表已刷新。') }))
      }
      function fileData(file) {
        return new Promise((resolve, reject) => {
          if (!file || !file.size || file.size > 10 * 1024 * 1024) { reject(new Error('请选择不超过 10 MB 的音频文件')); return }
          var reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => reject(new Error('读取音频失败，请重新选择文件'))
          reader.readAsDataURL(file)
        })
      }
      function createVoice() {
        runVoice(() => fileData(newFile).then(audio => voiceRequest({ action: 'upload', audio,
          fileName: newFile.name, name: newName, text: referenceText })).then(j => {
          setCatalog(j)
          setNotice('声音已创建，正在生成各幕录音…')
          return syncVoice(Object.assign({}, draft, { voicePreset: j.voice.id, voiceSource: 'asset' }))
        }).then(() => { setNewName(''); setReferenceText('') }))
      }
      function removeVoice(id) {
        runVoice(() => voiceRequest({ action: 'delete', id }).then(j => {
          setCatalog(j); setDeleteId('')
          if (draft.voicePreset === id) acceptConfig(j.config)
          setNotice('声音已删除。')
        }))
      }
      function setScene(index, key, value) {
        setNotice(null)
        setDraft(d => {
          var scenes = d.scenes.map(s => Object.assign({}, s))
          if (key === 'zh' && defaults && defaults.scenes && scenes[index].speechText === defaults.scenes[index].speechText) scenes[index].speechText = ''
          scenes[index][key] = value
          // Audio belongs to the old saved script until synchronization succeeds.
          return Object.assign({}, d, { scenes, sceneAudio: (d.sceneAudio || []).map((a, i) => i === index ? null : a) })
        })
      }

      function load() {
        setError(null)
        return fetch(API, { headers: { Accept: 'application/json' } })
          .then((r) => r.json())
          .then((j) => {
            if (!j || j.ok !== true) throw new Error((j && j.error) || 'load failed')
            acceptConfig(Object.assign({}, FALLBACK, j.config))
            setDefaults(Object.assign({}, FALLBACK, j.defaults))
            setFile(j.file || '')
            if (j.version) setVersion(String(j.version))
          })
          .catch((e) => setError('读取配置失败：' + String(e && e.message ? e.message : e)))
      }

      react.useEffect(() => {
        load()
        voiceRequest().then(j => {
          setCatalog(j)
          if (j.hasApiKey) return voiceRequest({ action: 'refresh' }).then(setCatalog)
        }).catch(() => {})
      }, [])

      function set(key, value) {
        if (busy) return
        setNotice(null)
        setDraft((d) => Object.assign({}, d, { [key]: value }))
      }

      function save() {
        if (!draft) return
        if (!validSpeed()) { setError('合成语速只能在 0.90～1.10 之间'); return }
        if (draft.voiceSource !== 'tts' && draft.scenes) { runVoice(() => syncVoice(draft)); return }
        setBusy(true); setNotice(null); setError(null)
        fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patch: draft })
        })
          .then((r) => r.json())
          .then((j) => {
            if (!j || j.ok !== true) throw new Error((j && j.error) || 'save failed')
            acceptConfig(j.config)
            setNotice('已保存。下次打开 DSH 生效；点「立即预览」可以先看效果。')
          })
          .catch((e) => setError('保存失败：' + String(e && e.message ? e.message : e)))
          .then(() => setBusy(false))
      }

      function reset() {
        setBusy(true); setNotice(null); setError(null)
        fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reset' })
        })
          .then((r) => r.json())
          .then((j) => {
            if (!j || j.ok !== true) throw new Error((j && j.error) || 'reset failed')
            acceptConfig(j.config)
            setNotice('已恢复默认。')
          })
          .catch((e) => setError('恢复默认失败：' + String(e && e.message ? e.message : e)))
          .then(() => setBusy(false))
      }

      /** 用宿主里已经注入好的配置做一次即时预览；没有就退回刷新页面。 */
      function preview() {
        var api = window.__DSH_STARTUP_API__
        if (api && typeof api.replay === 'function') {
          api.replay()
          return
        }
        window.location.reload()
      }

      /* 版本号常驻顶部，不进骨架屏 —— 它不依赖配置接口，
         接口挂了也该看得见当前装的是哪一版。 */
      var versionLine = h('div', { className: '__ss_version' }, '版本 v' + (version || FALLBACK_VERSION))

      if (!draft) {
        return h('div', { className: '__ss_root' },
          versionLine,
          h('div', { className: '__ss_status' }, error ? error : '读取配置中…'),
          error ? h('div', { className: '__ss_actions' },
            h('button', { className: '__ss_btn', onClick: load }, '重试')
          ) : null
        )
      }

      var modeOptions = [
        ['session', '每个浏览器会话一次'],
        ['daily', '每天一次'],
        ['always', '每次打开都播放']
      ]

      return h('div', { className: '__ss_root' },
        versionLine,
        error ? h('div', { className: '__ss_err', role: 'alert' }, error) : null,
        notice ? h('div', { className: '__ss_ok', role: 'status' }, notice) : null,
        busy ? h('div', { className: '__ss_progress', role: 'status' }, '正在同步声音与录音，请稍候…') : null,

        /* 开关 */
        h('div', { className: '__ss_group' },
          h('div', { className: '__ss_groupTitle' }, '播放'),
          h(Check, {
            label: '启用启动动画',
            hint: '关闭后直接进主界面，不再显示启动界面。',
            checked: draft.enabled,
            onChange: (v) => set('enabled', v)
          }),
          h(Field, { label: '播放时机' },
            h(Select, { value: draft.mode, options: modeOptions, onChange: (v) => set('mode', v) })
          ),
          h(Field, { label: '速度倍率', hint: '调整视觉动画速度；录音按原速播放，画面仍会等录音结束。' },
            h('div', { className: '__ss_row' },
              h('input', {
                type: 'range', min: 0.35, max: 3, step: 0.05,
                value: draft.speed,
                style: { flex: '1 1 240px' },
                onChange: (e) => set('speed', Number(e.target.value))
              }),
              h('span', { className: '__ss_status' }, Number(draft.speed).toFixed(2) + '×')
            )
          )
        ),

        /* 身份 */
        h('div', { className: '__ss_group' },
          h('div', { className: '__ss_groupTitle' }, '身份资料'),
          h(Field, {
            label: '身份名称',
            hint: '终幕「欢迎 xxx 访问 / WELCOME, XXX」里的 xxx，也出现在第二步的身份卡上。'
          }, h(TextInput, { value: draft.identity, placeholder: '例如：JOYCE MOORE', onChange: (v) => set('identity', v) })),
          h('div', { className: '__ss_two' },
            h(Field, { label: '身份编号', hint: '显示在第二步身份卡上，建议用数字（如 0087）。' },
              h(TextInput, { value: draft.identityId, mono: true, onChange: (v) => set('identityId', v) })),
            h(Field, { label: '权限等级' },
              h(TextInput, { value: draft.accessLevel, mono: true, onChange: (v) => set('accessLevel', v) }))
          )
        ),

        /* 交互 */
        h('div', { className: '__ss_group' },
          h('div', { className: '__ss_groupTitle' }, '交互'),
          h(Check, {
            label: '需要人工确认',
            hint: '第 1、2 步停下来等按钮 / Enter / 空格；关闭则整段自动播放。',
            checked: draft.requireInteraction,
            onChange: (v) => set('requireInteraction', v)
          }),
          h(Check, {
            label: '允许跳过',
            hint: '右上角显示 SKIP，按 Esc 也能直接进主界面。',
            checked: draft.allowSkip,
            onChange: (v) => set('allowSkip', v)
          }),
          h(Check, {
            label: '音效',
            hint: '开启后在阶段推进和交互确认时播放电子音（浏览器需先有一次用户操作）。',
            checked: draft.sound,
            onChange: (v) => set('sound', v)
          })
        ),

        /* 声音：API key 留在本机 Host，不注入启动页。 */
        h('div', { className: '__ss_group' },
          h('div', { className: '__ss_groupTitle' }, '声音源'),
          h(Field, { label: '当前声音', hint: '切换时自动保存并同步各幕录音；有缓存就直接使用，缺少录音才调用接口。两套系统预设可离线播放。' },
            h(Select, { value: draft.voicePreset || 'original', disabled: busy || !validSpeed(), label: '当前声音',
              groups: [
                ['系统预设', [['original', '原版播报'], ['shaoluohuang', '少萝皇']]],
                ['我的声音', (catalog.voices || []).filter(v => v.kind === 'custom').map(v => [v.id, v.name, v.compatible === false])]
              ], onChange: switchVoice })
          ),
          h(Field, { label: '合成语速', hint: '输入 0.90～1.10，默认 1.00。超出范围时自动修正到边界；修改后点「一键同步音色」，已有录音会直接复用。' },
            h('div', { className: '__ss_row' },
              h('input', { className: '__ss_input', type: 'number', min: 0.90, max: 1.10, step: 0.01,
                value: speedText, disabled: busy, inputMode: 'decimal', 'aria-label': '合成语速',
                'aria-invalid': speedText !== '' && !validSpeed(), style: { width: '120px' },
                onChange: e => editSpeed(e.target.value), onBlur: commitSpeed }),
              h('span', { className: '__ss_status' }, '×'),
              speedText !== '' && !validSpeed() ? h('span', { className: '__ss_err', role: 'alert' }, '请输入 0.90～1.10') : null
            )
          ),
          h('div', { className: '__ss_actions' },
            h('button', { className: '__ss_btn __ss_btnPrimary', disabled: busy || !validSpeed(), onClick: () => runVoice(() => syncVoice(Object.assign({}, draft, { voiceSource: 'asset' }))) }, '一键同步音色'),
            h('button', { className: '__ss_btn', disabled: busy || !catalog.hasApiKey || !validSpeed(), onClick: () => regenerate() }, '全部重新生成'),
            h('button', { className: '__ss_btn', disabled: busy || !catalog.hasApiKey, onClick: refreshVoices }, '刷新我的声音')
          ),
          h(Field, { label: '硅基流动 API key', hint: catalog.hasApiKey ? '本机已保存 API key；需要更换时再填写。' : '创建声音、生成缺失录音和管理云端声音时需要填写。' },
            h('div', { className: '__ss_row' },
              h(TextInput, { type: 'password', value: apiKey, label: '硅基流动 API key', maxLength: 256, disabled: busy, placeholder: 'sk-…', onChange: setApiKey }),
              h('button', { className: '__ss_btn', disabled: busy || !apiKey.trim(), onClick: saveKey }, '保存 API key')
            )
          ),
          h('div', { className: '__ss_label' }, '我的声音'),
          h('div', { className: '__ss_voiceList' }, (catalog.voices || []).filter(v => v.kind === 'custom').map(v => h('div', { className: '__ss_voiceRow', key: v.id },
            h('span', null, v.name),
            deleteId === v.id ? h('div', { className: '__ss_row' },
              h('span', { className: '__ss_hint' }, '将删除云端声音'),
              h('button', { className: '__ss_btn', disabled: busy, onClick: () => removeVoice(v.id) }, '确认删除'),
              h('button', { className: '__ss_btn', disabled: busy, onClick: () => setDeleteId('') }, '取消')
            ) : h('button', { className: '__ss_btn', disabled: busy || !catalog.hasApiKey, onClick: () => setDeleteId(v.id) }, '删除')
          ))),
          !(catalog.voices || []).some(v => v.kind === 'custom') ? h('div', { className: '__ss_hint' }, '保存 API key 后刷新，即可查看账户已有声音。') : null,
          h('details', null,
            h('summary', { className: '__ss_label' }, '创建声音'),
            h('div', { className: '__ss_scene' },
              h(Field, { label: '参考音频', hint: '上传清晰人声文件，最大 10 MB。' },
                h('input', { type: 'file', accept: 'audio/*,.mp3,.wav,.m4a,.flac,.ogg', disabled: busy,
                  'aria-label': '参考音频', onChange: e => setNewFile(e.target.files[0] || null) })),
              h(Field, { label: '声音名称', hint: '留空使用文件名；支持中文名称。' },
                h(TextInput, { value: newName, disabled: busy, label: '声音名称', placeholder: newFile ? newFile.name : '例如：我的声音', onChange: setNewName })),
              h(Field, { label: '参考音频原文', hint: '填写参考音频实际说的内容，用于创建音色。' },
                h('textarea', { className: '__ss_input', value: referenceText, maxLength: 1000, disabled: busy,
                  'aria-label': '参考音频原文', onChange: e => setReferenceText(e.target.value) })),
              h('button', { className: '__ss_btn', disabled: busy || !catalog.hasApiKey || !newFile || !referenceText.trim() || !validSpeed(), onClick: createVoice }, '创建并同步各幕录音')
            )
          ),
          busy ? h('div', { className: '__ss_status', role: 'status' }, '正在处理声音与录音，请稍候…') : null
        ),

        draft.scenes ? h('div', { className: '__ss_group' },
          h('div', { className: '__ss_groupTitle' }, '每幕字幕与录音'),
          h('div', { className: '__ss_hint' }, '预设为中文画面、英文录音。播报文字留空时朗读中文字幕；终幕支持 {identity} 代表身份名称。修改后点「一键同步音色」或「保存」。'),
          draft.scenes.map((scene, i) => h('div', { className: '__ss_scene', key: scene.id },
            h('div', { className: '__ss_label' }, '第 ' + (i + 1) + ' 幕' + (i === 5 ? ' · 欢迎' : '')),
            h('div', { className: '__ss_two' },
              h(Field, { label: '画面中文字幕' }, h(TextInput, { value: scene.zh, disabled: busy, maxLength: 200, label: '第' + (i + 1) + '幕中文字幕', onChange: v => setScene(i, 'zh', v) })),
              h(Field, { label: '画面英文副标题' }, h(TextInput, { value: scene.en, disabled: busy, maxLength: 200, label: '第' + (i + 1) + '幕英文副标题', onChange: v => setScene(i, 'en', v) }))
            ),
            h(Field, { label: '实际播报文字', hint: '留空朗读中文字幕。' }, h(TextInput, { value: scene.speechText, disabled: busy, maxLength: 1000,
              label: '第' + (i + 1) + '幕实际播报文字', placeholder: scene.zh, onChange: v => setScene(i, 'speechText', v) })),
            draft.sceneAudio && draft.sceneAudio[i] ? h('audio', { controls: true, preload: 'none', src: draft.sceneAudio[i], 'aria-label': '试听第' + (i + 1) + '幕' }) : h('div', { className: '__ss_hint' }, '待同步录音'),
            h('button', { className: '__ss_btn', disabled: busy || !catalog.hasApiKey || !validSpeed(), onClick: () => regenerate(scene.id) }, '重新生成这一幕')
          ))
        ) : null,

        /* 语音与音效 */
        h('div', { className: '__ss_group' },
          h('div', { className: '__ss_groupTitle' }, '语音与音效'),
          h(Check, {
            label: '语音播报',
            hint: '按各幕实际播报文字出声；画面会等录音播放完再切换。浏览器首次出声可能需要点击或按键。',
            checked: draft.voice,
            onChange: (v) => set('voice', v)
          }),
          h(Field, {
            label: '语音来源',
            hint: '录音使用当前所选声音的本地文件；系统 TTS 使用本机语音合成。'
          },
            h(Select, {
              value: draft.voiceSource || 'asset',
              options: [['asset', '本地录音（预设 / 自定义声音）'], ['tts', '系统 TTS 合成']],
              onChange: (v) => set('voiceSource', v)
            })
          ),
          h(Field, { label: 'TTS 试听语言', hint: '每幕正式播报以该幕的实际播报文字为准。' },
            h(Select, {
              value: draft.voiceLang,
              options: [['en', '英语（照参考片）'], ['zh', '中文'], ['both', '中英各念一遍']],
              onChange: (v) => set('voiceLang', v)
            })
          ),
          draft.voice ? h(VoicePicker, {
            value: draft.voiceName,
            onChange: (v) => set('voiceName', v),
            onPreview: () => speakSample(null, draft)
          }) : null,
          draft.voice ? h('div', { className: '__ss_row' },
            h('button', {
              className: '__ss_btn',
              type: 'button',
              onClick: () => {
                set('voiceRate', 0.88)
                set('voicePitch', 0.85)
                set('voiceName', '')
                set('voiceCue', true)
                set('voiceLead', 240)
              }
            }, '↺ 套用「电影旁白」档'),
            h('span', { className: '__ss_hint' }, '语速 0.88 · 音调 0.85（压抑、深沉）· 自动挑神经网络女声 · 提示音 + 开口留白')
          ) : null,
          draft.voice ? h('div', { className: '__ss_two' },
            h(Field, { label: '语速', hint: '只影响系统 TTS；生成录音请使用上方的「合成语速」。' },
              h(Range, { value: num(draft.voiceRate, 1), min: 0.5, max: 2, step: 0.01, display: num(draft.voiceRate, 1).toFixed(2) + '×', onChange: (v) => set('voiceRate', v) })
            ),
            h(Field, { label: '音调' },
              h(Range, { value: num(draft.voicePitch, 1), min: 0, max: 2, display: num(draft.voicePitch, 1).toFixed(2), onChange: (v) => set('voicePitch', v) })
            )
          ) : null,
          draft.voice ? h(Field, { label: '开口前留白', hint: '提示音响过之后停多久再开口。电影旁白/机场广播都有这一拍，240ms 起最像"系统在播报"。' },
            h(Range, {
              value: num(draft.voiceLead, 240), min: 0, max: 800, step: 20,
              display: Math.round(num(draft.voiceLead, 240)) + ' ms',
              onChange: (v) => set('voiceLead', v)
            })
          ) : null,
          draft.voice ? h(Field, { label: '音量' },
            h(Range, { value: num(draft.voiceVolume, 0.9), min: 0, max: 1, display: Math.round(num(draft.voiceVolume, 0.9) * 100) + '%', onChange: (v) => set('voiceVolume', v) })
          ) : null,
          draft.voice ? h(Check, {
            label: '播报前提示音',
            hint: '念台词之前先响两声轻提示 —— 这一笔让 TTS 从「浏览器念字」变成「系统播报」，是 AI 感的关键。',
            checked: draft.voiceCue,
            onChange: (v) => set('voiceCue', v)
          }) : null,
          h(Check, {
            label: '界面音效',
            hint: '阶段「哒」声、连续读数声、确认音、过场扫频和终幕和声钟。',
            checked: draft.sound,
            onChange: (v) => set('sound', v)
          }),
          draft.sound ? h(Field, { label: '音效音量' },
            h(Range, { value: num(draft.soundVolume, 0.5), min: 0, max: 1, display: Math.round(num(draft.soundVolume, 0.5) * 100) + '%', onChange: (v) => set('soundVolume', v) })
          ) : null
        ),

        /* 视觉 */
        h('div', { className: '__ss_group' },
          h('div', { className: '__ss_groupTitle' }, '视觉'),
          h(Field, { label: '主题' },
            h(Select, {
              value: draft.theme,
              options: [['light', '浅色 · 暖白档案底板（参考片原色）'], ['dark', '深色 · 暗底板']],
              onChange: (v) => set('theme', v)
            })
          ),
          h('div', { className: '__ss_two' },
            h(Field, { label: '强调色 · 橙' },
              h('div', { className: '__ss_row' },
                h(ColorInput, { value: draft.accent, onChange: (v) => set('accent', v) }),
                h('span', { className: '__ss_status' }, draft.accent)
              )
            ),
            h(Field, { label: '故障色 · 蓝' },
              h('div', { className: '__ss_row' },
                h(ColorInput, { value: draft.glitchB, onChange: (v) => set('glitchB', v) }),
                h('span', { className: '__ss_status' }, draft.glitchB)
              )
            )
          )
        ),

        /* 文案 */
        h('div', { className: '__ss_group' },
          h('div', { className: '__ss_groupTitle' }, '文案'),
          h('div', { className: '__ss_two' },
            h(Field, { label: '左上 · 主标题' }, h(TextInput, { value: draft.brand1, onChange: (v) => set('brand1', v) })),
            h(Field, { label: '左上 · 产品行' },
              h('div', { className: '__ss_row' },
                h(TextInput, { value: draft.brand3a, onChange: (v) => set('brand3a', v) }),
                h('span', { className: '__ss_status' }, '+'),
                h(TextInput, { value: draft.brand3b, onChange: (v) => set('brand3b', v) })
              )
            )
          ),
          h(Field, { label: '左上 · 副标题' }, h(TextInput, { value: draft.brand2, maxLength: 40, onChange: (v) => set('brand2', v) })),
          h('div', { className: '__ss_two' },
            h(Field, { label: '黑幕 · 中文' }, h(TextInput, { value: draft.orgZh, onChange: (v) => set('orgZh', v) })),
            h(Field, { label: '黑幕 · 英文' }, h(TextInput, { value: draft.orgEn, mono: true, onChange: (v) => set('orgEn', v) }))
          ),
          h('div', { className: '__ss_two' },
            h(Field, { label: '黑幕 · 小字' }, h(TextInput, { value: draft.orgSub, mono: true, onChange: (v) => set('orgSub', v) })),
            h(Field, { label: '终幕 · 黑框' }, h(TextInput, { value: draft.welcomeBox, onChange: (v) => set('welcomeBox', v) }))
          ),
          h(Field, { label: '右下 · 页脚' }, h(TextInput, { value: draft.footer, mono: true, onChange: (v) => set('footer', v) }))
        ),

        /* 预览 + 操作 */
        h('div', { className: '__ss_preview' },
          h('div', { className: '__ss_previewText' },
            '预览会按当前「已保存」的配置重播一次。想先看新配置，先点保存再预览。',
            file ? h('div', { style: { marginTop: '4px', opacity: 0.75 } }, '配置文件：' + file) : null
          ),
          h('button', { className: '__ss_btn', onClick: preview }, '立即预览')
        ),

        h('div', { className: '__ss_actions' },
          h('button', {
            className: '__ss_btn __ss_btnPrimary',
            disabled: busy || !validSpeed(),
            onClick: save
          }, busy ? '处理中…' : '保存'),
          h('button', { className: '__ss_btn', disabled: busy, onClick: reset }, '恢复默认'),
          h('button', { className: '__ss_btn', disabled: busy, onClick: load }, '放弃修改')
        )
      )
    }

    /* ── 桌面端自举 ──────────────────────────────────────────────────────── */
    /* Host 半侧靠 ctx.webServer.tapIndex 往 index.html 里注入启动界面。
       web profile 一定走这条路；但 Electron 也可能改用 file:// + IPC 直接下发
       前端（dsh-host-webserver 的注释就写着 "Electron uses file:// plus IPC
       instead"），那时 index 注入整条不生效。所以浏览器半侧自己兜一层：
       没被 Host 接管时，由本侧建根节点 + 拉 splash.css/splash.js 自举。

       判定全在 window 上，不去猜宿主类型：
         __DSH_STARTUP_BOOT__  Host 已经注入过（index）/ 本侧已经自举过（client）
         __DSH_STARTUP_SKIP__  Host 侧的兜底脚本已判定"这次不播"
         __DSH_STARTUP__       配置已就位（Host 注入的）
       Host 判定失效时不该被静默吃掉，所以这里在拦到 SKIP 之前，还要看一眼
       Host 侧根本没跑过（BOOT 标记为空）这种情况：把兜底脚本的同款判定补做一遍。 */
    var BOOT_ROUTE = '/dsh-startup'

    function readFlag(store, key) {
      try {
        var s = window[store]
        return s ? s.getItem(key) : null
      } catch (e) { return null }
    }

    function writeFlag(store, key, value) {
      try {
        var s = window[store]
        if (s) s.setItem(key, value)
      } catch (e) { /* 隐私模式下可能抛，忽略 */ }
    }

    function markBooted() {
      try { window.__DSH_STARTUP_BOOT__ = 'client' } catch (e) { /* noop */ }
    }

    /** 挂一个 <script src>；失败时调 fail(err)。 */
    function loadScript(src, fail) {
      var s = document.createElement('script')
      s.src = src
      s.async = false
      if (typeof fail === 'function') {
        s.addEventListener('load', function () { fail(null) })
        s.addEventListener('error', function () { fail(new Error('script load failed: ' + src)) })
      }
      ;(document.head || document.documentElement).appendChild(s)
    }

    /** 挂一份 <link rel=stylesheet>；失败时调 fail(err)。 */
    function loadCss(href, fail) {
      var link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      if (typeof fail === 'function') {
        link.addEventListener('load', function () { fail(null) })
        link.addEventListener('error', function () { fail(new Error('css load failed: ' + href)) })
      }
      ;(document.head || document.documentElement).appendChild(link)
    }

    /** 移除根节点、解开滚动锁定 —— 自举任何一步失败都要把页面还回去。 */
    function release(ok) {
      if (ok) return
      try {
        var r = document.getElementById('dsh-startup-root')
        if (r && r.parentNode) r.parentNode.removeChild(r)
        if (document.documentElement.classList) document.documentElement.classList.remove('dsu-lock')
        if (document.body && document.body.style) document.body.style.overflow = ''
        window.__DSH_STARTUP_FAILED__ = true
      } catch (e) { /* 兜底不再抛 */ }
    }

    function injectRoot(cfg) {
      var root = document.getElementById('dsh-startup-root')
      if (!root) {
        root = document.createElement('div')
        root.id = 'dsh-startup-root'
        document.body.appendChild(root)
      }
      root.className = 'dsu-root dsu-boot'
      if (document.documentElement.classList) document.documentElement.classList.add('dsu-lock')
      if (document.body && document.body.style) document.body.style.overflow = 'hidden'

      /* 样式与运行时都从 Host 路由取 —— 同一份文件，不额外维护内联副本 */
      var failed = false
      var cssReady = false
      var scriptReady = false
      function guard(err) {
        if (err) {
          if (!failed && typeof console !== 'undefined' && console.warn) {
            console.warn('[dsh-startup-screen] 启动界面自举失败，已放开页面：', err.message)
          }
          failed = true
          release(false)
          return
        }
        if (cssReady && scriptReady) release(true)
      }

      loadCss(BOOT_ROUTE + '/splash.css', function (err) {
        if (err) { guard(err); return }
        cssReady = true
        guard(null)
      })

      /* 配置先落 window：splash.js 载入时直接读它 */
      window.__DSH_STARTUP__ = cfg || {}
      try {
        delete window.__DSH_STARTUP_LOADED__
      } catch (e) { window.__DSH_STARTUP_LOADED__ = undefined }
      loadScript(BOOT_ROUTE + '/splash.js?t=' + Date.now(), function (err) {
        if (err) { guard(err); return }
        scriptReady = true
        guard(null)
      })

      /* 自愈：样式与脚本都拿到了、这个标记还在，就说明动画没接管，放行 */
      setTimeout(function () {
        try {
          var r = document.getElementById('dsh-startup-root')
          if (r && r.className && r.className.indexOf('dsu-boot') !== -1) release(false)
        } catch (e) { /* 兜底不再抛 */ }
      }, 9000)
    }

    function selfBoot() {
      try {
        if (typeof window === 'undefined' || typeof document === 'undefined') return
        if (!document.body) return
        if (window.__DSH_STARTUP_BOOT__) return          /* 已被 Host 或本侧接管 */
        if (window.__DSH_STARTUP__) return               /* 配置已在页面上：Host 注入过 */
        if (document.getElementById('dsh-startup-root')) return
        /* 已经出过错的地方不要再扑一次 */
        if (window.__DSH_STARTUP_FAILED__ === true) return
        markBooted()
        fetch(API, { headers: { Accept: 'application/json' } })
          .then(function (r) { return r.json() })
          .then(function (j) { return j && j.ok === true ? j.config : null })
          .catch(function () { return null })
          .then(function (cfg) {
            cfg = cfg || { enabled: true, mode: 'session', speed: 1 }
            if (cfg.enabled === false) return
            var today = new Date().toISOString().slice(0, 10)
            if (cfg.mode === 'session' && readFlag('sessionStorage', 'dsh-startup-screen:shown') === '1') return
            if (cfg.mode === 'daily' && readFlag('localStorage', 'dsh-startup-screen:day') === today) return
            /* 回填判定标记，保证与 Host 侧同款语义（splash.js 会读这两个键） */
            if (cfg.mode === 'session') writeFlag('sessionStorage', 'dsh-startup-screen:shown', '1')
            if (cfg.mode === 'daily') writeFlag('localStorage', 'dsh-startup-screen:day', today)
            return injectRoot(cfg)
          })
          .catch(function () { /* 自举失败就算了，页面本来就是好的 */ })
      } catch (e) { /* 自举是兜底，绝不许把宿主带崩 */ }
    }

    /* ── 插件 ────────────────────────────────────────────────────────────── */
    var inject = ['slots']

    function apply(ctx) {
      /* 桌面端兜底：Host 的 index 注入不生效时，由这里自举启动界面。
         正常 web 流程下 __DSH_STARTUP__/__DSH_STARTUP_BOOT__ 已就位，本调用直接返回。 */
      selfBoot()
      ctx.slots.inject('settings.section', function () {
        return ctx.slots.register(
          { name: 'settings.section', id: 'startup-screen', order: 26, label: '启动动画' },
          function () { return h(Panel, {}) }
        )
      })
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
