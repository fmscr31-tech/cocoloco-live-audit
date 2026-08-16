import iceCreamImg from "../assets/Ice Cream Cone.webp";
import doughnutImg from "../assets/Doughnut.webp";
import hatImg from "../assets/Hat and Mustache.webp";
import starImg from "../assets/Twinkling Star.webp";
import coconutImg from "../assets/Coconut.webp";
import goPopularImg from "../assets/Go Popular.webp";
import ampedImg from "../assets/Amped Up.webp";
import moneyGunImg from "../assets/Money Gun.webp";
import galaxyImg from "../assets/Galaxy.webp";

export const CANONICAL_GIFTS = {
  ice_cream: {
    canonicalId: "ice_cream", displayName: "Ice Cream Cone 🍦",
    aliases: ["ice cream", "ice_cream", "helado", "cono", "heladito", "5827"],
    defaultPoints: 0, action: "Give clue", sound: "pop", animation: "none", abilityId: null, supported: true, image: iceCreamImg,
    display: { icon: "🍦", name: "Ice Cream" }
  },
  quiereme: {
    canonicalId: "quiereme", displayName: "Quiéreme ❤️", aliases: ["quiereme", "quiéreme"], defaultPoints: 10,
    action: "Add points", value: 10, sound: "/Sounds/Quiereme.mp3", animation: "none", abilityId: null, supported: true, image: null,
    display: { icon: "❤️", name: "Quiéreme" }
  },
  doughnut: {
    canonicalId: "doughnut", displayName: "Doughnut 🍩", aliases: ["donut", "doughnut", "donuts", "donas", "rosquilla"],
    defaultPoints: 1, value: 1, action: "Add points", sound: "/mudo.mp3", animation: "silent_challenge", abilityId: "silent_challenge", supported: true, image: doughnutImg,
    display: { icon: "🍩", name: "Donut" }
  },
  hat_and_mustache: {
    canonicalId: "hat_and_mustache", displayName: "Hat and Mustache 🤠", aliases: ["sombrero", "hat", "hat and mustache", "sombrero y bigote"],
    defaultPoints: 5, value: 5, action: "Add points", sound: "/Sounds/Sombrero Vaquero.mp3", animation: "creative_challenge", abilityId: "creative_challenge", supported: true, image: hatImg,
    display: { icon: "🤠", name: "Hat and Mustache" }
  },
  twinkling_star: {
    canonicalId: "twinkling_star", displayName: "Twinkling Star ⭐", aliases: ["twinkling star", "star", "estrella"], defaultPoints: 0,
    action: "Special event", sound: null, animation: "freeze", abilityId: "freeze", supported: true, image: starImg,
    display: { icon: "⭐", name: "Twinkling Star" }
  },
  coconut: {
    canonicalId: "coconut", displayName: "Coconut 🥥", aliases: ["coconut", "coco"], defaultPoints: 0,
    action: "Special event", sound: null, animation: "freeze", abilityId: "freeze", supported: true, image: coconutImg,
    display: { icon: "🥥", name: "Coconut" }
  },
  go_popular: {
    canonicalId: "go_popular", displayName: "Go Popular 🥥", aliases: ["go popular", "go_popular", "cocazo", "cocazos", "popular"], defaultPoints: 0,
    action: "Cocazo event", sound: "/Sounds/coconut-sfx.mp3", animation: "cocazo", abilityId: "cocazo", supported: true, image: goPopularImg,
    display: { icon: "🥥", name: "Go Popular" }
  },
  amped_up: {
    canonicalId: "amped_up", displayName: "Amped Up 😱", aliases: ["amped up", "amped_up", "a todo volumen"], defaultPoints: 0,
    action: "Special event", sound: "/Sounds/Grito feo.mp3", animation: "susto_coco", abilityId: "susto_coco", supported: true, image: ampedImg,
    display: { icon: "😱", name: "Amped Up" }
  },
  money_gun: {
    canonicalId: "money_gun", displayName: "Money Gun 💵", aliases: ["money gun", "pistola de dinero"], defaultPoints: 0,
    action: "Special event", sound: "/Sounds/Reinicio.mp3", animation: "epic_impact", abilityId: "epic_impact", supported: true, image: moneyGunImg,
    display: { icon: "💥", name: "Money Gun" }
  },
  galaxy: {
    canonicalId: "galaxy", displayName: "Galaxy 🌌", aliases: ["galaxy", "galaxia"], defaultPoints: 0,
    action: "Special event", sound: "/Sounds/Kamehameha.mp3", animation: "ultimate_galaxy", abilityId: "ultimate_galaxy", supported: true, image: galaxyImg,
    display: { icon: "🌌", name: "Galaxy" }
  },
  rose: {
    canonicalId: "rose", displayName: "Rose 🌹", aliases: ["rose", "rosa"], defaultPoints: 1, value: 1, action: "Add points", sound: null, animation: "none", abilityId: null, supported: true, image: null,
    display: { icon: "🌹", name: "Rose" }
  },
  lion: {
    canonicalId: "lion", displayName: "Lion 🦁", aliases: ["lion", "león"], defaultPoints: 500, value: 500, action: "Add points", sound: "epic", animation: "none", abilityId: null, supported: true, image: null,
    display: { icon: "🦁", name: "Lion" }
  },
  universe: {
    canonicalId: "universe", displayName: "TikTok Universe 🌌", aliases: ["tiktok universe", "universe", "universo"], defaultPoints: 5000, value: 5000, action: "Add points", sound: "epic", animation: "none", abilityId: null, supported: true, image: null,
    display: { icon: "🌌", name: "TikTok Universe" }
  }
};

export function resolveCanonicalGiftId(input) {
  if (!input) return null;
  let giftId = null, giftName = null, rawInput = null;
  if (typeof input === "object") {
    giftId = input.giftId ? String(input.giftId).trim().toLowerCase() : null;
    giftName = input.giftName ? String(input.giftName).trim().toLowerCase() : null;
    rawInput = input.rawInput ? String(input.rawInput).trim().toLowerCase() : null;
  } else rawInput = String(input).trim().toLowerCase();

  const matchText = (text) => {
    if (!text || /^\d+$/.test(text)) return null;
    const clean = text.replace(/[^\w\sáéíóúüñ]/gi, " ").replace(/x\d+/gi, "").trim();
    for (const gift of Object.values(CANONICAL_GIFTS)) {
      if (gift.canonicalId === clean || gift.aliases.some(alias => clean === alias || clean.includes(alias) || alias.includes(clean))) return gift;
    }
    return null;
  };

  // Names/aliases are authoritative for operator-facing gift identity.
  const byName = matchText(giftName) || matchText(rawInput);
  if (byName) return byName;

  // Numeric TikTok IDs are supported when explicitly registered on the canonical record.
  if (giftId) {
    for (const gift of Object.values(CANONICAL_GIFTS)) {
      if (gift.tiktokGiftId && String(gift.tiktokGiftId).toLowerCase() === giftId) return gift;
      if (gift.aliases.some(alias => String(alias).toLowerCase() === giftId)) return gift;
    }
  }
  return null;
}
