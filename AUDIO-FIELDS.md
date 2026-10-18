# 音频与字幕配置（1.2.1）

每幕使用独立字幕和录音。原版文件不改动；「少萝皇」以 `shaoluohuang-` 为文件名前缀。

| 幕 | 默认画面字幕 | 默认实际播报文字 | 原版文件 | 新预设文件 |
|---|---|---|---|---|
| 1 | 需要访问许可 | Access permission required. | line-1.mp3 | shaoluohuang-line-1.mp3 |
| 2 | 身份资料确认 | ID confirmed. | line-2.mp3 | shaoluohuang-line-2.mp3 |
| 3 | 接收访问需求 | Request received. | line-3.mp3 | shaoluohuang-line-3.mp3 |
| 4 | 开始读取权限 | Start processing. | line-4.mp3 | shaoluohuang-line-4.mp3 |
| 5 | 读取完毕 · 核验通过 | Permission authorized. | line-5.mp3 | shaoluohuang-line-5.mp3 |
| 6 | 欢迎 {identity} 访问 | Welcome. | line-6.mp3 | shaoluohuang-line-6.mp3 |

所有打包素材在 `lib/assets/`。`lib/voice-presets.json` 记录新预设的实际请求文本、文件大小与 SHA256，不包含 API key 或云端声音 URI。

## 自定义字幕与声音

配置的 `voicePreset` 为 `original`、`shaoluohuang` 或账户声音的不透明 ID。
`scenes` 有六项，固定 ID 为 `line-1` 到 `line-6`，各项包含 `zh`、`en` 和 `speechText`。
`speechText` 留空使用 `zh`；`{identity}` 在生成前替换为当前身份名称。只改预设中文字幕时，面板会清空该幕的预设英文播报文字，让新录音默认跟随中文字幕。已明确填写的自定义播报文字会保留。

切换声音及「一键同步音色」先查本地缓存，只对缺失的音色与文本组合调用合成接口。
`synthesisSpeed` 为合成语速（0.90～1.10，默认 1.00），使用数字输入框填写，步进 0.01；前端失焦修正越界值，后端同步限制范围，再通过接口的 `speed` 字段传入。音色、台词及语速共同决定缓存，切换语速不会覆盖其他语速的录音。包内两套预设为 1 倍速。
创建声音后，面板立即根据当前六幕配置生成录音。录音全部就绪后才激活新声音；中途失败时保留先前可用配置，已生成的文件可在重试时复用。

「重新生成这一幕」和「全部重新生成」跳过已有缓存，生成成功后发布新的音频 URL，避免浏览器继续使用旧文件。
生成失败不覆盖旧录音。重新生成系统预设时，录音保存在用户缓存目录，不改包内原始 MP3。

## 播放时序

各幕开始时触发语音，并与字幕动画并行。提示音后等待 `voiceLead`（默认 240 ms）再开口。

- 第 1、2 幕：等待用户确认（关闭人工确认时自动通过）、实际录音结束和最短视觉时间，再过渡。
- 第 3～5 幕：等待实际录音 `onended`，再留收尾时间。视觉动画加速不会提前截断录音。
- 第 6 幕：欢迎动画和录音并行，揭幕前等待欢迎录音结束。
- 声卡被浏览器自动播放策略挂起时，显示「点击或按键启用声音」；操作后恢复，即使界面音效关闭也可解锁人声。
- 跳过、结束和重播会停止实际 BufferSource、取消 TTS，并清理旧时间线。

## 界面音效

`sfx-tick.mp3` 在第 1～5 幕开始时播放，`sfx-ticks-run.mp3` 在第 4 幕十六进制瀑布开始时播放。
`rise`（标识出现）、`sweep`（洗白）、`cue`（播报前双提示）、`confirm`（确认）和 `chime`（终幕和声钟）由 WebAudio 合成。
逐字字幕函数不播放逐字音效。

## 存储与接口

普通配置：`DSH_HOME/dsh-startup.json`。
凭证：`DSH_HOME/startup-voices/credentials.json`，仅本机 Host 读取。
声音元数据与缓存索引：`DSH_HOME/startup-voices/library.json`。
生成文件：`DSH_HOME/startup-voices/cache/`。

`GET/POST /dsh-startup/voices` 提供声音管理、同步和重生成；仅返回声音名称、不透明 ID 和本地音频路由，不向浏览器返回云端 URI 或 API key。
`/dsh-startup/asset/<文件名>.mp3` 提供包内素材，`/dsh-startup/voice-cache/<哈希>.mp3` 提供生成文件。
所有路由经过宿主信任检查，并拒绝跨站来源请求。
