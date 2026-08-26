import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const statePath = join(tmpdir(), "folveta-product-3c-e2e.json");
const command = process.argv[2];
const appUrl = process.env.PRODUCT_3C_E2E_APP_URL ?? "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !serviceKey || !anonKey) throw new Error("Supabase dev environment variables are required.");
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

function assert(condition, message) {
  if (!condition) throw new Error(`Product-3C E2E assertion failed: ${message}`);
}

async function checked(label, promise) {
  const result = await promise;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

function guideJson(fixture) {
  const source = fixture.sources[0];
  const reference = {
    span_id: source.spanId,
    source_id: source.id,
    source_name: source.filename,
    locator: { kind: source.kind === "pptx" ? "slide" : "page", number: 1 },
    excerpt: source.spanText,
  };
  return {
    schema_version: "1.0",
    id: fixture.guideId,
    session_id: fixture.sessionId,
    title: fixture.title,
    based_on_uploaded_materials: true,
    source_count: fixture.sources.length,
    priority_method_summary: "Deterministic Product-3C fixture for private search and lifecycle validation.",
    generation_status: "ready",
    source_issues: [],
    topics: [{
      id: fixture.topicId,
      title: fixture.topicTitle,
      priority: "study_first",
      focus_reason: fixture.focusReason,
      explanation: [{
        id: `${fixture.topicId}-claim`,
        text: fixture.contentText,
        support_status: "direct",
        source_references: [reference],
      }],
      key_concepts: [],
      definitions: [],
      processes_relationships: [],
      common_confusions: [],
      gaps: [],
      source_references: [reference],
    }],
    overall_gaps: [],
    generated_at: fixture.createdAt,
  };
}

function quickCheckJson(fixture, quickCheckId) {
  const source = fixture.sources[0];
  const reference = {
    span_id: source.spanId,
    source_id: source.id,
    source_name: source.filename,
    locator: { kind: source.kind === "pptx" ? "slide" : "page", number: 1 },
    excerpt: source.spanText,
  };
  return {
    schema_version: "1.0",
    id: quickCheckId,
    guide_id: fixture.guideId,
    guide_checksum: "a".repeat(64),
    requested_question_count: 5,
    question_count: 1,
    format: "mcq_only",
    disclaimer: "Deterministic Product-3C fixture, not an AI generation pass.",
    limited_sample: true,
    questions: [{
      id: "product-3c-question-1",
      topic_id: fixture.topicId,
      stem: "Which behavior does this fixture validate?",
      options: [
        { id: "A", text: "Private workspace continuity" },
        { id: "B", text: "Payment processing" },
        { id: "C", text: "Public indexing" },
        { id: "D", text: "External AI availability" },
      ],
      correct_option_id: "A",
      explanation: [{ id: "product-3c-answer", text: "It validates private workspace continuity.", support_status: "direct", source_references: [reference] }],
      source_refs: [reference],
      related_section: { section_type: "concise_explanation", section_item_id: fixture.topicId, anchor: `topic-${fixture.topicId}-explanation` },
      validation: { status: "validated", single_best_answer: true, question_grounded: true, answer_grounded: true, explanation_grounded: true },
    }],
    generated_at: fixture.createdAt,
  };
}

function sourceDefinition({ sessionId, filename, kind, spanText, createdAt, ordinal }) {
  const id = randomUUID();
  return {
    id,
    spanId: `product-3c-span-${id}`,
    sessionId,
    filename,
    kind,
    spanText,
    createdAt: new Date(new Date(createdAt).getTime() + ordinal * 1000).toISOString(),
  };
}

function fixtureDefinition({ owner, title, topicId, topicTitle, contentText, focusReason, createdAt, sourceInputs }) {
  const sessionId = randomUUID();
  return {
    owner,
    title,
    topicId,
    topicTitle,
    contentText,
    focusReason,
    createdAt,
    sessionId,
    guideId: randomUUID(),
    sources: sourceInputs.map((source, ordinal) => sourceDefinition({ sessionId, createdAt, ordinal, ...source })),
  };
}

async function setup() {
  if (existsSync(statePath)) throw new Error(`Fixture state already exists at ${statePath}. Run cleanup first.`);
  const stamp = Date.now();
  const password = `Folveta-3C-${stamp}!`;
  const users = [];
  for (const account of ["a", "b"]) {
    const email = `folveta-product-3c-${account}-${stamp}@example.com`;
    const data = await checked(`create user ${account}`, admin.auth.admin.createUser({ email, password, email_confirm: true }));
    users.push({ id: data.user.id, email });
  }

  const now = Date.now();
  const mainSources = [
    { filename: "Glial Atlas.pdf", kind: "pdf", spanText: "Quasar resonance coupling anchors this private source span." },
    { filename: "Circuit Lecture.pptx", kind: "pptx", spanText: "Neural circuit timing provides a second indexed source." },
    ...Array.from({ length: 11 }, (_, index) => ({
      filename: `Neural Supplement ${String(index + 3).padStart(2, "0")}.${index % 2 === 0 ? "pdf" : "pptx"}`,
      kind: index % 2 === 0 ? "pdf" : "pptx",
      spanText: `Neural pagination evidence block ${index + 3}.`,
    })),
  ];
  const fixtures = [
    fixtureDefinition({
      owner: users[0],
      title: "Neural Cartography Primer",
      topicId: "synaptic-vesicle-cycling",
      topicTitle: "Synaptic Vesicle Cycling",
      contentText: "The axonal refractory interval separates successive supported impulses.",
      focusReason: "Neural evidence is repeated across the private fixture sources.",
      createdAt: new Date(now - 60_000).toISOString(),
      sourceInputs: mainSources,
    }),
    fixtureDefinition({
      owner: users[0],
      title: "Archive Orbit Guide",
      topicId: "archive-orbit-topic",
      topicTitle: "Archiveworthy Orbital Pattern",
      contentText: "Archivable material remains in Library but leaves private Search.",
      focusReason: "This record validates archived aggregate behavior.",
      createdAt: new Date(now - 120_000).toISOString(),
      sourceInputs: [{ filename: "Archive Deck.pptx", kind: "pptx", spanText: "Archiveworthy private span." }],
    }),
    fixtureDefinition({
      owner: users[0],
      title: "Delete Orbit Guide",
      topicId: "delete-orbit-topic",
      topicTitle: "Deletable Orbital Pattern",
      contentText: "Deleted aggregate material must disappear immediately.",
      focusReason: "This record validates soft-delete exclusion.",
      createdAt: new Date(now - 180_000).toISOString(),
      sourceInputs: [{ filename: "Delete Notes.pdf", kind: "pdf", spanText: "Deletable private span." }],
    }),
    fixtureDefinition({
      owner: users[1],
      title: "B Private Xenon Guide",
      topicId: "xenon-partition",
      topicTitle: "Xenon Partition Boundary",
      contentText: "Account B private content must never appear for Account A.",
      focusReason: "This record validates cross-owner isolation.",
      createdAt: new Date(now - 90_000).toISOString(),
      sourceInputs: [{ filename: "B Private Xenon.pdf", kind: "pdf", spanText: "Xenon partition phrase belongs only to Account B." }],
    }),
  ];

  await checked("insert sessions", admin.from("preparation_sessions").insert(fixtures.map((fixture) => ({
    id: fixture.sessionId,
    owner_user_id: fixture.owner.id,
    access_token_hash: null,
    expires_at: null,
    title: fixture.title,
    state: "guide_ready",
    last_accessed_at: fixture.createdAt,
    created_at: fixture.createdAt,
    updated_at: fixture.createdAt,
  }))));
  const allSources = fixtures.flatMap((fixture) => fixture.sources);
  await checked("insert sources", admin.from("sources").insert(allSources.map((source) => ({
    id: source.id,
    session_id: source.sessionId,
    display_name: source.filename,
    kind: source.kind,
    mime_type: source.kind === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    size_bytes: 256,
    storage_path: `product-3c-e2e/${stamp}/${source.id}.${source.kind}`,
    status: "ready",
    unit_count: source.kind === "pdf" ? 4 : 7,
    readable_unit_count: source.kind === "pdf" ? 4 : 6,
    extracted_character_count: source.spanText.length,
    warnings: [],
    created_at: source.createdAt,
    updated_at: source.createdAt,
  }))));
  await checked("insert spans", admin.from("source_spans").insert(allSources.map((source) => ({
    id: source.spanId,
    session_id: source.sessionId,
    source_id: source.id,
    locator_kind: source.kind === "pdf" ? "page" : "slide",
    locator_number: 1,
    ordinal: 0,
    text: source.spanText,
    excerpt: source.spanText,
    content_hash: source.id.replaceAll("-", "").padEnd(64, "0"),
  }))));
  await checked("insert guides", admin.from("study_guides").insert(fixtures.map((fixture) => ({
    id: fixture.guideId,
    session_id: fixture.sessionId,
    schema_version: "1.0",
    prompt_version: "product-3c-e2e-fixture",
    source_checksum: fixture.guideId.replaceAll("-", "").padEnd(64, "0"),
    title: fixture.title,
    guide_json: guideJson(fixture),
    validation_warnings: [],
    last_accessed_at: fixture.createdAt,
    created_at: fixture.createdAt,
    updated_at: fixture.createdAt,
  }))));

  const main = fixtures[0];
  const quickCheckId = randomUUID();
  const attemptId = randomUUID();
  const quickCheck = quickCheckJson(main, quickCheckId);
  await checked("insert Quick Check", admin.from("quick_checks").insert({
    id: quickCheckId,
    session_id: main.sessionId,
    guide_id: main.guideId,
    guide_checksum: quickCheck.guide_checksum,
    schema_version: "1.0",
    prompt_version: "product-3c-e2e-fixture",
    requested_question_count: 5,
    question_count: 1,
    quick_check_json: quickCheck,
    validation_warnings: [],
  }));
  await checked("insert Quick Check result", admin.from("quick_check_attempts").insert({
    id: attemptId,
    session_id: main.sessionId,
    quick_check_id: quickCheckId,
    status: "submitted",
    selected_answers: [{ question_id: "product-3c-question-1", selected_option_id: "A" }],
    result_json: {
      correct_count: 1,
      scored_count: 1,
      understood_items: [{ question_id: "product-3c-question-1", topic_id: main.topicId }],
      wrong_items: [],
      review_topics: [],
      disclaimer: "Deterministic Product-3C fixture, not an AI generation pass.",
    },
    correct_count: 1,
    scored_count: 1,
    submitted_at: main.createdAt,
  }));

  writeFileSync(statePath, JSON.stringify({ users, password, fixtures, quickCheckId, attemptId }), { encoding: "utf8", mode: 0o600 });
  console.log(JSON.stringify({ statePath, accounts: users.map(({ email }) => email), fixtureCounts: { guides: fixtures.length, sources: allSources.length } }, null, 2));
}

async function cleanup() {
  if (!existsSync(statePath)) {
    console.log("No Product-3C fixture state exists.");
    return;
  }
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  const sessionIds = state.fixtures.map((fixture) => fixture.sessionId);
  await checked("delete fixture aggregates", admin.from("preparation_sessions").delete().in("id", sessionIds));
  for (const user of state.users) await checked(`delete user ${user.email}`, admin.auth.admin.deleteUser(user.id));
  unlinkSync(statePath);
  console.log(`Cleaned ${sessionIds.length} Product-3C aggregates and ${state.users.length} Auth users.`);
}

async function authenticatedIdentity(email, password) {
  const jar = new Map();
  const auth = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { data, error } = await auth.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw error ?? new Error("No authenticated session returned.");
  const direct = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { cookie: [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; "), direct };
}

async function appRequest(cookie, path, init = {}) {
  return fetch(`${appUrl}${path}`, {
    ...init,
    redirect: init.redirect ?? "manual",
    headers: {
      cookie,
      origin: appUrl,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
}

async function jsonRequest(cookie, path, init = {}) {
  const response = await appRequest(cookie, path, init);
  let body = null;
  try { body = await response.json(); } catch {}
  return { response, body };
}

async function assertSearch(cookie, query, expectedType, expectedText) {
  const { response, body } = await jsonRequest(cookie, `/api/search?q=${encodeURIComponent(query)}`);
  assert(response.status === 200, `search for ${query} must succeed`);
  const match = body.results.find((result) => result.type === expectedType && `${result.title} ${result.subtitle ?? ""} ${result.excerpt ?? ""}`.toLowerCase().includes(expectedText.toLowerCase()));
  assert(
    match,
    `search for ${query} must return ${expectedType} containing ${expectedText} (${JSON.stringify(body.results.map(({ type, title, subtitle, excerpt }) => ({ type, title, subtitle, excerpt })))})`,
  );
  return body;
}

function assertProfileCounts(html, guideCount, sourceCount) {
  assert(new RegExp(`>${guideCount}</strong>[\\s\\S]{0,220}>Guides?<`).test(html), `Profile must show ${guideCount} Guides`);
  assert(new RegExp(`>${sourceCount}</strong>[\\s\\S]{0,220}>Sources?<`).test(html), `Profile must show ${sourceCount} Sources`);
}

async function verify() {
  if (!existsSync(statePath)) throw new Error(`No fixture state exists at ${statePath}. Run setup first.`);
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  const [accountA, accountB] = state.users;
  const [main, archiveFixture, deleteFixture, bFixture] = state.fixtures;
  const identityA = await authenticatedIdentity(accountA.email, state.password);
  const identityB = await authenticatedIdentity(accountB.email, state.password);

  for (const path of ["/api/guides", "/api/library", "/api/search?q=neural"]) {
    const response = await appRequest("", path);
    assert(response.status === 401, `anonymous ${path} must return 401`);
  }
  for (const path of ["/my-guides", "/library", "/search?q=neural", "/profile", `/study/${main.sessionId}`]) {
    const response = await appRequest("", path);
    const body = await response.text();
    const authTarget = `/auth?next=${path.split("?")[0]}`;
    assert(
      [302, 303, 307, 308, 404].includes(response.status) || (response.status === 200 && body.includes(authTarget)),
      `signed-out ${path} must redirect or fail closed`,
    );
    assert(!body.includes(main.title) && !body.includes(main.sources[0].filename), `signed-out ${path} must not leak Account A data`);
  }

  const aGuides = await jsonRequest(identityA.cookie, "/api/guides?limit=2&page=1");
  assert(aGuides.response.status === 200 && aGuides.body.guides.length === 2 && aGuides.body.hasNextPage, "My Guides must paginate Account A data");
  assert(aGuides.body.guides.every((guide) => guide.title !== bFixture.title), "My Guides must exclude Account B");

  const libraryPage = await jsonRequest(identityA.cookie, "/api/library?limit=5&page=1&type=all&sort=newest");
  assert(
    libraryPage.response.status === 200 && libraryPage.body.sources.length === 5 && libraryPage.body.hasNextPage,
    `Library must paginate without loading all Sources (${JSON.stringify({ status: libraryPage.response.status, sourceCount: libraryPage.body?.sources?.length, hasNextPage: libraryPage.body?.hasNextPage, error: libraryPage.body?.error })})`,
  );
  const pdfLibrary = await jsonRequest(identityA.cookie, "/api/library?type=pdf&limit=24");
  const pptxLibrary = await jsonRequest(identityA.cookie, "/api/library?type=pptx&limit=24");
  assert(pdfLibrary.body.sources.length > 0 && pdfLibrary.body.sources.every((source) => source.kind === "pdf"), "PDF filter must return only PDFs");
  assert(pptxLibrary.body.sources.length > 0 && pptxLibrary.body.sources.every((source) => source.kind === "pptx"), "PPTX filter must return only PPTX files");
  assert([...pdfLibrary.body.sources, ...pptxLibrary.body.sources].every((source) => source.filename !== bFixture.sources[0].filename), "Library must exclude Account B Sources");

  await assertSearch(identityA.cookie, "Neural Cartography", "guide", "Neural Cartography Primer");
  await assertSearch(identityA.cookie, "Synaptic Vesicle", "topic", "Synaptic Vesicle Cycling");
  await assertSearch(identityA.cookie, "refractory interval", "topic", "axonal refractory interval");
  await assertSearch(identityA.cookie, "Glial Atlas", "source", "Glial Atlas.pdf");
  await assertSearch(identityA.cookie, "quasar resonance", "source", "quasar resonance coupling");
  await assertSearch(identityA.cookie, "QUASAR RESONANCE", "source", "quasar resonance coupling");
  const special = await jsonRequest(identityA.cookie, `/api/search?q=${encodeURIComponent("quasar & resonance")}`);
  assert(special.response.status === 200, "special-character search must return a predictable response");
  const noResult = await jsonRequest(identityA.cookie, "/api/search?q=nonexistentzzterm");
  assert(noResult.response.status === 200 && noResult.body.results.length === 0 && noResult.body.total === 0, "no-result search must be empty");
  const invalid = await jsonRequest(identityA.cookie, "/api/search?q=x");
  assert(invalid.response.status === 422, "invalid short search query must return 422");
  const searchPageOne = await jsonRequest(identityA.cookie, "/api/search?q=neural&limit=2&page=1");
  const searchPageTwo = await jsonRequest(identityA.cookie, "/api/search?q=neural&limit=2&page=2");
  assert(searchPageOne.body.results.length === 2 && searchPageOne.body.hasNextPage, "Search must enforce result limits and expose a next page");
  assert(searchPageTwo.body.hasPreviousPage, "Search page two must expose previous-page state");

  const beforeProfile = await appRequest(identityA.cookie, "/profile", { redirect: "follow" });
  const beforeProfileHtml = await beforeProfile.text();
  assert(beforeProfile.status === 200 && beforeProfileHtml.includes(accountA.email) && !beforeProfileHtml.includes(accountB.email), "Profile must show only Account A identity");
  assertProfileCounts(beforeProfileHtml, 3, 15);

  const quickCheck = await appRequest(identityA.cookie, `/study/${main.sessionId}/quick-check`, { redirect: "follow" });
  assert(quickCheck.status === 200 && (await quickCheck.text()).includes("Quick Check"), "Quick Check regression must pass");
  const result = await appRequest(identityA.cookie, `/study/${main.sessionId}/quick-check/${state.attemptId}/result`, { redirect: "follow" });
  assert(result.status === 200 && (await result.text()).includes("Learning Loop"), "Results regression must pass");

  const renamedTitle = "Renamed Neuro Atlas";
  const rename = await jsonRequest(identityA.cookie, `/api/guides/${main.guideId}`, { method: "PATCH", body: JSON.stringify({ action: "rename", title: renamedTitle }) });
  assert(rename.response.status === 200 && rename.body.guide.title === renamedTitle, "owner rename must succeed");
  await assertSearch(identityA.cookie, "Renamed Neuro", "guide", renamedTitle);
  const oldTitle = await jsonRequest(identityA.cookie, "/api/search?q=Neural%20Cartography");
  assert(!oldTitle.body.results.some((item) => item.type === "guide" && item.id === main.guideId), "old normalized title must not remain a Guide-title result after rename");

  const archive = await jsonRequest(identityA.cookie, `/api/guides/${archiveFixture.guideId}`, { method: "PATCH", body: JSON.stringify({ action: "archive" }) });
  assert(archive.response.status === 200, "owner archive must succeed");
  const archivedSearch = await jsonRequest(identityA.cookie, "/api/search?q=Archiveworthy");
  assert(archivedSearch.body.results.length === 0, "archived aggregate must leave Search");
  const archivedLibrary = await jsonRequest(identityA.cookie, "/api/library?type=pptx&limit=24");
  const archivedSource = archivedLibrary.body.sources.find((source) => source.id === archiveFixture.sources[0].id);
  assert(archivedSource?.relatedGuide?.archived === true, "archived Source must remain in Library with an archived Guide relationship");

  const deletion = await jsonRequest(identityA.cookie, `/api/guides/${deleteFixture.guideId}`, { method: "DELETE" });
  assert(deletion.response.status === 200 && deletion.body.guide.deletedAt && deletion.body.guide.purgeAfter, "soft delete must stage the 30-day purge");
  const deletedGuides = await jsonRequest(identityA.cookie, "/api/guides?limit=24");
  const deletedRecent = await appRequest(identityA.cookie, "/", { redirect: "follow" });
  const deletedRecentHtml = await deletedRecent.text();
  const deletedLibrary = await jsonRequest(identityA.cookie, "/api/library?limit=24");
  const deletedSearch = await jsonRequest(identityA.cookie, "/api/search?q=Deletable");
  const deletedReopen = await appRequest(identityA.cookie, `/api/guides/${deleteFixture.guideId}/reopen`);
  assert(!deletedGuides.body.guides.some((guide) => guide.id === deleteFixture.guideId), "deleted Guide must leave My Guides");
  assert(!deletedRecentHtml.includes(deleteFixture.title), "deleted Guide must leave Recent Guides");
  assert(!deletedLibrary.body.sources.some((source) => source.id === deleteFixture.sources[0].id), "deleted aggregate Source must leave Library");
  assert(deletedSearch.body.results.length === 0, "deleted aggregate must leave Search");
  assert(deletedReopen.status === 404, "deleted Guide reopen must be denied");

  const aSessionIds = state.fixtures.filter((fixture) => fixture.owner.id === accountA.id).map((fixture) => fixture.sessionId);
  const aGuideIds = state.fixtures.filter((fixture) => fixture.owner.id === accountA.id).map((fixture) => fixture.guideId);
  const aSourceIds = state.fixtures.filter((fixture) => fixture.owner.id === accountA.id).flatMap((fixture) => fixture.sources.map((source) => source.id));
  const aSpanIds = state.fixtures.filter((fixture) => fixture.owner.id === accountA.id).flatMap((fixture) => fixture.sources.map((source) => source.spanId));
  for (const [label, promise] of [
    ["sessions", identityB.direct.from("preparation_sessions").select("id").in("id", aSessionIds)],
    ["guides", identityB.direct.from("study_guides").select("id").in("id", aGuideIds)],
    ["sources", identityB.direct.from("sources").select("id").in("id", aSourceIds)],
    ["spans", identityB.direct.from("source_spans").select("id").in("id", aSpanIds)],
  ]) {
    const { data, error } = await promise;
    assert(!error && data.length === 0, `Account B authenticated RLS must hide Account A ${label}`);
  }
  const bSearch = await checked("Account B Search RPC", identityB.direct.rpc("search_owned_knowledge", { search_query: "quasar resonance", result_limit: 12, result_offset: 0 }));
  assert(bSearch.length === 0, "Account B Search RPC must not return Account A results");
  const bGuideRead = await appRequest(identityB.cookie, `/api/guides/${main.guideId}`);
  const bStudyRead = await appRequest(identityB.cookie, `/study/${main.sessionId}`);
  const bLibrary = await jsonRequest(identityB.cookie, "/api/library?limit=24");
  const bGuides = await jsonRequest(identityB.cookie, "/api/guides?limit=24");
  assert(bGuideRead.status === 404, "Account B API guessing must not read Account A Guide metadata");
  assert(bStudyRead.status === 404 && !(await bStudyRead.text()).includes(renamedTitle), "Account B direct URL guessing must fail closed");
  assert(bLibrary.body.sources.length === 1 && bLibrary.body.sources[0].filename === bFixture.sources[0].filename, "Account B Library must contain only its own Source");
  assert(bGuides.body.guides.length === 1 && bGuides.body.guides[0].title === bFixture.title, "Account B My Guides must contain only its own Guide");

  const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const anonSelect = await anon.from("sources").select("id").in("id", aSourceIds);
  const anonSearch = await anon.rpc("search_owned_knowledge", { search_query: "quasar resonance", result_limit: 12, result_offset: 0 });
  assert(!anonSelect.error && anonSelect.data.length === 0, "anon RLS must hide private Sources");
  assert(anonSearch.error, "anon role must not execute private Search RPC");

  const afterProfile = await appRequest(identityA.cookie, "/profile", { redirect: "follow" });
  const afterProfileHtml = await afterProfile.text();
  assertProfileCounts(afterProfileHtml, 2, 14);
  const relogin = await authenticatedIdentity(accountA.email, state.password);
  const persisted = await jsonRequest(relogin.cookie, "/api/guides?limit=24");
  assert(persisted.response.status === 200 && persisted.body.guides.some((guide) => guide.title === renamedTitle), "relogin must preserve owned data");

  console.log(JSON.stringify({
    passed: [
      "migration-backed My Guides", "Library pagination and PDF/PPTX filters", "Guide/Topic/content/filename/span FTS",
      "query validation, casing, special characters, no-results, and pagination", "rename/archive/delete behavior",
      "Profile identity and exact counts", "Quick Check and Results regression", "Account B page/API/direct-RLS isolation",
      "anonymous RLS and RPC denial", "signed-out route isolation", "relogin persistence",
    ],
    note: "Fixtures are deterministic database records, not an external AI generation pass.",
  }, null, 2));
}

if (command === "setup") await setup();
else if (command === "verify") await verify();
else if (command === "cleanup") await cleanup();
else throw new Error("Use: node --env-file=.env.local scripts/product-3c-e2e.mjs setup|verify|cleanup");
