import { useEffect, useState } from "react";
import { dashboardAPI } from "../../core/dashboardAPI";
import { commandConfigManager } from "../../core/commandConfigManager";

const readEnrollment = (dashboard) => {
  const registration = dashboard?.registration || {};
  const config = dashboard?.registrationConfig || dashboard?.commandConfig || dashboard?.game?.registration || commandConfigManager.getConfig?.() || {};
  const command = String(registration.command || registration.joinCommand || registration.entryCommand || config.individualCommand || config.command || config.joinCommand || config.entryCommand || "").trim();
  const giftName = String(registration.giftName || registration.entryGift || registration.registrationGift || config.individualRegistrationGift || config.individualGiftName || config.giftName || config.entryGift || "").trim();
  const imageUrl = registration.giftImageUrl || registration.imageUrl || config.individualRegistrationGiftImage || config.giftImageUrl || config.imageUrl || "";
  const giftAsset = String(config.individualRegistrationGiftAsset || "").trim();
  const image = imageUrl || (giftAsset ? (giftAsset.startsWith("/") ? giftAsset : `/gifts/${giftAsset}`) : giftName ? `/gifts/${giftName}.gif` : "");
  const method = String(config.individualRegistrationMethod || registration.method || (giftName ? "gift" : "command")).toLowerCase() === "gift" ? "gift" : "command";
  return { command, giftName, image, method };
};

export function IndividualJoinPrompt() {
  const [enrollment, setEnrollment] = useState(() => readEnrollment({}));
  const [show, setShow] = useState(true);

  useEffect(() => {
    const apply = (dashboard) => setEnrollment(readEnrollment(dashboard));
    const unsubscribe = dashboardAPI.subscribe?.(apply);
    const refresh = () => apply(dashboardAPI.getState?.() || dashboardAPI.getDashboard?.() || {});
    refresh();
    const interval = setInterval(refresh, 1500);
    window.addEventListener("storage", refresh);
    return () => {
      unsubscribe?.();
      clearInterval(interval);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setShow((value) => !value), 4500);
    return () => clearInterval(id);
  }, []);

  if (!enrollment.command && !enrollment.giftName) return null;
  const isCommand = enrollment.method === "command";

  return (
    <div
      style={{
        position: "absolute",
        top: "-42px",
        left: "calc(50% + 18px)",
        right: "auto",
        zIndex: 90,
        width: "184px",
        minHeight: "34px",
        padding: "5px 9px",
        boxSizing: "border-box",
        borderRadius: "8px",
        background: "linear-gradient(135deg,rgba(255,255,255,.98),rgba(255,245,210,.97))",
        border: "2px solid rgba(16,42,67,.78)",
        boxShadow: "0 3px 12px rgba(0,0,0,.38),0 0 10px rgba(255,209,102,.32)",
        textAlign: "center",
        transform: show ? "translate(-50%,0)" : "translate(-50%,-1px)",
        opacity: show ? 1 : 0.86,
        transition: "all .45s ease"
      }}
    >
      <div style={{ fontSize: "7px", lineHeight: 1.1, fontWeight: 1000, color: "#111827", textTransform: "uppercase", letterSpacing: ".35px" }}>
        {isCommand ? "INSCRÍBETE ESCRIBIENDO EN EL CHAT" : "ÚNETE CON"}
      </div>
      {isCommand ? (
        <div style={{ marginTop: "3px", fontSize: "12px", lineHeight: 1.05, fontWeight: 1000, color: "#ffffff", background: "#111111", border: "1px solid #000000", borderRadius: "5px", padding: "3px 8px", textTransform: "uppercase", letterSpacing: ".7px", textShadow: "none", boxShadow: "0 1px 0 #fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {enrollment.command}
        </div>
      ) : (
        <div style={{ marginTop: "3px", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
          {enrollment.image ? <img src={enrollment.image} alt={enrollment.giftName || "Regalo"} style={{ width: "22px", height: "22px", objectFit: "contain" }} /> : <span style={{ fontSize: "15px" }}>🎁</span>}
          <span style={{ fontSize: "8px", lineHeight: 1.05, fontWeight: 1000, color: "#a21caf", textTransform: "uppercase" }}>{enrollment.giftName || "REGALO"}</span>
        </div>
      )}
    </div>
  );
}
