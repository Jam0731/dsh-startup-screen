# 来源与署名

- 原始项目：[6shenhonghong9/dsh-startup-screen](https://github.com/6shenhonghong9/dsh-startup-screen)
- 原始开发者：沈宏宏（6shenhonghong9）
- 本版维护者：[Jam0731](https://github.com/Jam0731)
- 本版仓库：[Jam0731/dsh-startup-screen](https://github.com/Jam0731/dsh-startup-screen)
- 代码许可：MIT。原版权声明与完整许可保留于 [LICENSE](LICENSE)，并补充本版增强代码署名。

本仓库从上游 Fork，保留原始 Git 提交历史。启动动画与插件基础由原作者开发；本版增加硅基流动声音管理、两套录音预设、逐幕字幕与播报配置、按声音/文本/语速缓存、单幕及全部重新生成，以及 0.90～1.10 的合成语速输入框，并修正录音播放结束前提前切换画面的情况。

## 音频素材范围

- `lib/assets/line-1.mp3` 至 `line-6.mp3`、`sfx-tick.mp3`、`sfx-ticks-run.mp3`：继承自上游。上游 README 说明这些音频取自第三方视频，权利归原权利人所有。
- `original-reference.mp3`：由上游六段人声拼接形成，供用户调整原版预设台词时参考；不扩大原素材的授权范围。
- `shaoluohuang-reference.mp3`：本版开发过程中提供的参考音频。
- `shaoluohuang-line-1.mp3` 至 `shaoluohuang-line-6.mp3`：使用上述参考音频，通过硅基流动的 `FunAudioLLM/CosyVoice2-0.5B` 合成。请求文本与文件校验值记录在 `lib/voice-presets.json`。

MIT 许可适用于原始代码和本版新增代码，不为第三方音频、参考素材或声音提供额外授权。使用和再分发相关素材前，应确认适用的权利与服务条款。原作者、素材权利人及接口提供方未因此为本增强版背书。
