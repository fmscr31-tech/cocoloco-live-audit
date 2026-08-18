import { commandConfigManager } from "../../core/commandConfigManager";
import { dashboardAPI } from "../../core/dashboardAPI";

const STYLE_ID = "cocoloco-gender-team-join-announcement-style";
const ROOT_SELECTOR = ".gender-battle-overlay";

function installStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .gbo-team-name.gbo-join-ready{position:relative;min-height:24px;display:flex;align-items:center;justify-content:center}
    .gbo-team-name .gbo-team-name-value,.gbo-team-name .gbo-team-join-prompt{transition:opacity .22s ease,transform .22s ease}
    .gbo-team-name .gbo-team-join-prompt{font-size:13px;font-weight:1000;letter-spacing:.35px;text-transform:none;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.72),0 0 8px rgba(255,255,255,.45)}
    .gbo-team-join-prompt .gbo-join-command{font-weight:1000;text-transform:uppercase;display:inline-block;padding:1px 5px;border-radius:6px;background:rgba(255,255,255,.16);box-shadow:0 0 7px rgba(255,255,255,.28)}
    .gbo-team:nth-child(1) .gbo-join-command{color:#8fe8ff}
    .gbo-team:nth-child(2) .gbo-join-command{color:#ff9fca}
    .gbo-team-name .gbo-team-name-value.is-join-visible{opacity:1;transform:translateY(0)}
    .gbo-team-name .gbo-team-name-value.is-join-hidden{opacity:0;transform:translateY(-3px);pointer-events:none}
    .gbo-team-name .gbo-team-join-prompt.is-join-visible{opacity:1;transform:translateY(0);pointer-events:auto}
    .gbo-team-name .gbo-team-join-prompt.is-join-hidden{opacity:0;transform:translateY(3px);pointer-events:none}
    @keyframes gboJoinPromptPulse{0%,100%{filter:brightness(1);transform:scale(1)}50%{filter:brightness(1.12);transform:scale(1.035)}}
    .gbo-team-name .gbo-team-join-prompt.is-join-visible{animation:gboJoinPromptPulse 1.05s ease-in-out infinite}
  `;
  document.head.appendChild(style);
}

function getTeams() {
  const config = commandConfigManager.refreshFromStorage();
  if (String(config.gameRegistrationMode || "").toUpperCase() !== "GENDER_TEAMS") return [];
  return Array.isArray(config.teams) ? config.teams.slice(0, 2) : [];
}

function update(root = document.querySelector(ROOT_SELECTOR)) {
  if (typeof document === "undefined" || !root || !root.isConnected) return;
  const teams = getTeams();
  if (teams.length < 2) return;

  root.querySelectorAll(".gbo-team").forEach((card, index) => {
    const team = teams[index];
    if (!team) return;
    const nameNode = card.querySelector(".gbo-team-name");
    if (!nameNode) return;

    const command = Array.isArray(team.commands) ? team.commands.find(Boolean) : team.commands;
    const visibleName = String(team.name || (index === 0 ? "CHICOS" : "CHICAS")).trim();
    const visibleCommand = String(command || (index === 0 ? "chico" : "chica")).trim();
    nameNode.classList.add("gbo-join-ready");
    nameNode.dataset.joinTeamId = String(team.id || index + 1);

    let valueNode = nameNode.querySelector(".gbo-team-name-value");
    let promptNode = nameNode.querySelector(".gbo-team-join-prompt");
    if (!valueNode) {
      valueNode = document.createElement("span");
      valueNode.className = "gbo-team-name-value";
      nameNode.textContent = "";
      nameNode.appendChild(valueNode);
    }
    if (!promptNode) {
      promptNode = document.createElement("span");
      promptNode.className = "gbo-team-join-prompt";
      nameNode.appendChild(promptNode);
    }
    valueNode.textContent = visibleName;

    if (promptNode.dataset.command !== visibleCommand) {
      promptNode.textContent = "";
      promptNode.appendChild(document.createTextNode("Escribe "));
      const commandNode = document.createElement("span");
      commandNode.className = "gbo-join-command";
      commandNode.textContent = visibleCommand;
      promptNode.appendChild(commandNode);
      promptNode.appendChild(document.createTextNode(" para unirte"));
      promptNode.dataset.command = visibleCommand;
    }
  });
}

function applyVisibility(root, showJoinPrompt) {
  root.querySelectorAll(".gbo-team").forEach(card => {
    const nameNode = card.querySelector(".gbo-team-name");
    if (!nameNode) return;
    const valueNode = nameNode.querySelector(".gbo-team-name-value");
    const promptNode = nameNode.querySelector(".gbo-team-join-prompt");
    if (!valueNode || !promptNode) return;

    // Hard visibility guarantee: only ONE of the two can occupy the layout at a time.
    valueNode.style.display = showJoinPrompt ? "none" : "block";
    promptNode.style.display = showJoinPrompt ? "inline-flex" : "none";
    valueNode.classList.toggle("is-join-visible", !showJoinPrompt);
    valueNode.classList.toggle("is-join-hidden", showJoinPrompt);
    promptNode.classList.toggle("is-join-visible", showJoinPrompt);
    promptNode.classList.toggle("is-join-hidden", !showJoinPrompt);
  });
}

let timer = null;
let observer = null;
let unsubscribeDashboard = null;
let initialized = false;
let phase = false;

function start() {
  if (initialized || typeof window === "undefined" || typeof document === "undefined") return;
  initialized = true;
  installStyles();

  const apply = () => {
    const root = document.querySelector(ROOT_SELECTOR);
    if (!root) return;
    update(root);
    applyVisibility(root, phase);
  };

  const tick = () => {
    const root = document.querySelector(ROOT_SELECTOR);
    const teams = getTeams();
    if (!root || teams.length < 2) return;
    phase = !phase;
    update(root);
    applyVisibility(root, phase);
  };

  apply();
  timer = window.setInterval(tick, 2600);

  observer = new MutationObserver(() => apply());
  observer.observe(document.body, { childList: true, subtree: true });
  unsubscribeDashboard = dashboardAPI.subscribe(apply);
}

if (typeof window !== "undefined") {
  window.setTimeout(start, 250);
}
