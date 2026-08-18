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
    .gbo-team-name .gbo-team-name-value,.gbo-team-name .gbo-team-join-prompt{display:block;transition:opacity .22s ease,transform .22s ease}
    .gbo-team-name .gbo-team-join-prompt{font-size:12px;font-weight:1000;letter-spacing:.25px;text-transform:none;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.72),0 0 7px rgba(255,255,255,.4);animation:gboJoinPromptPulse 1.05s ease-in-out infinite}
    .gbo-team-name .gbo-team-join-command{display:inline-block;margin:0 3px;padding:1px 5px;border-radius:7px;font-size:1.12em;font-weight:1000;letter-spacing:.45px;text-transform:uppercase;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.7),0 0 8px currentColor;box-shadow:0 0 0 1px rgba(255,255,255,.5),0 2px 7px rgba(0,0,0,.28);animation:gboJoinCommandPulse 1.05s ease-in-out infinite}
    .gbo-team-name .gbo-team-join-command[data-team-index="0"]{background:rgba(0,145,255,.92);color:#e9f9ff}
    .gbo-team-name .gbo-team-join-command[data-team-index="1"]{background:rgba(225,38,145,.92);color:#fff2fb}
    .gbo-team-name.gbo-join-showing .gbo-team-name-value{opacity:0;transform:translateY(-3px);position:absolute}
    .gbo-team-name:not(.gbo-join-showing) .gbo-team-join-prompt{opacity:0;transform:translateY(3px);position:absolute;pointer-events:none}
    .gbo-team-name.gbo-join-showing .gbo-team-join-prompt{opacity:1;transform:translateY(0);position:relative}
    @keyframes gboJoinPromptPulse{0%,100%{opacity:.78;transform:scale(1)}50%{opacity:1;transform:scale(1.035)}}
    @keyframes gboJoinCommandPulse{0%,100%{transform:scale(1);filter:brightness(1)}50%{transform:scale(1.07);filter:brightness(1.16)}}
  `;
  document.head.appendChild(style);
}

function getTeams() {
  const config = commandConfigManager.refreshFromStorage();
  if (String(config.gameRegistrationMode || "").toUpperCase() !== "GENDER_TEAMS") return [];
  return Array.isArray(config.teams) ? config.teams.slice(0, 2) : [];
}

function update() {
  if (typeof document === "undefined") return;
  const root = document.querySelector(ROOT_SELECTOR);
  if (!root) return;
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
    promptNode.replaceChildren();
    const prefix = document.createTextNode("Escribe ");
    const commandNode = document.createElement("span");
    commandNode.className = "gbo-team-join-command";
    commandNode.dataset.teamIndex = String(index);
    commandNode.textContent = visibleCommand;
    const suffix = document.createTextNode(" para unirte");
    promptNode.append(prefix, commandNode, suffix);
  });
}

let timer = null;
let observer = null;
let unsubscribeMode = null;
let unsubscribeDashboard = null;
let initialized = false;
let phase = false;

function start() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  installStyles();

  const tick = () => {
    const root = document.querySelector(ROOT_SELECTOR);
    const teams = getTeams();
    if (!root || teams.length < 2) return;
    phase = !phase;
    root.querySelectorAll(".gbo-team").forEach(card => {
      const nameNode = card.querySelector(".gbo-team-name");
      if (nameNode) nameNode.classList.toggle("gbo-join-showing", phase);
    });
    update();
  };

  update();
  timer = window.setInterval(tick, 2600);
  observer = new MutationObserver(() => update());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  unsubscribeMode = dashboardAPI.subscribe(() => update());
  unsubscribeDashboard = dashboardAPI.subscribe(() => update());
}

if (typeof window !== "undefined") {
  window.setTimeout(start, 0);
}