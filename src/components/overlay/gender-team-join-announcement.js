import { commandConfigManager } from "../../core/commandConfigManager";
import { dashboardAPI } from "../../core/dashboardAPI";

const STYLE_ID = "cocoloco-gender-team-join-announcement-style";
const ROOT_SELECTOR = ".gender-battle-overlay";

function installStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    /* Keep the registration prompt inside the same compact 31px header slot. */
    .gbo-team-name.gbo-join-ready{
      position:relative!important;
      min-height:31px!important;
      height:31px!important;
      max-height:31px!important;
      width:100%!important;
      display:block!important;
      overflow:hidden!important;
      box-sizing:border-box!important;
      padding:0!important;
      margin:0!important;
      transform:none!important;
      transition:none!important;
      animation:none!important;
      will-change:auto!important;
    }
    .gbo-team-name .gbo-team-name-value,
    .gbo-team-name .gbo-team-join-prompt{
      position:absolute!important;
      inset:0!important;
      width:100%!important;
      height:100%!important;
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      box-sizing:border-box!important;
      margin:0!important;
      padding:0 4px!important;
      overflow:hidden!important;
      white-space:nowrap!important;
      text-overflow:ellipsis!important;
      transform:none!important;
      transition:opacity .35s ease!important;
      animation:none!important;
      will-change:opacity!important;
      pointer-events:none!important;
    }
    .gbo-team-name .gbo-team-name-value{
      font-family:Impact,Haettenschweiler,"Arial Black",sans-serif!important;
      font-size:20px!important;
      line-height:1!important;
      font-weight:950!important;
      letter-spacing:1px!important;
      text-transform:uppercase!important;
      text-shadow:0 2px 0 rgba(0,0,0,.65),0 0 8px rgba(255,255,255,.25)!important;
    }
    .gbo-team-name .gbo-team-join-prompt{
      gap:3px!important;
      font-family:Impact,Haettenschweiler,"Arial Black",sans-serif!important;
      font-size:8px!important;
      line-height:1!important;
      font-weight:900!important;
      letter-spacing:.2px!important;
      text-transform:uppercase!important;
      color:#fff!important;
      text-shadow:0 1px 0 rgba(0,0,0,.85),0 0 6px rgba(255,255,255,.25)!important;
    }
    .gbo-join-line{display:inline!important;width:auto!important;line-height:1!important}
    .gbo-join-line-command{
      display:inline!important;
      padding:0!important;
      margin:0 2px!important;
      border:0!important;
      border-radius:0!important;
      background:transparent!important;
      box-shadow:none!important;
      font-size:1.08em!important;
      font-weight:1000!important;
      text-transform:uppercase!important;
      vertical-align:baseline!important;
    }
    .gbo-team:nth-child(1) .gbo-join-line-command{color:#20bfff!important}
    .gbo-team:nth-child(2) .gbo-join-line-command{color:#fff!important}
    .gbo-team-name .gbo-team-name-value.is-join-visible{opacity:1!important}
    .gbo-team-name .gbo-team-name-value.is-join-hidden{opacity:0!important}
    .gbo-team-name .gbo-team-join-prompt.is-join-visible{opacity:1!important}
    .gbo-team-name .gbo-team-join-prompt.is-join-hidden{opacity:0!important}
    .gender-team-wrapper.gender-girls .team-card{
      background:linear-gradient(145deg,#ff1493 0%,#e60073 52%,#b00058 100%) !important;
      border-color:#ff66b7 !important;
      box-shadow:0 0 18px rgba(255,20,147,.62),inset 0 0 24px rgba(255,105,180,.24) !important;
    }
    @media (max-width:520px){
      .gbo-team-name.gbo-join-ready{min-height:31px!important;height:31px!important;max-height:31px!important}
      .gbo-team-name .gbo-team-name-value{font-size:18px!important}
      .gbo-team-name .gbo-team-join-prompt{font-size:7.5px!important;letter-spacing:0!important}
    }
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
    const visibleCommand = String(command || (index === 0 ? "chicos" : "chicas")).trim();

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
      const line = document.createElement("span");
      line.className = "gbo-join-line";
      line.appendChild(document.createTextNode("Escribe "));
      const commandNode = document.createElement("span");
      commandNode.className = "gbo-join-line-command";
      commandNode.textContent = visibleCommand;
      line.appendChild(commandNode);
      line.appendChild(document.createTextNode(" para unirte a tu equipo"));
      promptNode.appendChild(line);
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

    valueNode.classList.toggle("is-join-visible", !showJoinPrompt);
    valueNode.classList.toggle("is-join-hidden", showJoinPrompt);
    promptNode.classList.toggle("is-join-visible", showJoinPrompt);
    promptNode.classList.toggle("is-join-hidden", !showJoinPrompt);
  });
}

let initialized = false;
let phase = false;
let intervalId = null;

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
    if (!root) return;
    const teams = getTeams();
    if (teams.length < 2) return;
    phase = !phase;
    update(root);
    applyVisibility(root, phase);
  };

  apply();
  intervalId = window.setInterval(tick, 5200);
  dashboardAPI.subscribe(apply);
}

if (typeof window !== "undefined") window.setTimeout(start, 250);
