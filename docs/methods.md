# Methods and boundaries / 方法与边界

## Purpose

This application makes a bibliography inspection process explicit and reproducible. It does not evaluate the truth of a legal proposition or produce a legal opinion. Its central distinction is between **syntax**, **bibliographic metadata**, and **a human's examination of the original source**.

## Local parsing

Each non-empty physical line becomes one reference. Blank lines retain their place in line numbering. Input is capped at 400 references, 250,000 total characters, and 10,000 characters per reference.

DOI candidates follow `10.` plus four to nine digits, `/`, and a non-whitespace suffix. Trailing sentence punctuation and unmatched closing wrappers are removed; balanced parentheses in suffixes are retained. Case is normalized. This is a permissive parser for common DOI notation, not the complete DOI specification and not a registration check. Several DOI candidates on one line produce a warning; the application does not silently choose among them.

Quoted titles (`“…”`, `"…"`, `《…》`) and an explicit `title:` field are candidates. A unique four-digit year from 1800 to 2099 is extracted after links and DOI tokens are removed. An author candidate is the text before a parenthesized year or opening title quote, with full-width parentheses normalized for author extraction. These simple rules are intentionally visible. Unquoted English references, multiple historical dates, legal case identifiers and composite citations often need manual correction.

Duplicates are repeated normalized DOI identifiers, or repeated normalized reference text where no DOI is resolved. A duplicate warning is a prompt to inspect editions or pinpoint citations; it is not a deletion instruction. Missing DOI is informational because much primary law, legal scholarship and printed material has no DOI.

Only HTTP(S) source URLs without embedded credentials can become links. Source links are never fetched automatically.

## Optional metadata retrieval

Crossref's [public REST API](https://www.crossref.org/documentation/retrieve-metadata/rest-api/) exposes metadata deposited by publishers and other sources. The application requests a single work at `https://api.crossref.org/works/{encoded DOI}` only after the session checkbox is enabled. It does not send bibliography text, review notes or a personal email address. Requests omit credentials and referrers.

Up to ten requests run sequentially per batch, with a 700 ms pause between them. Requests time out after twelve seconds. Synthetic examples are excluded. Unchecking the consent box stops subsequent queued requests; a request already sent may finish. No request is made on reload merely because a previously retrieved record was saved.

A successful response stores only the DOI, title candidates, author names, publication-year candidates and retrieval time. No abstract, affiliation or full text is stored. `404` means the Crossref endpoint returned no record, not that the source is fabricated. Other non-success responses, timeouts, browser access failures and offline conditions do not determine source existence.

## Conservative comparisons

1. Unicode text is normalized with NFKC and lowercased. Punctuation, symbols and whitespace normalize to a single separator.
2. Title equality scores `1`. A substantial title of at least twenty normalized characters that is a complete prefix of another title scores `.96`, accommodating an appended subtitle. Other pairs use Sørensen–Dice overlap of character bigram sets.
3. A title score at least `.90` is agreement under this rule. A score below `.45` flags a possible mismatch. Intermediate scores remain inconclusive.
4. Any registered year in `published`, `published-print`, `published-online`, or `issued` may agree with the citation year. A different year flags possible mismatch; the note explicitly allows edition or online-publication explanations.
5. At least one registered author family name must overlap as complete normalized word tokens, or as a Chinese-name substring. This establishes only partial author overlap. No overlap remains inconclusive, because transliteration, corporate authors and author truncation are common.
6. Missing required comparison fields leave status unknown. A different returned DOI, substantially different title, or unmatched year produces possible mismatch. Metadata agreement requires title, year and author overlap together.

These thresholds are transparent design choices, **not validated estimates of truth or accuracy**. Similarity is not displayed as a probability. Translated titles, very short titles, repeated surnames, corrections, revised deposits, preprints and editions may defeat the rules. Use a field correction only after inspecting the original reference; do not simply edit a citation until it agrees with a record.

## Status semantics

| Metadata status | Meaning |
| --- | --- |
| Unknown | Not queried; no record returned; insufficient or ambiguous comparison; or an imported snapshot |
| Metadata agrees | A retrieved record meets the documented comparison rules |
| Possible mismatch | At least one substantive field conflicts under the rules; a person should investigate |
| Lookup error | Request failed; no inference about the source is made |

The independent human-review states are **Not reviewed**, **Source inspected**, **Needs follow-up**, and **Do not use**. A human can record a source review even if metadata is unknown. “Source inspected” is a declaration made by the user, not an automated seal of validity.

## Storage, imports and exports

The local workspace includes original references, editable fields, notes, human-review states and retrieved metadata. JSON imports must match version 1 of this application's schema and fit a 2 MB file limit. Rows, unique physical lines, unique IDs, field types, lengths, dates, states and metadata shapes are checked before replacing current data. Derived DOI and synthetic fields are recalculated from original text. Imported metadata is marked as an unverified snapshot and cannot acquire a metadata-agreement status until refreshed.

Data is rendered with DOM text nodes, not inserted as HTML. CSV cells are quoted, quotes are escaped, and values beginning with spreadsheet formula triggers after whitespace receive a leading apostrophe. Markdown escapes user-provided table separators and markup. JSON provides the richest reproducible record; CSV and Markdown include line-specific findings.

Browser local storage is a convenience rather than a secure archive. It is not encrypted and can be deleted by browser settings, exhausted, or accessed by other applications running under the same site origin. The application reports failed saves. Export backups for important work.

## Verified development example

The application includes the bibliographic record for **On the Dangers of Stochastic Parrots**, DOI `10.1145/3442188.3445922`. On **2026-10-04**, a development-time request to [the Crossref endpoint](https://api.crossref.org/works/10.1145/3442188.3445922) returned that title, publication year 2021, and the family names Bender, Gebru, McMillan-Major and Shmitchell. This is a bibliographic demonstration; no assertion about the paper's claims or the user's agreement with them is implied. The browser retrieves its own record only if the user opts in.

## 中文方法说明

本工具把 DOI 语法识别、登记元数据比较、人工阅读原始来源三个环节分开。每条非空行保留原始行号；每行最多一条引注。题名、年份和作者是可修正的解析候选，而非确定识别结果。没有 DOI 仅提示信息，不据此判断法条、判例或纸本资料是否存在。

Crossref 查询必须由本次会话明确勾选授权。请求只发送 DOI，不发送完整引注或笔记。每批最多十条，逐条查询，单次请求十二秒超时。取消勾选会停止之后的排队请求；已经发出的请求可能完成。刷新页面不会自动联网。Crossref 没有返回记录、网络失败、其他 DOI 登记机构等情形均不能推导来源不存在。

题名使用 Unicode 标准化、标点清理和字符二元组比较；相似度达到 0.90 视为符合当前文本规则，低于 0.45 提示可能不一致，中间范围保持未知。完整且足够长的题名前缀可以容纳副标题。年份可匹配多个登记出版日期中的任一个；作者仅检查至少一个姓氏重合，不核实完整作者名单。作者转写、译名、短题名、版本差异等情形都需要人工复核。

这些规则和阈值没有经过外部基准验证，不能当作准确率、可信概率或法律有效性判断。人工审阅状态由使用者自行填写，与元数据状态独立。导入的元数据仅是快照，重新查询前保持未知。JSON 导入先检查结构、大小和字段，再请求替换确认；CSV 和 Markdown 导出对公式前缀、表格字符及用户内容作转义处理。

本项目不调用大模型，不评估法律观点，不宣称符合任何正式引注手册。若用于法学论文，仍需人工检查原文、页码、引文含义、法律时效、刊物引注规范和来源许可。
