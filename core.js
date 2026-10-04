/** Deterministic bibliography diagnostics. No model, network or DOM dependencies. */
export const VERSION = 1;
export const MAX_ROWS = 400;
export const MAX_INPUT = 250000;
export const REVIEW_STATES = [
  "unreviewed",
  "confirmed",
  "needs-followup",
  "rejected",
];
const issue = (code, severity, en, zh) => ({ code, severity, en, zh });

export function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, " ")
    .trim();
}

export function extractDOIs(text) {
  const found = String(text).match(/10\.\d{4,9}\/[^\s<>"“”‘’，。；]+/giu) ?? [];
  return [
    ...new Set(
      found.map((value) => {
        let doi = value.replace(/[.,;:]+$/u, "");
        // Remove only unmatched closing wrappers; parentheses may be part of a DOI.
        for (const [open, close] of [
          ["(", ")"],
          ["[", "]"],
          ["{", "}"],
        ]) {
          while (
            doi.endsWith(close) &&
            doi.split(close).length > doi.split(open).length
          )
            doi = doi.slice(0, -1);
        }
        return doi.toLowerCase();
      }),
    ),
  ];
}

export function safeURL(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function extractURLs(text) {
  return [
    ...new Set(
      (String(text).match(/https?:\/\/[^\s<>"“”]+/giu) ?? [])
        .map((value) => value.replace(/[.,;，。；]+$/u, "").replace(/\)$/, ""))
        .map(safeURL)
        .filter(Boolean),
    ),
  ];
}

export function parseReference(raw, line, id = `ref-${line}`) {
  const dois = extractDOIs(raw);
  const quoted = raw.match(
    /[《“"]([^》”"]{3,})[》”"]|\btitle\s*:\s*([^|;]+)/iu,
  );
  const title = quoted ? (quoted[1] ?? quoted[2]).trim() : "";
  const withoutLinks = raw.replace(/https?:\/\/\S+|10\.\d{4,9}\/\S+/giu, "");
  const years = [
    ...new Set(withoutLinks.match(/\b(?:18|19|20)\d{2}\b/gu) ?? []),
  ];
  const author =
    raw
      .normalize("NFKC")
      .match(
        /^(?:\[\d+\]\s*|\d+[.)]\s*)?(.*?)(?:\s*\((?:18|19|20)\d{2}\)|[《“"])/u,
      )?.[1]
      ?.trim()
      .replace(/[.,;:]+$/u, "") ?? "";
  return {
    id,
    line,
    raw,
    doi: dois.length === 1 ? dois[0] : "",
    dois,
    urls: extractURLs(raw),
    fields: { title, year: years.length === 1 ? years[0] : "", author },
    synthetic: /\[SYNTHETIC\]|\[合成示例\]|synthetic-ai-law-demo/iu.test(raw),
    review: "unreviewed",
    note: "",
    lookup: null,
  };
}

export function auditText(input) {
  if (typeof input !== "string" || input.length > MAX_INPUT)
    throw new Error(`Input must be text under ${MAX_INPUT} characters.`);
  const rows = input
    .split(/\r?\n/u)
    .map((raw, i) => ({ raw: raw.trim(), line: i + 1 }))
    .filter((row) => row.raw);
  if (rows.length > MAX_ROWS)
    throw new Error(`Use at most ${MAX_ROWS} non-empty lines.`);
  if (rows.some((row) => row.raw.length > 10000))
    throw new Error("Each reference must be under 10,000 characters.");
  return rows.map((row) => parseReference(row.raw, row.line));
}

export function localIssues(row, rows = [row]) {
  const items = [];
  if (row.synthetic)
    items.push(
      issue(
        "synthetic",
        "info",
        "Labeled synthetic example. Never sent to Crossref.",
        "明确标注的合成示例，不会发送到 Crossref。",
      ),
    );
  if (row.dois.length > 1)
    items.push(
      issue(
        "multiple-dois",
        "warning",
        "Several DOI candidates occur on this line; split or inspect the reference.",
        "本行出现多个 DOI 候选，请拆分或人工复核。",
      ),
    );
  if (!row.doi && row.dois.length === 0)
    items.push(
      issue(
        "no-doi",
        "info",
        "No DOI parsed. Many legal sources have no DOI; this is not an error.",
        "未识别 DOI。许多法律资料没有 DOI，这并不代表错误。",
      ),
    );
  if (row.doi)
    items.push(
      issue(
        "doi-syntax",
        "info",
        "DOI syntax recognized; registration and source existence are unknown until lookup.",
        "仅识别了 DOI 语法；查询前不判断登记状态或来源存在。",
      ),
    );
  if (!row.fields.title)
    items.push(
      issue(
        "title-unknown",
        "warning",
        "Title was not reliably parsed. Add a title before metadata comparison.",
        "未可靠识别题名；请补充题名后再比较元数据。",
      ),
    );
  if (!row.fields.year)
    items.push(
      issue(
        "year-unknown",
        "info",
        "A unique publication year was not parsed; add it if known.",
        "未识别唯一出版年份；知道时可手动补充。",
      ),
    );
  if (!row.fields.author)
    items.push(
      issue(
        "author-unknown",
        "info",
        "Author was not reliably parsed; add it if known.",
        "未可靠识别作者；知道时可手动补充。",
      ),
    );
  if (/\bdoi\s*:/iu.test(row.raw) && !row.dois.length)
    items.push(
      issue(
        "doi-invalid",
        "warning",
        "A DOI label exists, but no supported DOI syntax was found.",
        "存在 DOI 标记，但未识别受支持的 DOI 语法。",
      ),
    );
  if (
    rows.some(
      (other) =>
        other.id !== row.id &&
        (row.doi
          ? other.doi === row.doi
          : normalize(other.raw) === normalize(row.raw)),
    )
  ) {
    items.push(
      issue(
        "duplicate",
        "warning",
        "Duplicate DOI or identical reference occurs elsewhere; inspect before deleting.",
        "其他行出现相同 DOI 或相同条目；删除前请人工核对。",
      ),
    );
  }
  if (!row.doi && !row.urls.length)
    items.push(
      issue(
        "no-link",
        "info",
        "No source link parsed. A library record or printed source may still exist.",
        "未识别来源链接；图书馆记录或纸本来源仍可能存在。",
      ),
    );
  return items;
}

function similarity(a, b) {
  const x = normalize(a),
    y = normalize(b);
  if (!x || !y) return null;
  if (x === y) return 1;
  // Permit an appended subtitle, but only if the shorter title is substantial.
  if (
    (x.startsWith(`${y} `) || y.startsWith(`${x} `)) &&
    Math.min(x.length, y.length) >= 20
  )
    return 0.96;
  const grams = (value) => {
    const chars = [...value];
    return new Set(chars.slice(0, -1).map((c, i) => c + chars[i + 1]));
  };
  const p = grams(x),
    q = grams(y);
  const common = [...p].filter((v) => q.has(v)).length;
  return (2 * common) / (p.size + q.size || 1);
}

export function metadataFromCrossref(message) {
  if (
    !message ||
    typeof message !== "object" ||
    typeof message.DOI !== "string"
  )
    throw new Error("Invalid Crossref metadata response.");
  const years = ["published", "published-print", "published-online", "issued"]
    .flatMap(
      (key) => message[key]?.["date-parts"]?.map((parts) => parts[0]) ?? [],
    )
    .filter((year) => Number.isInteger(year) && year >= 1000 && year <= 3000)
    .map(String);
  return {
    doi: message.DOI.toLowerCase(),
    titles: Array.isArray(message.title)
      ? message.title
          .filter((v) => typeof v === "string")
          .slice(0, 10)
          .map((v) => v.slice(0, 2000))
      : [],
    years: [...new Set(years)],
    authors: Array.isArray(message.author)
      ? message.author.slice(0, 100).map((a) => ({
          family: typeof a.family === "string" ? a.family.slice(0, 200) : "",
          given: typeof a.given === "string" ? a.given.slice(0, 200) : "",
        }))
      : [],
  };
}

export function compareMetadata(fields, metadata, expectedDOI = "") {
  const checks = [];
  if (expectedDOI && expectedDOI.toLowerCase() !== metadata.doi.toLowerCase()) {
    checks.push(
      issue(
        "doi-mismatch",
        "warning",
        "The returned DOI differs from the requested DOI.",
        "返回的 DOI 与请求的 DOI 不同。",
      ),
    );
    return { status: "mismatch", checks, titleScore: null };
  }
  const scores = metadata.titles
    .map((title) => similarity(fields.title, title))
    .filter((v) => v !== null);
  const titleScore = scores.length ? Math.max(...scores) : null;
  let unknown = false,
    mismatch = false;
  if (titleScore === null) {
    unknown = true;
    checks.push(
      issue(
        "title-uncompared",
        "info",
        "Title comparison unavailable: citation or metadata has no title.",
        "无法比较题名：条目或元数据缺少题名。",
      ),
    );
  } else if (titleScore >= 0.9) {
    checks.push(
      issue(
        "title-agreement",
        "info",
        "Title agrees under the documented normalization heuristic.",
        "题名符合已说明的文本标准化比较规则。",
      ),
    );
  } else if (titleScore < 0.45) {
    mismatch = true;
    checks.push(
      issue(
        "title-mismatch",
        "warning",
        "Title is substantially different. Inspect the DOI and the original source.",
        "题名差异明显；请核对 DOI 与原始来源。",
      ),
    );
  } else {
    unknown = true;
    checks.push(
      issue(
        "title-ambiguous",
        "warning",
        "Title similarity is inconclusive; abbreviated or translated titles need manual review.",
        "题名相似性不足以判断；缩写或译名需要人工核对。",
      ),
    );
  }
  if (!fields.year || !metadata.years.length) {
    unknown = true;
    checks.push(
      issue(
        "year-uncompared",
        "info",
        "Publication year comparison unavailable.",
        "缺少条目年份或元数据年份，无法比较。",
      ),
    );
  } else if (!metadata.years.includes(fields.year)) {
    mismatch = true;
    checks.push(
      issue(
        "year-mismatch",
        "warning",
        `Year ${fields.year} differs from metadata years ${metadata.years.join(", ")}; editions and online dates may explain this.`,
        `条目年份 ${fields.year} 与元数据年份 ${metadata.years.join("、")} 不同；版本或在线出版日期可能解释差异。`,
      ),
    );
  } else
    checks.push(
      issue(
        "year-agreement",
        "info",
        "Year occurs among the publication dates deposited in Crossref.",
        "条目年份出现在 Crossref 登记的出版日期中。",
      ),
    );
  const authorText = normalize(fields.author);
  const familyNames = metadata.authors
    .map((a) => normalize(a.family))
    .filter(Boolean);
  const authorTokens = new Set(authorText.split(" "));
  const hasFamily = familyNames.some((name) =>
    /[\p{Script=Han}]/u.test(name)
      ? authorText.includes(name)
      : name.split(" ").every((token) => authorTokens.has(token)),
  );
  if (!authorText || !familyNames.length) {
    unknown = true;
    checks.push(
      issue(
        "author-uncompared",
        "info",
        "Author comparison unavailable.",
        "缺少条目作者或元数据作者，无法比较。",
      ),
    );
  } else if (hasFamily) {
    checks.push(
      issue(
        "author-overlap",
        "info",
        "At least one author family name overlaps. This does not verify the complete author list.",
        "至少一个作者姓氏重合，不代表完整作者名单已经核实。",
      ),
    );
  } else {
    unknown = true;
    checks.push(
      issue(
        "author-ambiguous",
        "warning",
        "No author family-name overlap found. Name transliteration and truncation require manual review.",
        "未找到作者姓氏重合；姓名转写和作者省略需人工核对。",
      ),
    );
  }
  return {
    status: mismatch ? "mismatch" : unknown ? "unknown" : "metadata-match",
    checks,
    titleScore,
  };
}

export function rowStatus(row) {
  if (!row.lookup) return "unknown";
  if (row.lookup.origin === "imported") return "unknown";
  if (row.lookup.state === "error") return "error";
  if (row.lookup.state !== "found") return "unknown";
  return compareMetadata(row.fields, row.lookup.metadata, row.doi).status;
}

export function allIssues(row, rows) {
  const base = localIssues(row, rows);
  if (row.lookup?.origin === "imported")
    base.push(
      issue(
        "imported-snapshot",
        "warning",
        "Imported metadata is an unverified snapshot. Refresh the DOI to retrieve a record independently.",
        "导入的元数据是未经独立核实的快照；请刷新 DOI 查询以独立取得记录。",
      ),
    );
  if (row.lookup?.state === "found")
    return [
      ...base,
      ...compareMetadata(row.fields, row.lookup.metadata, row.doi).checks,
    ];
  if (row.lookup?.state === "not-found")
    return [
      ...base,
      issue(
        "not-found",
        "warning",
        "No Crossref record returned. Other DOI agencies and incomplete deposits exist; source existence remains unknown.",
        "未返回 Crossref 记录。其他 DOI 登记机构和不完整登记均可能存在；来源是否存在仍未知。",
      ),
    ];
  if (row.lookup?.state === "error")
    return [
      ...base,
      issue(
        "lookup-error",
        "warning",
        "Lookup failed. A network/API failure says nothing about source existence.",
        "查询失败。网络或接口错误不代表来源不存在。",
      ),
    ];
  return base;
}

export function csvCell(value) {
  const text = String(value ?? "");
  const safe = /^[\s\uFEFF]*[=+@-]/u.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/gu, '""')}"`;
}

export function exportCSV(rows) {
  const columns = [
    "line",
    "reference",
    "doi",
    "title",
    "year",
    "author",
    "metadata_status",
    "manual_review",
    "note",
    "lookup_at",
    "lookup_origin",
    "findings",
  ];
  return [
    columns,
    ...rows.map((row) => [
      row.line,
      row.raw,
      row.doi,
      row.fields.title,
      row.fields.year,
      row.fields.author,
      rowStatus(row),
      row.review,
      row.note,
      row.lookup?.checkedAt ?? "",
      row.lookup?.origin ?? "",
      allIssues(row, rows)
        .map((item) => `${item.code}: ${item.en}`)
        .join(" | "),
    ]),
  ]
    .map((values) => values.map(csvCell).join(","))
    .join("\r\n");
}

export function exportMarkdown(rows, language = "en") {
  const escape = (text) =>
    String(text)
      .replace(/\\/gu, "\\\\")
      .replace(/[|<>\[\]`*]/gu, (char) => `\\${char}`)
      .replace(/\r?\n/gu, "<br>");
  const heading =
    language === "zh"
      ? "# 引注核验记录\n\n元数据匹配不代表引文观点、法律效力或引注规范已经核实。"
      : "# Citation audit record\n\nMetadata agreement does not verify cited claims, legal authority, or citation-style compliance.";
  return `${heading}\n\n| Line | Reference | Metadata | Human review | Findings | Note |\n| --- | --- | --- | --- | --- | --- |\n${rows
    .map(
      (row) =>
        `| ${row.line} | ${escape(row.raw)} | ${rowStatus(row)} | ${row.review} | ${escape(
          allIssues(row, rows)
            .map((item) => item[language])
            .join("; "),
        )} | ${escape(row.note)} |`,
    )
    .join("\n")}\n`;
}

const isPlain = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
function requireText(value, limit, label) {
  if (typeof value !== "string" || value.length > limit)
    throw new Error(`Invalid ${label}.`);
  return value;
}

export function validateWorkspace(payload) {
  if (
    !isPlain(payload) ||
    payload.version !== VERSION ||
    payload.app !== "citation-audit" ||
    !Array.isArray(payload.rows) ||
    payload.rows.length > MAX_ROWS
  )
    throw new Error("Unsupported or invalid workspace.");
  const input = requireText(payload.input ?? "", MAX_INPUT, "input");
  const seenIDs = new Set();
  const seenLines = new Set();
  const rows = payload.rows.map((source) => {
    if (
      !isPlain(source) ||
      !Number.isInteger(source.line) ||
      source.line < 1 ||
      source.line > MAX_INPUT ||
      seenLines.has(source.line)
    )
      throw new Error("Invalid reference line.");
    seenLines.add(source.line);
    const id = requireText(source.id, 100, "id");
    if (!id || seenIDs.has(id))
      throw new Error("Duplicate or empty reference id.");
    seenIDs.add(id);
    const raw = requireText(source.raw, 10000, "reference");
    const row = parseReference(raw, source.line, id);
    if (!isPlain(source.fields)) throw new Error("Invalid citation fields.");
    row.fields = {
      title: requireText(source.fields.title, 2000, "title"),
      year: requireText(source.fields.year, 4, "year"),
      author: requireText(source.fields.author, 2000, "author"),
    };
    if (row.fields.year && !/^\d{4}$/u.test(row.fields.year))
      throw new Error("Invalid year.");
    if (!REVIEW_STATES.includes(source.review))
      throw new Error("Invalid review state.");
    row.review = source.review;
    row.note = requireText(source.note, 5000, "note");
    if (source.lookup !== null && source.lookup !== undefined) {
      const lookup = source.lookup;
      if (
        !isPlain(lookup) ||
        !["found", "not-found", "error"].includes(lookup.state) ||
        typeof lookup.checkedAt !== "string" ||
        !Number.isFinite(Date.parse(lookup.checkedAt))
      )
        throw new Error("Invalid lookup record.");
      row.lookup = {
        state: lookup.state,
        checkedAt: lookup.checkedAt,
        origin: lookup.origin === "crossref" ? "crossref" : "imported",
      };
      if (lookup.state === "found") {
        const m = lookup.metadata;
        if (
          !isPlain(m) ||
          !Array.isArray(m.titles) ||
          m.titles.length > 10 ||
          !Array.isArray(m.years) ||
          m.years.length > 10 ||
          !Array.isArray(m.authors) ||
          m.authors.length > 100
        )
          throw new Error("Invalid metadata.");
        row.lookup.metadata = {
          doi: requireText(m.doi, 500, "metadata DOI"),
          titles: m.titles.map((v) => requireText(v, 2000, "metadata title")),
          years: m.years.map((v) => {
            requireText(v, 4, "metadata year");
            if (!/^\d{4}$/u.test(v)) throw new Error("Invalid metadata year.");
            return v;
          }),
          authors: m.authors.map((a) => {
            if (!isPlain(a)) throw new Error("Invalid author.");
            return {
              family: requireText(a.family, 200, "family name"),
              given: requireText(a.given, 200, "given name"),
            };
          }),
        };
      }
    }
    return row;
  });
  return { version: VERSION, app: "citation-audit", input, rows };
}

export function workspace(input, rows) {
  return { version: VERSION, app: "citation-audit", input, rows };
}
