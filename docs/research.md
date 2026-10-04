# Research questions / 可继续研究的问题

## Motivation

AI-assisted research can blur two different questions: whether a bibliographic source can be identified and whether that source supports the claim for which it is cited. A reference can have a genuine DOI while naming the wrong article; a correct bibliographic record can still be cited for a proposition absent from its text. Citation Audit preserves that distinction as a small research instrument.

For social law and LLM governance, a useful next step is to examine how reference integrity affects research on access to social benefits, automated administrative decisions, procedural safeguards, and the accountability of AI-supported legal services. These are proposed topics, not substantive legal conclusions.

## A proposed evaluation protocol

Build a permission-compatible, manually annotated reference set with four categories: complete references, incomplete references, translated or abbreviated references, and deliberately altered references. Keep synthetic alterations clearly labeled and separate from real-world observations. Include sources without DOI rather than removing legal materials that do not fit scholarly-metadata APIs.

Have at least two human reviewers independently annotate field identity, edition/date ambiguity and whether a source actually supports a specified claim. Report disagreements and adjudication rules. Evaluate the local parser separately from the optional metadata comparison. Report warning precision, unresolved rates, and false mismatch rates by source type and language; do not turn a bibliographic agreement rate into a claim-verification rate.

Freeze or archive permitted metadata snapshots and record retrieval times so API updates can be distinguished from changes to the rules. Publish the annotation rubric, permitted examples, evaluation code and error analysis. Do not publish copyrighted full texts, restricted database results or confidential research notes without a suitable license or authorization.

No annotated benchmark, accuracy figure, model comparison or real-user study is claimed in this repository. The included tests verify implementation behavior under selected cases; they do not demonstrate empirical research performance.

## 中文说明

可围绕社会保障获得、自动化行政决定、程序保障和 AI 法律服务问责等研究主题，进一步考察 AI 辅助研究中的引注可靠性。核心问题是：书目真实与引文观点得到支持并不是同一判断。

建议构建经许可、经人工标注的小型参考文献集，分别覆盖完整条目、不完整条目、译名或缩写条目和明确标注的合成错误条目，同时保留没有 DOI 的法律资料。由两位审阅者独立区分字段身份、版本日期歧义及“来源是否支持具体观点”，并记录分歧处理规则。解析性能和元数据比较性能应分别报告，不能把书目匹配率当作观点核实准确率。

本仓库尚未实施上述基准实验或用户研究，也没有已验证的准确率、模型对比或论文成果。现有自动测试只验证实现规则，不证明实际研究效能。
