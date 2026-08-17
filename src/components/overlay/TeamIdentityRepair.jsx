import { useEffect } from "react";
import { commandConfigManager } from "../../core/commandConfigManager";
import { dashboardAPI } from "../../core/dashboardAPI";

export function TeamIdentityRepair() {
  useEffect(() => {
    let command = false;
    const fix = () => {
      const c = commandConfigManager.getConfig?.() || {};
      const d = dashboardAPI.getLiveDashboard?.() || dashboardAPI.getState?.() || {};
      const m = String(d.gameMode || d.gameRegistrationMode || c.gameRegistrationMode || "").toUpperCase();
      const gender = m.includes("GENDER") || m.includes("CHICOS") || m.includes("CHICAS");
      const teams = Array.isArray(c.teams) ? c.teams : [];
      document.querySelectorAll(".scoreboard > .team-wrapper").forEach((w,i) => {
        if(i>1) return;
        const n=w.querySelector(".team-card .team-name"), card=w.querySelector(".team-card"); if(!n||!card)return;
        const t=teams[i]||{};
        const name=gender?(i===0?"CHICOS":"CHICAS"):String(t.name||(i===0?"EQUIPO 1":"EQUIPO 2")).toUpperCase();
        const cmd=gender?(i===0?"CHICO":"CHICA"):String((Array.isArray(t.commands)&&t.commands[0])||t.command||"").trim().toUpperCase();
        if(["punished","damaged","donut-active","cowboy-active","galaxy-active"].some(x=>card.classList.contains(x)))return;
        w.classList.toggle("gender-boys",gender&&i===0); w.classList.toggle("gender-girls",gender&&i===1);
        n.textContent=command&&cmd?`ESCRIBE ${cmd} PARA UNIRTE`:name;
        n.style.setProperty("display","flex","important"); n.style.setProperty("visibility","visible","important"); n.style.setProperty("opacity","1","important"); n.style.setProperty("z-index","300","important"); n.style.setProperty("position","relative","important"); n.style.setProperty("justify-content","center","important"); n.style.setProperty("align-items","center","important");
        if(command&&cmd){n.style.setProperty("background","rgba(255,255,255,.97)","important");n.style.setProperty("color","#050505","important");n.style.setProperty("border",`2px solid ${gender?(i===0?"#4ed2ff":"#ff6ab5"):"#333"}`,"important");n.style.setProperty("border-radius","6px","important");n.style.setProperty("padding","3px 8px","important");n.style.setProperty("font-size","8.5px","important");}else{n.style.setProperty("background","transparent","important");n.style.setProperty("border","0","important");n.style.setProperty("padding","0","important");n.style.setProperty("font-size","16px","important");n.style.setProperty("font-weight","950","important");n.style.setProperty("color",gender?(i===0?"#8feaff":"#ff4fa6"):"#fff","important");}
      });
    };
    fix(); const a=setInterval(fix,250), b=setInterval(()=>{command=!command;fix()},4000); const o=new MutationObserver(fix); o.observe(document.body,{childList:true,subtree:true}); return()=>{clearInterval(a);clearInterval(b);o.disconnect()};
  },[]); return null;
}
