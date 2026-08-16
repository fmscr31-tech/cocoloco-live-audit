import React, { useState } from "react";
import { resolveCanonicalGiftId } from "../../config/canonicalGifts";
import "../overlay/cocazo.css";

/**
 * GiftImage Component v1
 * Renders official TikTok Gift image with proportional scaling (`object-fit: contain`)
 * and a graceful fallback to emoji/icon if the image fails to load or is not defined.
 */
export function GiftImage({ giftId, giftName, fallbackIcon = "🎁", style = {}, className = "" }) {
  const [hasError, setHasError] = useState(false);

  const canonical = resolveCanonicalGiftId(giftId || giftName);
  const imageSrc = canonical?.image || (typeof giftId === "string" && giftId.startsWith("/") ? giftId : null);

  if (!imageSrc || hasError) {
    return (
      <span className={className} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", ...style }}>
        {canonical?.display?.icon || fallbackIcon}
      </span>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={canonical?.displayName || giftName || "Gift"}
      onError={() => setHasError(true)}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        display: "inline-block",
        verticalAlign: "middle",
        ...style
      }}
    />
  );
}
