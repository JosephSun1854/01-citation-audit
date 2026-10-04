# Contributing

Contributions that improve transparent parsing, accessibility, bilingual explanations or export safety are welcome.

Before proposing a rule, describe the reference pattern, why the current behavior is incomplete, and which cases should remain unknown. Add a focused regression test in `tests/core.test.js`; do not redefine a metadata match as source or claim verification. Use synthetic cases for bug reports and do not include private notes, confidential manuscripts or restricted database records.

Run `node --check core.js`, `node --check app.js`, and `node --test`. For interface changes, check keyboard navigation and a narrow mobile viewport. No package installation or build is needed.

中文：欢迎改进透明解析、无障碍、中英说明和导出安全。提交规则时请说明条目模式、现有问题及应继续保持未知的情形，并补充有意义的回归测试。问题报告请使用合成案例，勿包含私人笔记、未公开稿件或受限数据库材料。
