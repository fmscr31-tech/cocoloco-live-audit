import { commandConfigManager } from "../../core/commandConfigManager";
import { dashboardAPI } from "../../core/dashboardAPI";

const STYLE_ID = "cocoloco-gender-team-join-announcement-style";
const ROOT_SELECTOR = ".gender-battle-overlay";

function installStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .gbo-team-name.gbo-join-ready{position:relative;min-height:42px;display:flex;align-items:center;justify-content:center;overflow:hidden;max-width:100%;padding:2px 4px;box-sizing:border-box}
    .gbo-team-name .gbo-team-name-value,.gbo-team-name .gbo-team-join-prompt{transition:opacity .22s ease,transform .22s ease;max-width:100%;box-sizing:border-box}
    .gbo-team-name .gbo-team-join-prompt{font-size:clamp(9px,1.25vw,11px);line-height:1.08;font-weight:900;letter-spacing:.1px;text-transform:none;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.8),0 0 6px rgba(255,255,255,.3);white-space:normal;overflow:hidden;text-align:center;width:100%;display:block}
    .gbo-join-line{display:block;width:100%;line-height:1.08}
    .gbo-join-line-command{font-size:1.08em;font-weight:1000;text-transform:uppercase;display:inline-block;padding:1px 5px;border-radius:5px;background:rgba(255,255,255,.16);box-shadow:0 0 6px rgba(255,255,255,.24);vertical-align:middle}
    .gbo-team:nth-child(1) .gbo-join-line-command{color:#8fe8ff}
    .gbo-team:nth-child(2) .gbo-join-line-command{color:#ff9fca}
    .gbo-team-name .gbo-team-name-value.is-join-visible{opacity:1;transform:translateY(0)}
    .gbo-team-name .gbo-team-name-value.is-join-hidden{opacity:0;transform:translateY(-3px);pointer-events:none}
    .gbo-team-name .gbo-team-join-prompt.is-join-visible{opacity:1;transform:translateY(0);pointer-events:auto}
    .gbo-team-name .gbo-team-join-prompt.is-join-hidden{opacity:0;transform:translateY(3px);pointer-events:none}
    @keyframes gboJoinPromptPulse{0%,100%{filter:brightness(1);transform:scale(1)}50%{filter:brightness(1.08);transform:scale(1.015)}}
    .gbo-team-name .gbo-team-join-prompt.is-join-visible{animation:gboJoinPromptPulse 1.2s ease-in-out infinite}
    .gender-team-wrapper.gender-girls .team-card{background:linear-gradient(145deg,#ff1493 0%,#e60073 52%,#b00058 100%) !important;border-color:#ff66b7 !important;box-shadow:0 0 18px rgba(255,20,147,.62),inset 0 0 24px rgba(255,105,180,.24) !important}
    @media (max-width:520px){.gbo-team-name.gbo-join-ready{min-height:38px}.gbo-team-name .gbo-team-join-prompt{font-size:10px;letter-spacing:0}.gbo-join-line-command{padding:1px 4px}}
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
    if (!valueNode) { valueNode = document.createElement("span"); valueNode.className = "gbo-team-name-value"; nameNode.textContent = ""; nameNode.appendChild(valueNode); }
    if (!promptNode) { promptNode = document.createElement("span"); promptNode.className = "gbo-team-join-prompt"; nameNode.appendChild(promptNode); }
    valueNode.textContent = visibleName;
    if (promptNode.dataset.command !== visibleCommand) {
      promptNode.textContent = "";
      const line1 = document.createElement("span"); line1.className = "gbo-join-line";
      line1.appendChild(document.createTextNode("Escribe "));
      const commandNode = document.createElement("span"); commandNode.className = "gbo-join-line-command"; commandNode.textContent = visibleCommand; line1.appendChild(commandNode);
      const line2 = document.createElement("span"); line2.className = "gbo-join-line"; line2.textContent = "para unirte a tu equipo";
      promptNode.appendChild(line1); promptNode.appendChild(line2); promptNode.dataset.command = visibleCommand;
    }
  });
}

function applyVisibility(root, showJoinPrompt) {
  root.querySelectorAll(".gbo-team").forEach(card => {
    const nameNode = card.querySelector(".gbo-team-name"); if (!nameNode) return;
    const valueNode = nameNode.querySelector(".gbo-team-name-value"); const promptNode = nameNode.querySelector(".gbo-team-join-prompt"); if (!valueNode || !promptNode) return;
    valueNode.style.display = showJoinPrompt ? "none" : "block"; promptNode.style.display = showJoinPrompt ? "block" : "none";
    valueNode.classList.toggle("is-join-visible", !showJoinPrompt); valueNode.classList.toggle("is-join-hidden", showJoinPrompt);
    promptNode.classList.toggle("is-join-visible", showJoinPrompt); promptNode.classList.toggle("is-join-hidden", !showJoinPrompt);
  });
}

let initialized = false;
let phase = false;
function start() {
  if (initialized || typeof window === "undefined" || typeof document === "undefined") return;
  initialized = true; installStyles();
  const apply = () => { const root = document.querySelector(ROOT_SELECTOR); if (!root) return; update(root); applyVisibility(root, phase); };
  const tick = () => { const root = document.querySelector(ROOT_SELECTOR); if (!root) return; const teams = getTeams(); if (teams.length < 2) return; phase = !phase; update(root); applyVisibility(root, phase); };
  apply(); window.setInterval(tick, 2600); dashboardAPI.subscribe(apply);
}
if (typeof window !== "undefined") window.setTimeout(start, 250);
