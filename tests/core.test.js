import test from "node:test";
import assert from "node:assert/strict";
import {
  auditText,
  parseReference,
  extractDOIs,
  extractURLs,
  safeURL,
  localIssues,
  metadataFromCrossref,
  compareMetadata,
  rowStatus,
  allIssues,
  csvCell,
  exportCSV,
  exportMarkdown,
  validateWorkspace,
  workspace,
} from "../core.js";

const metadata = metadataFromCrossref({
  DOI: "10.1145/3442188.3445922",
  title: ["On the Dangers of Stochastic Parrots"],
  author: [
    { given: "Emily M.", family: "Bender" },
    { given: "Timnit", family: "Gebru" },
  ],
  published: { "date-parts": [[2021, 3]] },
  "published-online": { "date-parts": [[2021, 3, 3]] },
});
const real =
  "Bender, Emily M.; Gebru, Timnit (2021). “On the Dangers of Stochastic Parrots”. doi:10.1145/3442188.3445922";
const rowWithMetadata = () => ({
  ...parseReference(real, 1),
  lookup: {
    state: "found",
    checkedAt: "2026-10-04T00:00:00.000Z",
    origin: "crossref",
    metadata,
  },
});

test("DOI parsing recognizes URLs and wrappers but preserves meaningful parentheses", () => {
  assert.deepEqual(extractDOIs("https://doi.org/10.1145/3442188.3445922."), [
    "10.1145/3442188.3445922",
  ]);
  assert.deepEqual(extractDOIs("(10.1234/test)."), ["10.1234/test"]);
  assert.deepEqual(extractDOIs("10.1234/test(a)"), ["10.1234/test(a)"]);
  assert.deepEqual(extractDOIs("10.1234/ABC 10.1234/abc"), ["10.1234/abc"]);
  assert.deepEqual(extractDOIs("doi:not-a-doi"), []);
});

test("blank lines preserve physical line numbers; title and author are explicit candidates", () => {
  const rows = auditText(`\n${real}\n\n王某（2024）《人工智能与社会保障》`);
  assert.deepEqual(
    rows.map((row) => row.line),
    [2, 4],
  );
  assert.equal(rows[0].fields.title, "On the Dangers of Stochastic Parrots");
  assert.equal(rows[0].fields.year, "2021");
  assert.equal(rows[0].fields.author, "Bender, Emily M.; Gebru, Timnit");
  assert.equal(rows[1].fields.title, "人工智能与社会保障");
  assert.equal(rows[1].fields.author, "王某");
});

test("valid DOI syntax alone never establishes a source or a metadata match", () => {
  const row = parseReference(real, 1);
  assert.equal(rowStatus(row), "unknown");
  assert.ok(
    localIssues(row)
      .find((item) => item.code === "doi-syntax")
      .en.includes("unknown"),
  );
});

test("multiple DOI candidates remain unresolved and do not select a source silently", () => {
  const row = parseReference("“A title” 2024 doi:10.1234/a doi:10.1234/b", 1);
  assert.equal(row.doi, "");
  assert.equal(row.dois.length, 2);
  assert.ok(localIssues(row).some((item) => item.code === "multiple-dois"));
});

test("no DOI is informational for legal material; missing title receives a warning", () => {
  const row = parseReference("A printed legal source", 1);
  const issues = localIssues(row);
  assert.equal(issues.find((item) => item.code === "no-doi").severity, "info");
  assert.equal(
    issues.find((item) => item.code === "title-unknown").severity,
    "warning",
  );
  assert.equal(rowStatus(row), "unknown");
});

test("duplicate checks identify repeated DOI without asserting the entries should be deleted", () => {
  const rows = auditText(`${real}\n${real}`);
  assert.ok(
    rows.every((row) =>
      localIssues(row, rows).some((item) => item.code === "duplicate"),
    ),
  );
});

test("metadata match requires title, year and author overlap; none proves cited claims", () => {
  const row = rowWithMetadata();
  assert.equal(rowStatus(row), "metadata-match");
  const comparison = compareMetadata(row.fields, metadata, row.doi);
  assert.equal(comparison.titleScore, 1);
  assert.ok(
    comparison.checks
      .find((item) => item.code === "author-overlap")
      .en.includes("does not verify"),
  );
  assert.equal(
    compareMetadata({ ...row.fields, title: "" }, metadata).status,
    "unknown",
  );
  assert.equal(
    compareMetadata({ ...row.fields, author: "" }, metadata).status,
    "unknown",
  );
  assert.equal(
    compareMetadata({ ...row.fields, year: "" }, metadata).status,
    "unknown",
  );
});

test("clearly different titles or years signal possible mismatch; returned DOI is checked", () => {
  const fields = rowWithMetadata().fields;
  assert.equal(
    compareMetadata(
      { ...fields, title: "Insurance litigation and social welfare financing" },
      metadata,
    ).status,
    "mismatch",
  );
  assert.equal(
    compareMetadata({ ...fields, year: "1999" }, metadata).status,
    "mismatch",
  );
  assert.equal(
    compareMetadata(fields, metadata, "10.1234/something-else").status,
    "mismatch",
  );
});

test("author surname substring does not count as agreement; ambiguous names remain unknown", () => {
  const result = compareMetadata(
    { ...rowWithMetadata().fields, author: "Benderson" },
    metadata,
  );
  assert.equal(result.status, "unknown");
  assert.ok(result.checks.some((item) => item.code === "author-ambiguous"));
});

test("online and print date candidates are accepted without silently preferring one edition", () => {
  const m = metadataFromCrossref({
    DOI: "10.1234/a",
    title: ["An example research title"],
    author: [{ family: "Chen" }],
    published: { "date-parts": [[2023]] },
    "published-print": { "date-parts": [[2024]] },
  });
  assert.deepEqual(m.years, ["2023", "2024"]);
  assert.equal(
    compareMetadata(
      { title: "An example research title", year: "2024", author: "Chen" },
      m,
    ).status,
    "metadata-match",
  );
});

test("network failure and Crossref absence never mean the source does not exist", () => {
  const row = parseReference(real, 1);
  row.lookup = {
    state: "error",
    checkedAt: "2026-10-04T00:00:00Z",
    origin: "crossref",
  };
  assert.equal(rowStatus(row), "error");
  assert.ok(allIssues(row, [row]).some((item) => item.code === "lookup-error"));
  row.lookup.state = "not-found";
  assert.equal(rowStatus(row), "unknown");
  assert.ok(
    allIssues(row, [row])
      .find((item) => item.code === "not-found")
      .en.includes("remains unknown"),
  );
});

test("imported metadata remains unknown until independently refreshed", () => {
  const row = rowWithMetadata();
  row.lookup.origin = "imported";
  assert.equal(rowStatus(row), "unknown");
  assert.ok(
    allIssues(row, [row]).some((item) => item.code === "imported-snapshot"),
  );
});

test("synthetic markers are preserved for network exclusion", () => {
  const row = parseReference(
    "[SYNTHETIC] Demo (2025). “Fictional title”. doi:10.99999/synthetic-ai-law-demo",
    1,
  );
  assert.equal(row.synthetic, true);
  assert.ok(
    localIssues(row)
      .find((item) => item.code === "synthetic")
      .en.includes("Never sent"),
  );
});

test("URLs reject executable schemes and credentials", () => {
  assert.equal(safeURL("javascript:alert(1)"), null);
  assert.equal(safeURL("data:text/html,test"), null);
  assert.equal(safeURL("https://user:secret@example.com"), null);
  assert.deepEqual(
    extractURLs("https://example.com/paper. javascript:alert(1)"),
    ["https://example.com/paper"],
  );
});

test("CSV formula injection is neutralized even after leading whitespace", () => {
  for (const value of [
    '=HYPERLINK("https://example.com")',
    "+1",
    "-1",
    "@SUM(1)",
    "\t=1+1",
    "\r=1",
    "  @A1",
  ]) {
    assert.ok(csvCell(value).startsWith("\"'"));
  }
  assert.equal(csvCell('ordinary, "text"'), '"ordinary, ""text"""');
  const row = parseReference('=HYPERLINK("x")', 1);
  row.note = "@SUM(1)";
  const csv = exportCSV([row]);
  assert.ok(csv.includes('"\'@SUM(1)"'));
  assert.ok(csv.includes("findings"));
});

test("Markdown keeps line-specific findings and escapes injected markup and table separators", () => {
  const row = parseReference("<script>alert(1)</script> | [link](bad)", 5);
  row.note = "note | extra\nline";
  const md = exportMarkdown([row]);
  assert.ok(md.includes("| 5 |"));
  assert.ok(md.includes("\\<script"));
  assert.ok(md.includes("note \\| extra<br>line"));
  assert.ok(md.includes("Title was not reliably parsed"));
});

test("JSON validation reconstructs derived fields and never mutates the active record", () => {
  const original = rowWithMetadata();
  original.review = "needs-followup";
  original.note = "Page 3, passage not yet read.";
  const payload = workspace(real, [original]);
  payload.rows[0].doi = "javascript:wrong";
  payload.rows[0].synthetic = true;
  const restored = validateWorkspace(payload);
  assert.equal(restored.rows[0].doi, "10.1145/3442188.3445922");
  assert.equal(restored.rows[0].synthetic, false);
  assert.equal(restored.rows[0].review, "needs-followup");
  assert.equal(restored.rows[0].lookup.origin, "crossref");
  assert.notEqual(restored.rows[0], original);
});

test("invalid schema, duplicate IDs, invalid years and excessive input are rejected", () => {
  assert.throws(() => validateWorkspace({ version: 2, rows: [] }));
  const payload = workspace(real, [rowWithMetadata()]);
  payload.rows[0].fields.year = "x";
  assert.throws(() => validateWorkspace(payload));
  payload.rows[0].fields.year = "2021";
  payload.rows.push({ ...payload.rows[0], line: 2 });
  assert.throws(() => validateWorkspace(payload));
  assert.throws(() => auditText("a\n".repeat(401)));
  assert.throws(() => auditText("a".repeat(250001)));
  assert.throws(() => auditText("a".repeat(10001)));
});

test("a malicious metadata shape is rejected before import replaces anything", () => {
  const payload = workspace(real, [rowWithMetadata()]);
  payload.rows[0].lookup.metadata.authors = [{ family: 123, given: "A" }];
  assert.throws(() => validateWorkspace(payload));
  assert.throws(() => metadataFromCrossref({ title: ["missing DOI"] }));
});
