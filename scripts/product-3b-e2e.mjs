import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const statePath = join(tmpdir(), "folveta-product-3b-e2e.json");
const command = process.argv[2];
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !serviceKey || !anonKey) throw new Error("Supabase dev environment variables are required.");
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

function guideJson({ guideId, sessionId, sourceId, spanId, title, generatedAt }) {
  const reference = {
    span_id: spanId,
    source_id: sourceId,
    source_name: `${title}.pdf`,
    locator: { kind: "page", number: 1 },
    excerpt: "Product-3B fixture evidence for owner and reopen validation.",
  };
  return {
    schema_version: "1.0",
    id: guideId,
    session_id: sessionId,
    title,
    based_on_uploaded_materials: true,
    source_count: 1,
    priority_method_summary: "Fixture priority reflects only the inserted E2E source and is not AI-generated.",
    generation_status: "ready",
    source_issues: [],
    topics: [{
      id: "core-concept",
      title: "Core concept",
      priority: "study_first",
      focus_reason: "Use this fixture topic to verify reopen and assessment continuity.",
      explanation: [{
        id: "fixture-claim",
        text: "This is a deterministic Product-3B E2E fixture claim.",
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
    generated_at: generatedAt,
  };
}

function quickCheckJson({ quickCheckId, guideId, sourceId, spanId, generatedAt }) {
  const reference = {
    span_id: spanId,
    source_id: sourceId,
    source_name: "Product-3B fixture.pdf",
    locator: { kind: "page", number: 1 },
    excerpt: "Product-3B fixture evidence for owner and reopen validation.",
  };
  return {
    schema_version: "1.0",
    id: quickCheckId,
    guide_id: guideId,
    guide_checksum: "a".repeat(64),
    requested_question_count: 5,
    question_count: 1,
    format: "mcq_only",
    disclaimer: "Deterministic Product-3B fixture, not an AI generation pass.",
    limited_sample: true,
    questions: [{
      id: "fixture-question-1",
      topic_id: "core-concept",
      stem: "What is this record used to verify?",
      options: [
        { id: "A", text: "Guide management continuity" },
        { id: "B", text: "Payment processing" },
        { id: "C", text: "Public indexing" },
        { id: "D", text: "AI gateway quality" },
      ],
      correct_option_id: "A",
      explanation: [{ id: "fixture-answer", text: "The fixture verifies Guide management continuity.", support_status: "direct", source_references: [reference] }],
      source_refs: [reference],
      related_section: { section_type: "concise_explanation", section_item_id: "core-concept", anchor: "topic-core-concept-explanation" },
      validation: { status: "validated", single_best_answer: true, question_grounded: true, answer_grounded: true, explanation_grounded: true },
    }],
    generated_at: generatedAt,
  };
}

async function checked(label, promise) {
  const result = await promise;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function setup() {
  if (existsSync(statePath)) throw new Error(`Fixture state already exists at ${statePath}. Run cleanup first.`);
  const stamp = Date.now();
  const password = `Folveta-3B-${stamp}!`;
  const users = [];
  for (const account of ["a", "b"]) {
    const email = `folveta-product-3b-${account}-${stamp}@example.com`;
    const data = await checked(`create user ${account}`, admin.auth.admin.createUser({ email, password, email_confirm: true }));
    users.push({ id: data.user.id, email });
  }

  const now = Date.now();
  const definitions = [
    { owner: users[0], title: "A Most Recent Guide", minutesAgo: 1 },
    { owner: users[0], title: "A Rename Guide", minutesAgo: 10 },
    { owner: users[0], title: "A Archive Guide", minutesAgo: 20 },
    { owner: users[0], title: "A Delete Guide", minutesAgo: 30 },
    { owner: users[1], title: "B Private Guide", minutesAgo: 5 },
  ];
  const fixtures = definitions.map((definition) => {
    const sessionId = randomUUID();
    const guideId = randomUUID();
    const sourceId = randomUUID();
    const accessedAt = new Date(now - definition.minutesAgo * 60_000).toISOString();
    return { ...definition, sessionId, guideId, sourceId, spanId: `fixture-span-${sourceId}`, accessedAt };
  });

  await checked("insert sessions", admin.from("preparation_sessions").insert(fixtures.map((item) => ({
    id: item.sessionId,
    owner_user_id: item.owner.id,
    access_token_hash: null,
    expires_at: null,
    title: item.title,
    state: "guide_ready",
    last_accessed_at: item.accessedAt,
    created_at: item.accessedAt,
    updated_at: item.accessedAt,
  }))));
  await checked("insert sources", admin.from("sources").insert(fixtures.map((item) => ({
    id: item.sourceId,
    session_id: item.sessionId,
    display_name: `${item.title}.pdf`,
    kind: "pdf",
    mime_type: "application/pdf",
    size_bytes: 128,
    storage_path: `product-3b-e2e/${stamp}/${item.sourceId}.pdf`,
    status: "ready",
    unit_count: 1,
    readable_unit_count: 1,
    extracted_character_count: 64,
    warnings: [],
    created_at: item.accessedAt,
    updated_at: item.accessedAt,
  }))));
  await checked("insert spans", admin.from("source_spans").insert(fixtures.map((item) => ({
    id: item.spanId,
    session_id: item.sessionId,
    source_id: item.sourceId,
    locator_kind: "page",
    locator_number: 1,
    ordinal: 0,
    text: "Product-3B fixture evidence for owner and reopen validation.",
    excerpt: "Product-3B fixture evidence for owner and reopen validation.",
    content_hash: "b".repeat(64),
  }))));
  await checked("insert guides", admin.from("study_guides").insert(fixtures.map((item) => ({
    id: item.guideId,
    session_id: item.sessionId,
    schema_version: "1.0",
    prompt_version: "product-3b-e2e-fixture",
    source_checksum: "c".repeat(64),
    title: item.title,
    guide_json: guideJson({ guideId: item.guideId, sessionId: item.sessionId, sourceId: item.sourceId, spanId: item.spanId, title: item.title, generatedAt: item.accessedAt }),
    validation_warnings: [],
    last_accessed_at: item.accessedAt,
    created_at: item.accessedAt,
    updated_at: item.accessedAt,
  }))));

  const assessmentFixture = fixtures[0];
  const quickCheckId = randomUUID();
  const attemptId = randomUUID();
  const quickCheck = quickCheckJson({ quickCheckId, guideId: assessmentFixture.guideId, sourceId: assessmentFixture.sourceId, spanId: assessmentFixture.spanId, generatedAt: assessmentFixture.accessedAt });
  await checked("insert Quick Check", admin.from("quick_checks").insert({
    id: quickCheckId,
    session_id: assessmentFixture.sessionId,
    guide_id: assessmentFixture.guideId,
    guide_checksum: quickCheck.guide_checksum,
    schema_version: "1.0",
    prompt_version: "product-3b-e2e-fixture",
    requested_question_count: 5,
    question_count: 1,
    quick_check_json: quickCheck,
    validation_warnings: [],
  }));
  await checked("insert Quick Check result", admin.from("quick_check_attempts").insert({
    id: attemptId,
    session_id: assessmentFixture.sessionId,
    quick_check_id: quickCheckId,
    status: "submitted",
    selected_answers: [{ question_id: "fixture-question-1", selected_option_id: "A" }],
    result_json: {
      correct_count: 1,
      scored_count: 1,
      understood_items: [{ question_id: "fixture-question-1", topic_id: "core-concept" }],
      wrong_items: [],
      review_topics: [],
      disclaimer: "Deterministic Product-3B fixture, not an AI generation pass.",
    },
    correct_count: 1,
    scored_count: 1,
    submitted_at: assessmentFixture.accessedAt,
  }));

  const state = { users, password, fixtures, quickCheckId, attemptId };
  writeFileSync(statePath, JSON.stringify(state), { encoding: "utf8", mode: 0o600 });
  console.log(JSON.stringify({ statePath, accounts: users.map((user) => ({ email: user.email })), password, fixtures: fixtures.map(({ title, guideId, sessionId, owner }) => ({ title, guideId, sessionId, owner: owner.email })), attemptId }, null, 2));
}

async function cleanup() {
  if (!existsSync(statePath)) {
    console.log("No Product-3B fixture state exists.");
    return;
  }
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  const sessionIds = state.fixtures.map((fixture) => fixture.sessionId);
  if (sessionIds.length) await checked("delete fixture aggregates", admin.from("preparation_sessions").delete().in("id", sessionIds));
  for (const user of state.users) await checked(`delete user ${user.email}`, admin.auth.admin.deleteUser(user.id));
  unlinkSync(statePath);
  console.log(`Cleaned ${sessionIds.length} Product-3B fixture aggregates and ${state.users.length} Auth users.`);
}

async function authCookieHeader(email, password) {
  const jar = new Map();
  const auth = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await auth.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function appRequest(cookie, path, init = {}) {
  return fetch(`http://localhost:3000${path}`, {
    ...init,
    redirect: init.redirect ?? "manual",
    headers: {
      cookie,
      origin: "http://localhost:3000",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(`E2E assertion failed: ${message}`);
}

async function verify() {
  if (!existsSync(statePath)) throw new Error(`No fixture state exists at ${statePath}. Run setup first.`);
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  const accountA = state.users[0];
  const accountB = state.users[1];
  const aCookie = await authCookieHeader(accountA.email, state.password);
  const bCookie = await authCookieHeader(accountB.email, state.password);
  const aMostRecent = state.fixtures.find((item) => item.title === "A Most Recent Guide");
  const aArchive = state.fixtures.find((item) => item.title === "A Archive Guide");
  const aDelete = state.fixtures.find((item) => item.title === "A Delete Guide");

  const anonymous = await appRequest("", "/api/guides");
  assert(anonymous.status === 401, "anonymous Guide list must return 401");

  const aPageOneResponse = await appRequest(aCookie, "/api/guides?limit=2&page=1");
  const aPageOne = await aPageOneResponse.json();
  assert(aPageOneResponse.status === 200, "Account A list must succeed");
  assert(aPageOne.guides.length === 2 && aPageOne.hasNextPage === true, "page one must be bounded with a next page");
  assert(aPageOne.guides[0].id === aMostRecent.guideId, "recent sorting must begin with the latest access");
  assert(aPageOne.guides.every((guide) => guide.title !== "B Private Guide"), "Account A must not see Account B data");

  const aPageTwoResponse = await appRequest(aCookie, "/api/guides?limit=2&page=2");
  const aPageTwo = await aPageTwoResponse.json();
  assert(aPageTwoResponse.status === 200 && aPageTwo.guides.length === 2, "page two must return the remaining Guides");
  assert(aPageTwo.hasPreviousPage === true, "page two must expose previous-page state");

  const reopen = await appRequest(aCookie, `/api/guides/${aMostRecent.guideId}/reopen`);
  assert([302, 303, 307, 308].includes(reopen.status), "owned reopen must redirect");
  assert(reopen.headers.get("location")?.endsWith(`/study/${aMostRecent.sessionId}`), "reopen must resolve the owned session");

  const quickCheck = await appRequest(aCookie, `/study/${aMostRecent.sessionId}/quick-check`, { redirect: "follow" });
  assert(quickCheck.status === 200 && (await quickCheck.text()).includes("Quick Check"), "existing Quick Check must remain accessible");
  const result = await appRequest(aCookie, `/study/${aMostRecent.sessionId}/quick-check/${state.attemptId}/result`, { redirect: "follow" });
  assert(result.status === 200 && (await result.text()).includes("Learning Loop"), "existing Results must remain accessible");

  const bListResponse = await appRequest(bCookie, "/api/guides");
  const bList = await bListResponse.json();
  assert(bListResponse.status === 200 && bList.guides.length === 1 && bList.guides[0].title === "B Private Guide", "Account B must see only its own Guide");

  const bRead = await appRequest(bCookie, `/api/guides/${aMostRecent.guideId}`);
  assert(bRead.status === 404, "Account B must not read Account A Guide metadata");
  for (const [method, body] of [
    ["PATCH", { action: "rename", title: "Cross-owner rename" }],
    ["PATCH", { action: "archive" }],
    ["DELETE", undefined],
  ]) {
    const response = await appRequest(bCookie, `/api/guides/${aMostRecent.guideId}`, { method, body: body ? JSON.stringify(body) : undefined });
    assert(response.status === 404, `Account B ${method} mutation must be denied`);
  }

  const archive = await appRequest(aCookie, `/api/guides/${aArchive.guideId}`, { method: "PATCH", body: JSON.stringify({ action: "archive" }) });
  assert(archive.status === 200, "Account A archive must succeed");
  const activeAfterArchive = await (await appRequest(aCookie, "/api/guides")).json();
  const archivedAfterArchive = await (await appRequest(aCookie, "/api/guides?view=archived")).json();
  assert(!activeAfterArchive.guides.some((guide) => guide.id === aArchive.guideId), "archived Guide must leave the active and Recent query");
  assert(archivedAfterArchive.guides.some((guide) => guide.id === aArchive.guideId), "archived Guide must appear in Archived");

  const deletion = await appRequest(aCookie, `/api/guides/${aDelete.guideId}`, { method: "DELETE" });
  assert(deletion.status === 200, "owner soft delete must succeed");
  const deletionBody = await deletion.json();
  assert(Boolean(deletionBody.guide.deletedAt && deletionBody.guide.purgeAfter), "soft delete must return deletion and purge timestamps");
  const deletedReopen = await appRequest(aCookie, `/api/guides/${aDelete.guideId}/reopen`);
  assert(deletedReopen.status === 404, "deleted Guide must not reopen");

  const reloginCookie = await authCookieHeader(accountA.email, state.password);
  const afterReloginResponse = await appRequest(reloginCookie, "/api/guides");
  const afterRelogin = await afterReloginResponse.json();
  assert(afterReloginResponse.status === 200 && afterRelogin.guides.some((guide) => guide.id === aMostRecent.guideId), "Guide must persist after a new sign-in session");

  console.log(JSON.stringify({
    passed: [
      "anonymous denial",
      "owner-only lists",
      "recent sorting",
      "pagination",
      "stable-ID reopen",
      "Quick Check continuity",
      "Results continuity",
      "cross-owner read/mutation denial",
      "archive exclusion",
      "soft delete",
      "deleted reopen denial",
      "relogin persistence",
    ],
    note: "Fixtures are deterministic database records, not an AI generation pass.",
  }, null, 2));
}

if (command === "setup") await setup();
else if (command === "verify") await verify();
else if (command === "cleanup") await cleanup();
else throw new Error("Use: node --env-file=.env.local scripts/product-3b-e2e.mjs setup|verify|cleanup");
