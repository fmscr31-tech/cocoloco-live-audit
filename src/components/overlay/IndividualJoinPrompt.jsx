import { useEffect, useState } from "react";
import { dashboardAPI } from "../../core/dashboardAPI";

const readEnrollment = (dashboard) => {
  const registration = dashboard?.registration || {};
  const config = dashboard?.registrationConfig || dashboard?.commandConfig || dashboard?.game?.registration || {};
  const command = String(
    registration.command || registration.joinCommand || registration.entryCommand ||
    config.command || config.joinCommand || config.entryCommand || ""
  ).trim();
  const giftName = String(
    registration.giftName || registration.entryGift || registration.registrationGift ||
    config.giftName || config.entryGift || config.registrationGift || ""
  ).trim();
  const imageUrl = registration.giftImageUrl || registration.imageUrl || config.giftImageUrl || config.imageUrl || "";
  const image = imageUrl || (giftName ? `/gifts/${giftName}.webp` : "");
  const method = command ? "command" : giftName ? "gift" : "command";
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
    const timer = setInterval(refresh, 2500);
    return () => {
      unsubscribe?.();
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setShow(value => !value), 4500);
    return () => clearInterval(id);
  }, []);

  if (!enrollment.command && !enrollment.giftName) return null;

  const isCommand = enrollment.method === "command";
  return (
    <div style={{
      position: "absolute",
      top: "-34px",
      right: "0",
      zIndex: 80,
      width: "118px",
      minHeight: "24px",
      padding: "4px 7px",
      boxSizing: "border-box",
      borderRadius: "7px",
      background: "linear-gradient(135deg,rgba(255,255,255,.97),rgba(255,245,210,.96))",
      border: "1.5px solid rgba(16,42,67,.72)",
      boxShadow: "0 3px 10px rgba(0,0,0,.34),0 0 8px rgba(255,209,102,.28)",
      textAlign: "center",
      transform: show ? "translateY(0)" : "translateY(-1px)",
      opacity: show ? 1 : .82,
      transition: "all .45s ease"
    }}>
      <div style={{ fontSize: "6.5px", lineHeight: 1.15, fontWeight: 900, color: "#111827", textTransform: "uppercase", letterSpacing: ".35px" }}>
        {isCommand ? "✍️ ESCRIBE PARA UNIRTE" : "🎁 ENVÍA PARA UNIRTE"}
      </div>
      {isCommand ? (
        <div style={{ marginTop: "2px", fontSize: "9px", lineHeight: 1.05, fontWeight: 1000, color: "#075985", background: "#e0f2fe", border: "1px solid #38bdf8", borderRadius: "4px", padding: "2px 4px", textTransform: "uppercase", letterSpacing: ".4px", textShadow: "none" }}>
          {enrollment.command}
        </div>
      ) : (
        <div style={{ marginTop: "2px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
          {enrollment.image ? <img src={enrollment.image} alt="" style={{ width: "18px", height: "18px", objectFit: "contain" }} /> : <span style={{ fontSize: "13px" }}>🎁</span>}
          <span style={{ fontSize: "7.5px", lineHeight: 1.05, fontWeight: 1000, color: "#a21caf", textTransform: "uppercase" }}>{enrollment.giftName}</span>
        </div>
      )}
    </div>
  );
}
