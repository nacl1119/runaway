"use strict";

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function compact(value, limit = 180) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

async function api(path) {
  const response = await fetch(path, { headers: { Accept: "application/json" }, cache: "no-store" });
  let body;
  try { body = await response.json(); } catch { body = { ok: false, error: `HTTP ${response.status}` }; }
  if (!response.ok || body.ok === false) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}

function listFrom(value, preferredKeys = []) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const key of preferredKeys) if (Array.isArray(value[key])) return value[key];
  return [];
}

function objectEntriesExcluding(value, excluded) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).filter(([key]) => !excluded.includes(key));
}

function setConnection(ok, label) {
  const el = $("#global-connection");
  if (!el) return;
  el.className = `connection ${ok ? "ok" : "bad"}`;
  el.querySelector("span:last-child").textContent = label;
}

async function checkConnection() {
  try {
    await api("/api/health");
    setConnection(true, "dashboard online");
  } catch {
    setConnection(false, "dashboard offline");
  }
}

function renderError(target, error, prefix = "LIVE 연결 실패") {
  target.innerHTML = `<div class="error-state"><strong>${escapeHtml(prefix)}</strong><br>${escapeHtml(error.message || error)}</div>`;
}

async function loadSetup() {
  const target = $("#setup-list");
  if (!target) return;
  try {
    const data = await api("/api/setup");
    const checks = data.checks || [];
    const passing = checks.filter((item) => item.ok).length;
    $("#setup-score").textContent = `${passing} / ${checks.length}`;
    target.innerHTML = checks.map((item) => `
      <div class="check-item ${item.ok ? "ok" : "bad"}" title="${escapeHtml(item.detail)}">
        <span class="check-icon">${item.ok ? "✓" : "×"}</span>
        <span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.detail)}</small></span>
      </div>`).join("");
  } catch (error) { renderError(target, error, "PC 점검 실패"); }
}

function normalizeCapabilities(data) {
  const list = listFrom(data, ["capabilities", "items", "data"]);
  if (list.length) return list.map((item, index) => {
    if (typeof item === "string") return { name: item, count: 1 };
    return {
      name: item.capability || item.name || item.id || `capability-${index + 1}`,
      count: item.count ?? item.nodes ?? item.available ?? 1,
    };
  });
  const object = data.capabilities && typeof data.capabilities === "object" ? data.capabilities : data;
  return objectEntriesExcluding(object, ["ok", "source", "fetched_at"]).map(([name, value]) => ({
    name,
    count: typeof value === "number" ? value : (value?.count ?? (Array.isArray(value) ? value.length : 1)),
  }));
}

async function loadCapabilities() {
  const target = $("#capabilities");
  if (!target) return;
  try {
    const data = await api("/api/capabilities");
    const capabilities = normalizeCapabilities(data);
    $("#cap-count").textContent = `${capabilities.length} types`;
    target.innerHTML = capabilities.length ? capabilities.map((item) => `
      <div class="capability"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.count)}</span></div>`).join("")
      : '<div class="empty-state">응답은 정상이지만 등록된 capability가 없습니다.</div>';
  } catch (error) {
    $("#cap-count").textContent = "OFFLINE";
    renderError(target, error);
  }
}

async function loadEnodes() {
  const target = $("#enode-list");
  const catalogTarget = $("#function-catalog");
  if (!target || !catalogTarget) return;
  try {
    const data = await api("/api/enodes");
    const instances = data.instances || [];
    const catalog = data.catalog || [];
    const labels = Object.fromEntries(catalog.map((item) => [item.id, item.label]));
    $("#enode-count").textContent = `${data.running || 0} running`;
    target.innerHTML = instances.length ? instances.map((item) => {
      const functions = (item.functions || []).map((id) => labels[id] || id);
      return `<div class="enode-row ${escapeHtml(String(item.status).toLowerCase())}">
        <span class="enode-status-dot"></span>
        <span class="enode-identity"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.detail || item.source)}</small></span>
        <span class="enode-functions">${functions.length ? functions.map((name) => `<span>${escapeHtml(name)}</span>`).join("") : '<em>기능 미확인</em>'}</span>
        <span class="state-pill ${escapeHtml(String(item.status).toLowerCase())}">${escapeHtml(item.status)}</span>
      </div>`;
    }).join("") : '<div class="empty-state enode-empty"><strong>실행 중인 enode가 없습니다.</strong><span>enode.exe를 시작하거나 config.json의 enode_instances에 점검할 엔드포인트를 추가하세요.</span></div>';
    catalogTarget.innerHTML = catalog.map((item) => `<div class="function-item"><span class="function-code">${escapeHtml(item.id)}</span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.description)}</small></div>`).join("");
  } catch (error) {
    $("#enode-count").textContent = "CHECK FAILED";
    renderError(target, error, "enode 프로세스 점검 실패");
    catalogTarget.innerHTML = '<div class="empty-state">기능 카탈로그를 읽지 못했습니다.</div>';
  }
}

function normalizeAsks(data) {
  const list = listFrom(data, ["asks", "items", "data"]);
  if (list.length) return list;
  return objectEntriesExcluding(data, ["ok", "source"]).map(([id, value]) => typeof value === "object" ? { id, ...value } : { id, question: value });
}

async function loadAsks() {
  const target = $("#asks");
  if (!target) return;
  try {
    const data = await api("/api/asks");
    const asks = normalizeAsks(data);
    $("#ask-count").textContent = `${asks.length} open`;
    target.innerHTML = asks.length ? asks.map((item, index) => `
      <div class="ask"><span class="ask-index">${String(index + 1).padStart(2, "0")}</span>
        <span><strong>${escapeHtml(item.question || item.prompt || item.title || item.id || "Ask")}</strong><small>${escapeHtml(item.run_id || item.runId || item.state || "응답 대기")}</small></span>
        <span class="badge live">OPEN</span>
      </div>`).join("") : '<div class="empty-state">현재 열린 Ask가 없습니다.</div>';
  } catch (error) {
    $("#ask-count").textContent = "OFFLINE";
    renderError(target, error);
  }
}

function getRunSteps(run) {
  const direct = listFrom(run, ["steps"]);
  if (direct.length) return direct.map((step, index) => ({
    id: step.id || step.step_id || step.name || `step-${index + 1}`,
    state: step.state || step.status || step.result?.state || "recorded",
    detail: step.uses || step.capability || step.exit_code || "",
  }));
  const recordSteps = run.record?.steps || [];
  return recordSteps.map((entry, index) => {
    const step = entry.data || {};
    return {
      id: step.id || step.step_id || step.name || entry.file || `step-${index + 1}`,
      state: step.state || step.status || step.result?.state || "recorded",
      detail: step.uses || step.capability || step.result?.exit_code || "",
    };
  });
}

function verdictData(run) {
  if (run.reject) return { title: "배정 거절", value: run.reject };
  if (run.verdict) return { title: "판정", value: run.verdict };
  if (run.judgment) return { title: "판정", value: run.judgment };
  if (run.success_when) return { title: "success_when", value: run.success_when };
  return { title: "판정", value: { state: run.state || "unknown", note: "별도 판정 필드 없음" } };
}

function renderRun(target, run) {
  const state = String(run.state || "UNKNOWN").toUpperCase();
  const steps = getRunSteps(run);
  const verdict = verdictData(run);
  const harness = run.record?.harness || [];
  const rejectText = run.reject ? compact(run.reject) : "없음";
  target.classList.remove("empty");
  target.innerHTML = `
    <div class="run-summary">
      <div><small>run id</small><strong>${escapeHtml(run.run_id || run.id || "—")}</strong></div>
      <div><small>state</small><strong>${escapeHtml(state)}</strong></div>
      <div><small>reject</small><strong>${escapeHtml(rejectText)}</strong></div>
    </div>
    <div class="detail-block"><h3>단계 타임라인 · ${steps.length}</h3>
      ${steps.length ? `<div class="timeline">${steps.map((step) => `<div class="timeline-item"><strong>${escapeHtml(step.id)}</strong><small>${escapeHtml(step.state)}${step.detail !== "" ? ` · ${escapeHtml(step.detail)}` : ""}</small></div>`).join("")}</div>` : '<div class="empty-state">표시할 단계 정보가 없습니다.</div>'}
    </div>
    <div class="detail-block"><h3>${escapeHtml(verdict.title)}</h3><pre>${escapeHtml(JSON.stringify(verdict.value, null, 2))}</pre></div>
    <div class="detail-block"><h3>AI 실행 상세 · result.harness · ${harness.length}</h3>
      ${harness.length ? `<pre>${escapeHtml(JSON.stringify(harness, null, 2))}</pre>` : `<div class="empty-state">${escapeHtml(run.record?.error || "record에 result.harness가 없거나 record를 아직 받을 수 없습니다.")}</div>`}
    </div>`;
  return state;
}

async function loadRun(id, target, stateTarget) {
  if (!id.trim()) {
    target.className = "run-result empty";
    target.textContent = "Run ID가 필요합니다.";
    return null;
  }
  target.className = "run-result empty";
  target.innerHTML = '<div class="skeleton"></div>';
  if (stateTarget) stateTarget.textContent = "LOADING";
  try {
    const run = await api(`/api/run/${encodeURIComponent(id.trim())}`);
    const state = renderRun(target, run);
    if (stateTarget) stateTarget.textContent = state;
    return run;
  } catch (error) {
    target.classList.remove("empty");
    renderError(target, error, "Run 조회 실패");
    if (stateTarget) stateTarget.textContent = "OFFLINE";
    return null;
  }
}

function summarizeReason(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  for (const key of ["reason", "message", "code", "error"]) if (value[key]) return compact(value[key], 240);
  return compact(value, 240);
}

function hasTestLikeStep(run) {
  return getRunSteps(run).some((step) => /test|verify|check|vet|검증|테스트/i.test(`${step.id} ${step.detail}`));
}

function inferDlc(run) {
  if (!run) return { mainNote: "샘플", related: [], note: "Run 없음 · 구현을 기본 맥락으로 표시합니다." };
  const state = String(run.state || "UNKNOWN").toUpperCase();
  if (run.reject) return { mainNote: "배정 실패", related: [], note: `매칭 거절 · ${summarizeReason(run.reject)}` };
  if (["CANCELLED", "CANCELED"].includes(state)) return { mainNote: "중단", related: [], note: "Run이 취소되어 구현 맥락이 중단된 상태로 추정됩니다." };
  if (["PENDING", "WAITING", "MATCHING", "QUEUED", "RUNNING", "EXECUTING", "ACTIVE"].includes(state)) return { mainNote: "실행 중", related: [], note: `${state} · 구현 실행 또는 대기 중으로 추정됩니다.` };
  if (["FAILED", "DONE"].includes(state)) {
    const failure = run.verdict?.success === false || run.verdict?.passed === false || run.judgment?.success === false || state === "FAILED";
    if (failure) return { mainNote: "완료", related: [{ name: "테스트", note: "판정 실패" }], note: "실행은 끝났지만 판정 실패로 테스트 맥락을 함께 검토합니다." };
  }
  if (["SUCCEEDED", "SUCCESS"].includes(state) || run.succeeded === true) {
    return hasTestLikeStep(run)
      ? { mainNote: "완료", related: [{ name: "테스트", note: "통과 참고" }], note: "성공했으며 테스트성 단계가 보여 관련 태그를 참고용으로 붙였습니다." }
      : { mainNote: "완료", related: [], note: "성공했으며 확인 가능한 테스트성 단계는 없습니다." };
  }
  return { mainNote: state.toLowerCase(), related: [], note: `${state} · 알려진 매핑 밖의 상태이므로 구현 맥락만 유지합니다.` };
}

function renderDlc(run) {
  const inferred = inferDlc(run);
  $("#main-tag").innerHTML = `구현 <small>${escapeHtml(inferred.mainNote)}</small>`;
  $("#related-tags").innerHTML = inferred.related.length ? inferred.related.map((tag) => `<span class="dlc-tag related">${escapeHtml(tag.name)} <small>${escapeHtml(tag.note)}</small></span>`).join("") : '<span class="muted-copy">현재 없음</span>';
  $("#stage-note").textContent = inferred.note;
}

const TASK_STORAGE_KEY = "enode.myTasks.v1";
const DEFAULT_TASKS = [
  { id: "sample-dump", title: "새 크래시 덤프 분석", type: "램덤프 분석", runId: "", sample: true },
  { id: "sample-build", title: "feature 브랜치 빌드", type: "빌드", runId: "", sample: true },
  { id: "sample-fuzz", title: "입력 corpus 퓨징", type: "퓨징", runId: "", sample: true },
  { id: "sample-test", title: "회귀 테스트 및 결과 확인", type: "테스트 수행", runId: "", sample: true },
  { id: "sample-gerrit", title: "리뷰용 패치 전송", type: "Gerrit 패치 push", runId: "", sample: true },
];
let workTasks = [];
const taskRuntime = new Map();

function saveTasks() {
  localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(workTasks));
}

function readTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(TASK_STORAGE_KEY));
    workTasks = Array.isArray(saved) ? saved : DEFAULT_TASKS.map((item) => ({ ...item }));
  } catch {
    workTasks = DEFAULT_TASKS.map((item) => ({ ...item }));
  }
  if (!localStorage.getItem(TASK_STORAGE_KEY)) saveTasks();
}

function taskStateFromRun(run) {
  const state = String(run.state || "UNKNOWN").toUpperCase();
  if (run.reject) return { label: "BLOCKED", className: "blocked", note: summarizeReason(run.reject) };
  if (["PENDING", "WAITING", "MATCHING", "QUEUED"].includes(state)) return { label: state, className: "waiting", note: "실행 대기 또는 매칭 중" };
  if (["RUNNING", "EXECUTING", "ACTIVE"].includes(state)) return { label: "RUNNING", className: "running", note: "enode가 작업 수행 중" };
  if (["SUCCEEDED", "SUCCESS"].includes(state)) return { label: "SUCCEEDED", className: "succeeded", note: "계약 판정 성공" };
  if (state === "DONE") return { label: "DONE", className: "done", note: "실행 완료 · 판정 확인 필요" };
  if (state === "FAILED") return { label: "FAILED", className: "failed", note: "실행 또는 판정 실패" };
  if (["CANCELLED", "CANCELED"].includes(state)) return { label: "CANCELED", className: "canceled", note: "작업 중단" };
  return { label: state, className: "unknown", note: "Mediator가 반환한 상태" };
}

function renderTaskList() {
  const target = $("#task-list");
  if (!target) return;
  $("#work-count").textContent = workTasks.length;
  const active = [...taskRuntime.values()].filter((item) => ["running", "waiting"].includes(item.className)).length;
  $("#active-work-count").textContent = active;
  target.innerHTML = workTasks.length ? workTasks.map((task) => {
    const runtime = taskRuntime.get(task.id) || (task.runId
      ? { label: "CHECKING", className: "checking", note: "Run 상태 확인 중" }
      : { label: "NOT LINKED", className: "local", note: "Run ID 미연결" });
    return `<div class="task-row" data-task-id="${escapeHtml(task.id)}">
      <span class="task-kind">${escapeHtml(task.type)}</span>
      <label class="task-title-field"><span class="sr-only">작업 이름</span><input class="task-title-editor" value="${escapeHtml(task.title)}"></label>
      <label class="task-run-field"><span>RUN ID</span><input class="task-run-editor" value="${escapeHtml(task.runId || "")}" placeholder="미연결"></label>
      <span class="task-state"><span class="state-pill ${escapeHtml(runtime.className)}">${escapeHtml(runtime.label)}</span><small>${escapeHtml(runtime.note)}</small></span>
      <span class="task-source badge ${task.sample ? "mock" : (task.runId ? "live" : "local")}">${task.sample ? "LOCAL SAMPLE" : (task.runId ? "LIVE RUN" : "LOCAL")}</span>
      <span class="task-actions"><button class="button small" data-action="inspect" type="button">상세</button><button class="icon-button" data-action="delete" type="button" aria-label="${escapeHtml(task.title)} 삭제">×</button></span>
    </div>`;
  }).join("") : '<div class="empty-state"><strong>등록된 작업이 없습니다.</strong><span>위 입력란에서 첫 작업을 추가하세요.</span></div>';
}

async function refreshTaskStatuses() {
  renderTaskList();
  await Promise.all(workTasks.filter((task) => task.runId).map(async (task) => {
    try {
      const run = await api(`/api/run/${encodeURIComponent(task.runId)}`);
      taskRuntime.set(task.id, taskStateFromRun(run));
    } catch (error) {
      taskRuntime.set(task.id, { label: "OFFLINE", className: "offline", note: error.message });
    }
  }));
  renderTaskList();
}

function initTasks() {
  readTasks();
  refreshTaskStatuses();
  $("#task-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const title = $("#task-title").value.trim();
    if (!title) return;
    workTasks.unshift({
      id: `task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      type: $("#task-type").value,
      runId: $("#task-run-id").value.trim(),
      sample: false,
    });
    saveTasks();
    event.target.reset();
    refreshTaskStatuses();
  });
  $("#task-list").addEventListener("change", (event) => {
    const row = event.target.closest("[data-task-id]");
    if (!row) return;
    const task = workTasks.find((item) => item.id === row.dataset.taskId);
    if (!task) return;
    if (event.target.classList.contains("task-title-editor")) task.title = event.target.value.trim() || task.title;
    if (event.target.classList.contains("task-run-editor")) {
      task.runId = event.target.value.trim();
      taskRuntime.delete(task.id);
    }
    task.sample = false;
    saveTasks();
    refreshTaskStatuses();
  });
  $("#task-list").addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    const row = event.target.closest("[data-task-id]");
    if (!button || !row) return;
    const index = workTasks.findIndex((item) => item.id === row.dataset.taskId);
    if (index < 0) return;
    const task = workTasks[index];
    if (button.dataset.action === "delete") {
      workTasks.splice(index, 1);
      taskRuntime.delete(task.id);
      saveTasks();
      renderTaskList();
      return;
    }
    if (!task.runId) {
      row.querySelector(".task-run-editor").focus();
      return;
    }
    $("#me-run-id").value = task.runId;
    $("#selected-work").textContent = task.title;
    const run = await loadRun(task.runId, $("#me-run-result"), $("#me-run-state"));
    renderDlc(run);
    $(".stage-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

async function loadProfile() {
  try {
    const profile = await api("/api/profile");
    $("#profile-email").textContent = profile.email;
  } catch (error) { $("#profile-email").textContent = error.message; }
}

async function refreshOps() {
  const button = $("#refresh-all");
  if (button) button.disabled = true;
  await Promise.allSettled([loadSetup(), loadCapabilities(), loadEnodes(), loadAsks(), checkConnection()]);
  if ($("#last-refresh")) $("#last-refresh").textContent = `갱신 ${new Date().toLocaleTimeString("ko-KR")}`;
  if (button) button.disabled = false;
}

function initOps() {
  $("#today").textContent = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
  $("#refresh-all").addEventListener("click", refreshOps);
  $("#ops-run-form").addEventListener("submit", (event) => {
    event.preventDefault();
    loadRun($("#ops-run-id").value, $("#ops-run-result"), $("#run-state"));
  });
  refreshOps();
}

function initMe() {
  checkConnection();
  loadProfile();
  initTasks();
  const label = $("#project-label");
  label.value = localStorage.getItem("enode.projectLabel") || "";
  label.addEventListener("input", () => localStorage.setItem("enode.projectLabel", label.value));
  $("#me-run-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    $("#selected-work").textContent = "직접 조회";
    const run = await loadRun($("#me-run-id").value, $("#me-run-result"), $("#me-run-state"));
    renderDlc(run);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.body.dataset.page === "me" ? initMe() : initOps();
});
