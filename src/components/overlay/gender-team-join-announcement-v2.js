import { commandConfigManager } from "../../core/commandConfigManager";
import { dashboardAPI } from "../../core/dashboardAPI";

const STYLE_ID = "cocoloco-gender-team-join-v2-style";
const ROOT_SELECTOR = ".gender-battle-overlay";

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .gbo-team-name.coco-join-rotation{position:relative!important;min-height:31px!important;height:31px!important;max-height:31px!important;overflow:hidden!important;display:block!important;}
    .coco-join-rotation .coco-team-name-value,.coco-join-rotation .coco-team-join-prompt{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:0 4px!important;box-sizing:border-box!important;white-space:nowrap!important;overflow:hidden!important;transition:opacity .35s ease!important;pointer-events:none!important;}
    .coco-team-name-value{font-family:Impact,Haettenschweiler,"Arial Black",sans-serif!important;font-size:20px!important;font-weight:950!important;letter-spacing:1px!important;text-transform:uppercase!important;text-shadow:0 2px 0 rgba(0,0,0,.65),0 0 8px rgba(255,255,255,.25)!important;}
    .coco-team-join-prompt{font-family:Impact,Haettenschweiler,"Arial Black",sans-serif!important;font-size:8px!important;font-weight:900!important;letter-spacing:.2px!important;text-transform:uppercase!important;color:#fff!important;text-shadow:0 1px 0 #000,0 0 6px rgba(255,255,255,.25)!important;}
    .coco-team-join-prompt strong{margin:0 3px;font-size:1.1em;font-weight:1000;}
    .coco-visible{opacity:1!important}.coco-hidden{opacity:0!important}
    @media(max-width:520px){.coco-team-name-value{font-size:18px!important}.coco-team-join-prompt{font-size:7.5px!important}}
  `;
  document.head.appendChild(style);
}

function getTeams() {
  const config = commandConfigManager.refreshFromStorage() || {};
  const cfgTeams = Array.isArray(config.teams) ? config.teams.slice(0, 2) : [];
  const dash = dashboardAPI.getLiveDashboard?.() || {};
  const dashTeams = Array.isArray(dash?.game?.teams) ? dash.game.teams.slice(0, 2) : [];
  const source = dashTeams.length >= 2 ? dashTeams : cfgTeams;
  if (source.length < 2) return [];
  return source.map((team, index) => {
    const cfg = cfgTeams.find(t => String(t?.id) === String(team?.id)) || cfgTeams[index] || {};
    const name = String(team?.name || cfg?.name || (index === 0 ? "CHICOS" : "CHICAS")).trim();
    const commands = Array.isArray(team?.commands) ? team.commands : (Array.isArray(cfg?.commands) ? cfg.commands : []);
    const command = String(commands.find(Boolean) || (index === 0 ? "chicos" : "chicas")).trim();
    return { ...team, id: team?.id || cfg?.id || `team${index + 1}`, name, command };
  });
}

function update() {
  const root = document.querySelector(ROOT_SELECTOR);
  if (!root) return;
  const teams = getTeams();
  if (teams.length < 2) return;
  root.querySelectorAll(".gbo-team").forEach((card, index) => {
    const team = teams[index];
    const node = card.querySelector(".gbo-team-name");
    if (!node || !team) return;
    node.classList.add("coco-join-rotation");
    let name = node.querySelector(".coco-team-name-value");
    let prompt = node.querySelector(".coco-team-join-prompt");
    if (!name) { name = document.createElement("span"); name.className = "coco-team-name-value"; node.appendChild(name); }
    if (!prompt) { prompt = document.createElement("span"); prompt.className = "coco-team-join-prompt"; node.appendChild(prompt); }
    name.textContent = team.name.toUpperCase();
    prompt.innerHTML = `ESCRIBE <strong>${team.command}</strong> PARA UNIRTE A TU EQUIPO`;
  });
}

let showCommand = false;
function tick() {
  const root = document.querySelector(ROOT_SELECTOR);
  if (!root) return;
  update();
  root.querySelectorAll(".gbo-team-name").forEach(node => {
    const name = node.querySelector(".coco-team-name-value");
    const prompt = node.querySelector(".coco-team-join-prompt");
    if (!name || !prompt) return;
    name.classList.toggle("coco-visible", !showCommand);
    name.classList.toggle("coco-hidden", showCommand);
    prompt.classList.toggle("coco-visible", showCommand);
    prompt.classList.toggle("coco-hidden", !showCommand);
  });
  showCommand = !showCommand;
}

function start() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  installStyles();
  tick();
  window.setInterval(tick, 5200);
  dashboardAPI.subscribe(() => window.setTimeout(update, 0));
}

if (typeof window !== "undefined") window.setTimeout(start, 300);
