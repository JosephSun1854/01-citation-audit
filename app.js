import {
  auditText,
  allIssues,
  rowStatus,
  metadataFromCrossref,
  compareMetadata,
  exportCSV,
  exportMarkdown,
  validateWorkspace,
  workspace,
  REVIEW_STATES,
} from "./core.js";

const $ = (id) => document.getElementById(id);
const STORAGE = "law-ai-citation-audit-v1";
const LANGUAGE = "law-ai-citation-audit-language";
const dictionary = {
  en: {
    skip: "Skip to workspace",
    eyebrow: "01 / Research integrity",
    title: "Citation Audit",
    subtitle:
      "A clear trail from bibliography to evidence. Inspect references written by people or AI, compare DOI metadata, and record your own review.",
    local: "Local by default",
    source: "Source & methods ↗",
    boundary:
      "A matching title is a starting point. Metadata checks do not establish that a source supports a claim, that law is current, or that a citation complies with a style manual.",
    total: "References",
    warnings: "Need inspection",
    found: "Metadata retrieved",
    reviewed: "Human-reviewed",
    inputTitle: "Your bibliography",
    inputLabel: "One reference per line",
    inputHelp:
      "Up to 400 lines. Quoted titles are easiest to parse. You can correct fields after the local audit.",
    audit: "Run local audit",
    examples: "Try examples",
    localHelp:
      "Local checks never contact a server. References and review notes are saved in this browser.",
    crossrefTitle: "Optional · Crossref lookup",
    consent:
      "Allow DOI identifiers to be sent to api.crossref.org for this session.",
    consentHelp:
      "Only the DOI is sent, not your reference text or notes. Crossref sees ordinary connection information. Synthetic demo identifiers are excluded.",
    lookupAll: "Look up next 10 DOIs",
    workspaceTitle: "Keep your research record",
    import: "Import JSON",
    clear: "Clear workspace",
    exportHelp:
      "JSON keeps fields and notes. Imports are validated before replacing your workspace. Export before clearing browser storage.",
    resultsEyebrow: "Evidence before confidence",
    results: "Audit record",
    search: "Search references",
    searchPlaceholder: "Title, DOI, note…",
    statusFilter: "Metadata status",
    allStatuses: "All statuses",
    unknown: "Unknown",
    "metadata-match": "Metadata agrees",
    mismatch: "Possible mismatch",
    error: "Lookup error",
    severityFilter: "Local findings",
    allFindings: "All findings",
    warningOnly: "Warnings",
    informationOnly: "Information only",
    reviewFilter: "Human review",
    allReviews: "All reviews",
    unreviewed: "Not reviewed",
    confirmed: "Source inspected",
    "needs-followup": "Needs follow-up",
    rejected: "Do not use",
    emptyTitle: "Start with a bibliography",
    emptyHelp:
      "Paste references on the left, or try labeled examples. Every finding explains what was checked and what remains unknown.",
    noResults: "No references match these filters.",
    previous: "Previous",
    next: "Next",
    methods: "Methods & boundaries",
    line: "Line",
    synthetic: "Synthetic demo",
    findings: "Findings",
    editFields: "Correct parsed fields & record review",
    fieldTitle: "Title",
    fieldYear: "Year",
    fieldAuthor: "Author(s)",
    fieldHelp:
      "Editable parser candidates. Changes affect comparison immediately, but do not rewrite your original reference.",
    review: "Your source review",
    reviewHelp:
      "“Source inspected” records your own judgment, independently of metadata. Record what you checked in a note.",
    note: "Review note / evidence location",
    lookup: "Look up DOI",
    recheck: "Refresh metadata",
    doiHelp: "DOI syntax only",
    metadata: "Retrieved Crossref metadata",
    checked: "Retrieved",
    noTitle: "No title deposited",
    noAuthors: "No author names deposited",
    metadataHelp:
      "Deposited bibliography only. Open the original source and inspect the cited passage yourself.",
    lookupUnknown: "No Crossref metadata retrieved",
    imported: "Imported metadata snapshot — refresh to retrieve independently",
    demoOrigin: "Examples",
    exampleNotice:
      "Examples loaded: one real bibliography record, three clearly labeled synthetic cases. No network request has been made.",
    replaceExamples:
      "Replace the current workspace with labeled examples? Export your record first if you want to keep it.",
    cleared: "Workspace cleared.",
    clearConfirm:
      "Clear references, metadata and notes saved in this browser? Export first if you need a copy.",
    audited: "Local audit complete.",
    storageError:
      "Browser storage is unavailable or full. Export JSON to keep your work.",
    loadError:
      "Saved data could not be read. It was not overwritten. Import a valid JSON backup or explicitly clear the workspace.",
    invalidImport: "Import rejected; your current workspace is unchanged.",
    importedSuccess:
      "Workspace imported. Metadata snapshots need a fresh lookup for independent retrieval.",
    importConfirm:
      "Validated {count} references. Replace the current workspace with this file?",
    tooLarge: "Import file exceeds the 2 MB limit.",
    exported: "Research record exported.",
    progress: "Crossref lookup {current} / {total}",
    lookupDone: "Lookup finished. Metadata never verifies a cited claim.",
    lookupFailed: "Metadata lookup failed; the source status remains unknown.",
    noDOIs:
      "No eligible unqueried DOIs. Use an individual refresh to recheck a previous lookup.",
    page: "Page {current} / {total}",
    showing: "{shown} / {total} references",
    offline: "Network lookup requires an internet connection.",
    inputError: "Use at most 400 non-empty lines and 250,000 characters.",
    reimportedSnapshot: "Imported snapshot",
    unsaved: "References edited; run the local audit to update the record.",
  },
  zh: {
    skip: "跳转到工作区",
    eyebrow: "01 / 研究可信度",
    title: "引注核验",
    subtitle:
      "从书目到证据，留下清晰的核验路径。检查人工或 AI 生成的参考文献，比对 DOI 元数据，并记录自己的审阅判断。",
    local: "默认本地处理",
    source: "源代码与方法 ↗",
    boundary:
      "题名匹配只是起点。元数据检查不能证明来源支持某一观点、法律仍然有效，也不能证明引注符合任何正式引注手册。",
    total: "参考条目",
    warnings: "需要核对",
    found: "已取得元数据",
    reviewed: "已人工审阅",
    inputTitle: "你的参考文献",
    inputLabel: "每行一条文献",
    inputHelp:
      "最多 400 行。使用书名号或引号标记题名更容易识别。本地核验后可修正解析字段。",
    audit: "运行本地核验",
    examples: "试用示例",
    localHelp: "本地检查不连接服务器。条目与审阅笔记保存在当前浏览器中。",
    crossrefTitle: "可选 · Crossref 查询",
    consent: "允许本次会话将 DOI 标识符发送到 api.crossref.org。",
    consentHelp:
      "只发送 DOI，不发送完整引注和笔记。Crossref 可见普通连接信息。合成示例标识符不会外发。",
    lookupAll: "查询接下来的 10 个 DOI",
    workspaceTitle: "保存研究记录",
    import: "导入 JSON",
    clear: "清空工作区",
    exportHelp:
      "JSON 保留字段与笔记。导入文件会先验证，再替换工作区。清理浏览器数据前请先导出。",
    resultsEyebrow: "先证据，后判断",
    results: "核验记录",
    search: "检索当前条目",
    searchPlaceholder: "题名、DOI、笔记…",
    statusFilter: "元数据状态",
    allStatuses: "全部状态",
    unknown: "未知",
    "metadata-match": "元数据一致",
    mismatch: "可能不一致",
    error: "查询失败",
    severityFilter: "本地检查发现",
    allFindings: "全部发现",
    warningOnly: "存在警示",
    informationOnly: "仅提示信息",
    reviewFilter: "人工审阅",
    allReviews: "全部审阅状态",
    unreviewed: "尚未审阅",
    confirmed: "已检查来源",
    "needs-followup": "待进一步核对",
    rejected: "不采用",
    emptyTitle: "从一份参考文献开始",
    emptyHelp:
      "在左侧粘贴条目，或试用已标注的示例。每项发现都会说明检查了什么，以及哪些情况仍然未知。",
    noResults: "没有符合筛选条件的条目。",
    previous: "上一页",
    next: "下一页",
    methods: "方法与边界",
    line: "第",
    synthetic: "合成示例",
    findings: "检查发现",
    editFields: "修正解析字段并记录审阅",
    fieldTitle: "题名",
    fieldYear: "年份",
    fieldAuthor: "作者",
    fieldHelp:
      "这些是可编辑的解析候选字段。修改会立即更新比较结果，但不改写原始引注。",
    review: "你的来源审阅",
    reviewHelp:
      "“已检查来源”是你独立于元数据作出的判断。请在笔记中记录检查了什么。",
    note: "审阅笔记 / 证据位置",
    lookup: "查询 DOI",
    recheck: "刷新元数据",
    doiHelp: "仅识别 DOI 语法",
    metadata: "已取得的 Crossref 元数据",
    checked: "查询时间",
    noTitle: "未登记题名",
    noAuthors: "未登记作者姓名",
    metadataHelp: "这只是登记书目信息。请打开原始来源并亲自核对引用段落。",
    lookupUnknown: "尚未取得 Crossref 元数据",
    imported: "已导入元数据快照；请刷新后独立取得记录",
    demoOrigin: "示例",
    exampleNotice:
      "已载入示例：一条真实书目与三条明确标注的合成案例。尚未进行任何网络请求。",
    replaceExamples: "用已标注示例替换当前工作区？需要保留当前记录时请先导出。",
    cleared: "已清空工作区。",
    clearConfirm:
      "清空当前浏览器保存的条目、元数据和笔记？需要副本时请先导出。",
    audited: "本地核验完成。",
    storageError: "浏览器存储不可用或空间不足。请导出 JSON 保存工作。",
    loadError:
      "无法读取已保存数据，原数据未被覆盖。请导入有效备份，或明确清空工作区。",
    invalidImport: "导入被拒绝；当前工作区保持原状。",
    importedSuccess: "工作区已导入。元数据快照需重新查询后才能独立取得。",
    importConfirm: "已验证 {count} 条记录。用此文件替换当前工作区？",
    tooLarge: "导入文件超过 2 MB。",
    exported: "研究记录已导出。",
    progress: "Crossref 查询 {current} / {total}",
    lookupDone: "查询完成。元数据不会核实引文观点。",
    lookupFailed: "元数据查询失败；来源状态仍然未知。",
    noDOIs: "没有尚未查询且符合条件的 DOI。可在单个条目中刷新以重新查询。",
    page: "第 {current} / {total} 页",
    showing: "{shown} / {total} 条记录",
    offline: "网络查询需要互联网连接。",
    inputError: "请限制在 400 条非空行、250,000 个字符以内。",
    reimportedSnapshot: "导入快照",
    unsaved: "参考文献已编辑；请运行本地核验以更新记录。",
  },
};
const exampleText = [
  "Bender, Emily M.; Gebru, Timnit; McMillan-Major, Angelina; Shmitchell, Shmargaret (2021). “On the Dangers of Stochastic Parrots”. doi:10.1145/3442188.3445922",
  "[SYNTHETIC] Example Author (2025). “Fictional AI Welfare Review”. doi:10.99999/synthetic-ai-law-demo",
  "[SYNTHETIC] Example Author (2025). “Fictional AI Welfare Review”. doi:10.99999/synthetic-ai-law-demo",
  "[SYNTHETIC] Fictional research note without a quoted title or publication year. doi:missing",
].join("\n");

let lang = "en",
  rows = [],
  input = "",
  page = 1,
  busy = false,
  storageHealthy = true,
  demo = false;
const PAGE_SIZE = 20;
let noticeTimer;
try {
  lang = localStorage.getItem(LANGUAGE) === "zh" ? "zh" : "en";
} catch {
  /* Storage optional. */
}
const t = (key, values = {}) =>
  Object.entries(values).reduce(
    (str, [name, value]) => str.replaceAll(`{${name}}`, String(value)),
    dictionary[lang][key] ?? key,
  );

function notify(message) {
  $("notification").textContent = message;
  $("notification").hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    $("notification").hidden = true;
  }, 6500);
}
function el(tag, className = "", content = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content) node.textContent = content;
  return node;
}
function save() {
  if (!storageHealthy) return;
  try {
    localStorage.setItem(
      STORAGE,
      JSON.stringify({ ...workspace(input, rows), demo }),
    );
  } catch {
    storageHealthy = false;
    notify(t("storageError"));
  }
}
function applyLanguage() {
  clearTimeout(noticeTimer);
  $("notification").hidden = true;
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.title = `01 ${t("title")} · Law × AI`;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.placeholder);
  });
  $("language").textContent = lang === "en" ? "中文" : "English";
  $("language").setAttribute(
    "aria-label",
    lang === "en" ? "Switch to Chinese" : "切换到英语",
  );
  render();
}

function eligible(row) {
  return row.doi && !row.synthetic && row.dois.length === 1;
}
function updateStats() {
  $("count-total").textContent = rows.length;
  $("count-warning").textContent = rows.filter((row) =>
    allIssues(row, rows).some((item) => item.severity === "warning"),
  ).length;
  $("count-found").textContent = rows.filter(
    (row) => row.lookup?.state === "found" && row.lookup?.origin !== "imported",
  ).length;
  $("count-reviewed").textContent = rows.filter(
    (row) => row.review !== "unreviewed",
  ).length;
  $("origin-label").hidden = !demo;
  $("origin-label").textContent = t("demoOrigin");
  $("lookup-all").disabled =
    busy || !$("consent").checked || !rows.some(eligible);
  for (const id of ["audit", "examples", "import", "clear"])
    $(id).disabled = busy;
}

function renderCard(row) {
  const card = el("article", "card reference-card");
  card.dataset.id = row.id;
  const head = el("div", "reference-head");
  const line = el(
    "span",
    "line-number",
    `${t("line")} ${row.line}${lang === "zh" ? " 行" : ""}`,
  );
  const chips = el("div", "chip-list");
  const status = rowStatus(row);
  chips.append(
    el(
      "span",
      `badge ${["mismatch", "error"].includes(status) ? "warning" : ""}`,
      t(status),
    ),
  );
  if (row.synthetic) chips.append(el("span", "badge", t("synthetic")));
  if (row.review !== "unreviewed")
    chips.append(el("span", "badge", t(row.review)));
  head.append(line, chips);
  card.append(head, el("p", "reference-raw", row.raw));
  const doiLine = el("div", "doi-row");
  if (row.doi && !row.synthetic) {
    const link = el("a", "mono", row.doi);
    link.href = `https://doi.org/${encodeURIComponent(row.doi)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    doiLine.append(link);
  } else if (row.doi) doiLine.append(el("span", "mono synthetic-doi", row.doi));
  for (const url of row.urls.filter(
    (url) => !row.synthetic && !/https?:\/\/(?:dx\.)?doi\.org/iu.test(url),
  )) {
    const link = el("a", "source-link", new URL(url).hostname);
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    doiLine.append(link);
  }
  if (eligible(row)) {
    const lookup = el(
      "button",
      "small-button lookup-one",
      t(row.lookup ? "recheck" : "lookup"),
    );
    lookup.disabled = busy || !$("consent").checked;
    lookup.addEventListener("click", () => runLookup([row]));
    doiLine.append(lookup);
  }
  if (doiLine.childNodes.length) card.append(doiLine);
  const findings = el("ul", "findings");
  for (const finding of allIssues(row, rows)) {
    const li = el("li", `finding ${finding.severity}`);
    li.append(
      el("span", "finding-mark", finding.severity === "warning" ? "!" : "·"),
      el("span", "", finding[lang]),
    );
    findings.append(li);
  }
  card.append(findings);
  if (row.lookup?.state === "found") {
    const meta = el("div", "metadata-box");
    meta.append(
      el(
        "div",
        "eyebrow",
        t(row.lookup.origin === "imported" ? "imported" : "metadata"),
      ),
    );
    meta.append(
      el(
        "strong",
        "metadata-title",
        row.lookup.metadata.titles.join(" · ") || t("noTitle"),
      ),
    );
    meta.append(
      el(
        "p",
        "note metadata-authors",
        `${row.lookup.metadata.authors.map((a) => `${a.given} ${a.family}`.trim()).join("; ") || t("noAuthors")} · ${row.lookup.metadata.years.join(" / ") || "—"}`,
      ),
    );
    meta.append(
      el(
        "small",
        "",
        `${t("checked")}: ${new Date(row.lookup.checkedAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-GB")}`,
      ),
    );
    meta.append(el("p", "note metadata-boundary", t("metadataHelp")));
    card.append(meta);
  }
  const details = el("details", "review-details");
  details.append(el("summary", "", t("editFields")));
  const fields = el("div", "review-fields");
  fields.append(el("p", "note", t("fieldHelp")));
  const title = createField(row, "title", t("fieldTitle"));
  const author = createField(row, "author", t("fieldAuthor"));
  const year = createField(row, "year", t("fieldYear"));
  const two = el("div", "field-row");
  two.append(author, year);
  fields.append(title, two);
  const reviewWrap = el("div", "field");
  const reviewLabel = el("label", "", t("review"));
  reviewLabel.htmlFor = `${row.id}-review`;
  const review = el("select");
  review.id = reviewLabel.htmlFor;
  for (const state of REVIEW_STATES) {
    const option = el("option", "", t(state));
    option.value = state;
    review.append(option);
  }
  review.value = row.review;
  review.addEventListener("change", () => {
    row.review = review.value;
    save();
    const replacement = renderCard(row);
    replacement.querySelector("details").open = true;
    review.closest(".reference-card").replaceWith(replacement);
    replacement.querySelector(`#${CSS.escape(`${row.id}-review`)}`).focus();
    updateStats();
  });
  reviewWrap.append(reviewLabel, review, el("p", "note", t("reviewHelp")));
  const noteWrap = el("div", "field");
  const noteLabel = el("label", "", t("note"));
  noteLabel.htmlFor = `${row.id}-note`;
  const note = el("textarea");
  note.id = noteLabel.htmlFor;
  note.rows = 3;
  note.maxLength = 5000;
  note.value = row.note;
  note.addEventListener("input", () => {
    row.note = note.value;
    save();
  });
  noteWrap.append(noteLabel, note);
  fields.append(reviewWrap, noteWrap);
  details.append(fields);
  card.append(details);
  return card;
}

function createField(row, key, labelText) {
  const wrap = el("div", "field");
  const label = el("label", "", labelText);
  label.htmlFor = `${row.id}-${key}`;
  const field = el("input");
  field.id = label.htmlFor;
  field.value = row.fields[key];
  field.maxLength = key === "year" ? 4 : 2000;
  if (key === "year") {
    field.inputMode = "numeric";
    field.pattern = "[0-9]{4}";
  }
  field.addEventListener("change", () => {
    if (key === "year" && field.value && !/^\d{4}$/u.test(field.value)) {
      field.value = row.fields.year;
      notify(t("inputError"));
      return;
    }
    row.fields[key] = field.value;
    save();
    const replacement = renderCard(row);
    replacement.querySelector("details").open = true;
    const original = field.closest(".reference-card");
    original.replaceWith(replacement);
    replacement.querySelector(`#${CSS.escape(`${row.id}-${key}`)}`).focus();
    updateStats();
  });
  wrap.append(label, field);
  return wrap;
}

function render() {
  updateStats();
  const needle = $("search").value.toLocaleLowerCase();
  const status = $("status-filter").value,
    severity = $("severity-filter").value,
    review = $("review-filter").value;
  const filtered = rows.filter((row) => {
    const hasWarning = allIssues(row, rows).some(
      (item) => item.severity === "warning",
    );
    return (
      (!needle ||
        `${row.raw} ${row.fields.title} ${row.doi} ${row.note}`
          .toLocaleLowerCase()
          .includes(needle)) &&
      (status === "all" || rowStatus(row) === status) &&
      (severity === "all" ||
        (severity === "warning" ? hasWarning : !hasWarning)) &&
      (review === "all" || row.review === review)
    );
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  page = Math.min(page, pages);
  $("results").replaceChildren(
    ...filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(renderCard),
  );
  $("empty").hidden = rows.length > 0;
  $("no-results").hidden = !rows.length || filtered.length > 0;
  $("visible-count").textContent = rows.length
    ? t("showing", { shown: filtered.length, total: rows.length })
    : "";
  $("pagination").hidden = pages <= 1;
  $("previous").disabled = page === 1;
  $("next").disabled = page === pages;
  $("page-label").textContent = t("page", { current: page, total: pages });
}

async function lookupRow(row) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(
      `https://api.crossref.org/works/${encodeURIComponent(row.doi)}`,
      {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        referrerPolicy: "no-referrer",
        credentials: "omit",
      },
    );
    const checkedAt = new Date().toISOString();
    if (response.status === 404)
      row.lookup = { state: "not-found", checkedAt, origin: "crossref" };
    else {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      const metadata = metadataFromCrossref(result.message);
      row.lookup = { state: "found", checkedAt, origin: "crossref", metadata };
      compareMetadata(row.fields, metadata, row.doi);
    }
  } catch {
    row.lookup = {
      state: "error",
      checkedAt: new Date().toISOString(),
      origin: "crossref",
    };
  } finally {
    clearTimeout(timeout);
    save();
  }
}

async function runLookup(candidates) {
  if (busy || !$("consent").checked) return;
  if (!navigator.onLine) {
    notify(t("offline"));
    return;
  }
  const queue = candidates.filter(eligible).slice(0, 10);
  if (!queue.length) {
    notify(t("noDOIs"));
    return;
  }
  busy = true;
  render();
  for (let i = 0; i < queue.length; i++) {
    if (!$("consent").checked) break;
    $("network-progress").textContent = t("progress", {
      current: i + 1,
      total: queue.length,
    });
    await lookupRow(queue[i]);
    render();
    if (i < queue.length - 1)
      await new Promise((resolve) => setTimeout(resolve, 700));
  }
  busy = false;
  $("network-progress").textContent = t("lookupDone");
  render();
}

function runAudit() {
  try {
    input = $("references").value;
    const parsed = auditText(input);
    const prior = new Map(rows.map((row) => [`${row.line}:${row.raw}`, row]));
    rows = parsed.map((row) => prior.get(`${row.line}:${row.raw}`) ?? row);
    demo = input === exampleText;
    page = 1;
    save();
    render();
    notify(t("audited"));
  } catch {
    notify(t("inputError"));
  }
}

function download(content, filename, mime) {
  const link = el("a");
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify(t("exported"));
}

$("language").addEventListener("click", () => {
  lang = lang === "en" ? "zh" : "en";
  try {
    localStorage.setItem(LANGUAGE, lang);
  } catch {
    /* Optional. */
  }
  applyLanguage();
});
$("audit").addEventListener("click", runAudit);
$("references").addEventListener("input", () => {
  input = $("references").value;
  save();
  $("network-progress").textContent = t("unsaved");
});
$("examples").addEventListener("click", () => {
  if (
    (rows.length || $("references").value.trim()) &&
    !confirm(t("replaceExamples"))
  )
    return;
  $("references").value = exampleText;
  input = exampleText;
  rows = auditText(input);
  demo = true;
  page = 1;
  save();
  render();
  notify(t("exampleNotice"));
});
$("consent").addEventListener("change", render);
$("lookup-all").addEventListener("click", () =>
  runLookup(
    rows.filter((row) => !row.lookup || row.lookup.origin === "imported"),
  ),
);
for (const id of [
  "search",
  "status-filter",
  "severity-filter",
  "review-filter",
])
  $(id).addEventListener("input", () => {
    page = 1;
    render();
  });
$("previous").addEventListener("click", () => {
  page--;
  render();
  $("results-title").scrollIntoView({ block: "start" });
});
$("next").addEventListener("click", () => {
  page++;
  render();
  $("results-title").scrollIntoView({ block: "start" });
});
$("export-json").addEventListener("click", () =>
  download(
    JSON.stringify(workspace(input, rows), null, 2),
    "citation-audit.json",
    "application/json",
  ),
);
$("export-csv").addEventListener("click", () =>
  download(
    `\uFEFF${exportCSV(rows)}`,
    "citation-audit.csv",
    "text/csv;charset=utf-8",
  ),
);
$("export-md").addEventListener("click", () =>
  download(
    exportMarkdown(rows, lang),
    "citation-audit.md",
    "text/markdown;charset=utf-8",
  ),
);
$("import").addEventListener("click", () => $("import-file").click());
$("import-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 2 * 1024 * 1024) throw new Error(t("tooLarge"));
    const validated = validateWorkspace(JSON.parse(await file.text()));
    if (!confirm(t("importConfirm", { count: validated.rows.length }))) return;
    for (const row of validated.rows)
      if (row.lookup) row.lookup.origin = "imported";
    rows = validated.rows;
    input = validated.input;
    $("references").value = input;
    demo = false;
    storageHealthy = true;
    page = 1;
    save();
    render();
    notify(t("importedSuccess"));
  } catch (error) {
    notify(`${t("invalidImport")} ${error.message}`);
  } finally {
    event.target.value = "";
  }
});
$("clear").addEventListener("click", () => {
  if (!confirm(t("clearConfirm"))) return;
  rows = [];
  input = "";
  demo = false;
  $("references").value = "";
  page = 1;
  storageHealthy = true;
  $("search").value = "";
  for (const id of ["status-filter", "severity-filter", "review-filter"])
    $(id).value = "all";
  save();
  render();
  notify(t("cleared"));
});

try {
  const saved = localStorage.getItem(STORAGE);
  if (saved) {
    const parsed = JSON.parse(saved);
    const validated = validateWorkspace(parsed);
    rows = validated.rows;
    input = validated.input;
    demo = parsed.demo === true;
  }
} catch {
  storageHealthy = false;
  setTimeout(() => notify(t("loadError")), 0);
}
$("references").value = input;
applyLanguage();
