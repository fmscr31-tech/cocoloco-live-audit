import { eventBus } from "../../core/eventBus";

const TARGET_CLASS = "gbo-money-gun-target";
const timers = new Map();

function teamNodes() {
  return Array.from(document.querySelectorAll('.gender-battle-overlay .gbo-team[data-team-id]'));
}

function normalize(value) {
  return String(value ?? "").trim();
}

function clearTargets(exceptId = null) {
  teamNodes().forEach(node => {
    const id = normalize(node.dataset.teamId);
    if (!exceptId || id !== normalize(exceptId)) node.classList.remove(TARGET_CLASS);
  });
}

function applyTarget(teamId, executionId) {
  const targetId = normalize(teamId);
  if (!targetId) return false;
  const node = teamNodes().find(item => normalize(item.dataset.teamId) === targetId);
  if (!node) return false;

  clearTargets(targetId);
  node.classList.remove(TARGET_CLASS);
  void node.offsetWidth;
  node.classList.add(TARGET_CLASS);

  const key = normalize(executionId) || `moneygun-${Date.now()}`;
  if (timers.has(key)) window.clearTimeout(timers.get(key));
  timers.set(key, window.setTimeout(() => {
    node.classList.remove(TARGET_CLASS);
    timers.delete(key);
  }, 10000));
  return true;
}

function resolveSenderTeam(item) {
  return item?.resolvedTeamId || item?.senderTeamId || item?.teamId || item?.originalTeamId || null;
}

function resolveOpponent(senderTeamId) {
  const nodes = teamNodes();
  const sender = normalize(senderTeamId);
  const opponent = nodes.find(node => normalize(node.dataset.teamId) !== sender);
  return opponent?.dataset?.teamId || null;
}

function handleAbilityStarted(item) {
  if (String(item?.abilityId || "").toLowerCase() !== "epic_impact") return;
  const senderTeamId = resolveSenderTeam(item);
  const targetId = resolveOpponent(senderTeamId);
  if (!targetId) return;
  const executionId = item?.executionId || `moneygun-${Date.now()}`;
  const started = Date.now();
  const retry = () => {
    if (Date.now() - started > 1500) return;
    if (!applyTarget(targetId, executionId)) window.setTimeout(retry, 50);
  };
  retry();
}

function handleScoreExecuted(result) {
  if (String(result?.abilityId || "").toLowerCase() !== "epic_impact") return;
  if (!result?.success || !result?.teamId) return;
  const executionId = result?.executionId || `moneygun-reset-${Date.now()}`;
  const started = Date.now();
  const retry = () => {
    if (Date.now() - started > 1500) return;
    if (!applyTarget(result.teamId, executionId)) window.setTimeout(retry, 50);
  };
  retry();
}

eventBus.subscribe("ability:started", handleAbilityStarted);
eventBus.subscribe("ability:score_executed", handleScoreExecuted);

// The old overlay-wide epic class must never select the Cocazos zone as the Money Gun target.
const observer = new MutationObserver(() => {
  document.querySelectorAll('.gender-battle-overlay.gbo-ability-epic_impact .gbo-cocazo-shell').forEach(node => {
    node.classList.remove("ability-active");
  });
});
if (typeof document !== "undefined") {
  observer.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ["class"] });
}
