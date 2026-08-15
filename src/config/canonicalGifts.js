import iceCreamImg from "../assets/Ice Cream Cone.webp";
import doughnutImg from "../assets/Doughnut.webp";
import hatImg from "../assets/Hat and Mustache.webp";
import starImg from "../assets/Twinkling Star.webp";
import coconutImg from "../assets/Coconut.webp";
import goPopularImg from "../assets/Go Popular.webp";
import ampedImg from "../assets/Amped Up.webp";
import moneyGunImg from "../assets/Money Gun.webp";
import galaxyImg from "../assets/Galaxy.webp";

/**
 * Canonical Gift Registry v3 — Official TikTok .webp Gift Asset Integration
 * Single source of truth for official CocoLoco Live Manager supported gifts,
 * mapping exact .webp filenames via direct ES module imports for guaranteed bundling.
 */
export const CANONICAL_GIFTS = {
  ice_cream: {
    canonicalId: "ice_cream",
    displayName: "Ice Cream Cone 🍦",
    aliases: ["ice cream", "ice_cream", "helado", "cono", "heladito", "5827"],
    defaultPoints: 50,
    action: "Give clue",
    sound: "pop",
    animation: "none",
    abilityId: null,
    supported: true,
    image: iceCreamImg,
    display: { icon: "🍦", name: "Ice Cream" }
  },
  quiereme: {
    canonicalId: "quiereme",
    displayName: "Quiéreme ❤️",
    aliases: ["quiereme", "quiéreme"],
    defaultPoints: 10,
    action: "Add points",
    value: 10,
    sound: "/Sounds/Quiereme.mp3",
    animation: "none",
    abilityId: null,
    supported: true,
    image: null,
    display: { icon: "❤️", name: "Quiéreme" }
  },
  doughnut: {
    canonicalId: "doughnut",
    displayName: "Doughnut 🍩",
    aliases: ["donut", "doughnut", "donuts", "donas", "rosquilla"],
    defaultPoints: 30,
    action: "Special event",
    sound: "/mudo.mp3",
    animation: "silent_challenge",
    abilityId: "silent_challenge",
    supported: true,
    image: doughnutImg,
    display: { icon: "🍩", name: "Donut" }
  },
  hat_and_mustache: {
    canonicalId: "hat_and_mustache",
    displayName: "Hat and Mustache 🤠",
    aliases: ["sombrero", "hat", "hat and mustache", "sombrero y bigote"],
    defaultPoints: 99,
    action: "Add points",
    value: 5,
    sound: "/Sounds/Sombrero Vaquero.mp3",
    animation: "creative_challenge",
    abilityId: "creative_challenge",
    supported: true,
    image: hatImg,
    display: { icon: "🤠", name: "Hat and Mustache" }
  },
  twinkling_star: {
    canonicalId: "twinkling_star",
    displayName: "Twinkling Star ⭐",
    aliases: ["twinkling star", "star", "estrella"],
    defaultPoints: 199,
    action: "Special event",
    sound: null,
    animation: "freeze",
    abilityId: "freeze",
    supported: true,
    image: starImg,
    display: { icon: "⭐", name: "Twinkling Star" }
  },
  coconut: {
    canonicalId: "coconut",
    displayName: "Coconut 🥥",
    aliases: ["coconut", "coco"],
    defaultPoints: 199,
    action: "Special event",
    sound: null,
    animation: "freeze",
    abilityId: "freeze",
    supported: true,
    image: coconutImg,
    display: { icon: "🥥", name: "Coconut" }
  },
  go_popular: {
    canonicalId: "go_popular",
    displayName: "Go Popular 🥥",
    aliases: ["go popular", "go_popular", "cocazo", "cocazos", "popular"],
    defaultPoints: 100,
    action: "Cocazo event",
    sound: "/Sounds/coconut-sfx.mp3",
    animation: "cocazo",
    abilityId: "cocazo",
    supported: true,
    image: goPopularImg,
    display: { icon: "🥥", name: "Go Popular" }
  },
  amped_up: {
    canonicalId: "amped_up",
    displayName: "Amped Up 😱",
    aliases: ["amped up", "amped_up", "a todo volumen"],
    defaultPoints: 249,
    action: "Special event",
    sound: null,
    animation: "susto_coco",
    abilityId: "susto_coco",
    supported: true,
    image: ampedImg,
    display: { icon: "😱", name: "Amped Up" }
  },
  money_gun: {
    canonicalId: "money_gun",
    displayName: "Money Gun 💵",
    aliases: ["money gun", "pistola de dinero"],
    defaultPoints: 500,
    action: "Special event",
    sound: "/Sounds/Reinicio.mp3",
    animation: "epic_impact",
    abilityId: "epic_impact",
    supported: true,
    image: moneyGunImg,
    display: { icon: "💥", name: "Money Gun" }
  },
  galaxy: {
    canonicalId: "galaxy",
    displayName: "Galaxy 🌌",
    aliases: ["galaxy", "galaxia"],
    defaultPoints: 1000,
    action: "Special event",
    sound: "/Sounds/Kamehameha.mp3",
    animation: "ultimate_galaxy",
    abilityId: "ultimate_galaxy",
    supported: true,
    image: galaxyImg,
    display: { icon: "🌌", name: "Galaxy" }
  },
  rose: {
    canonicalId: "rose",
    displayName: "Rose 🌹",
    aliases: ["rose", "rosa"],
    defaultPoints: 1,
    action: "Add points",
    value: 1,
    sound: null,
    animation: "none",
    abilityId: null,
    supported: true,
    image: null,
    display: { icon: "🌹", name: "Rose" }
  },
  lion: {
    canonicalId: "lion",
    displayName: "Lion 🦁",
    aliases: ["lion", "león"],
    defaultPoints: 500,
    action: "Add points",
    value: 500,
    sound: "epic",
    animation: "none",
    abilityId: null,
    supported: true,
    image: null,
    display: { icon: "🦁", name: "Lion" }
  },
  universe: {
    canonicalId: "universe",
    displayName: "TikTok Universe 🌌",
    aliases: ["tiktok universe", "universe", "universo"],
    defaultPoints: 5000,
    action: "Special event",
    sound: "epic",
    animation: "none",
    abilityId: null,
    supported: true,
    image: null,
    display: { icon: "🌌", name: "TikTok Universe" }
  }
};

/**
 * Deterministically resolves any raw gift name/ID/alias to its canonical gift object.
 * @param {string|Object} input - Raw gift identifier, name, or object { giftId, giftName, rawInput }
 * @returns {Object|null} Canonical gift object or null if unknown
 */
export function resolveCanonicalGiftId(input) {
  if (!input) return null;

  let giftId = null;
  let giftName = null;
  let rawInput = null;

  if (typeof input === "object") {
    giftId = input.giftId ? String(input.giftId).trim().toLowerCase() : null;
    giftName = input.giftName ? String(input.giftName).trim().toLowerCase() : null;
    rawInput = input.rawInput ? String(input.rawInput).trim().toLowerCase() : null;
  } else {
    rawInput = String(input).trim().toLowerCase();
  }

  // 1. Try matching by giftName first if valid (not numeric)
  const nameToTest = giftName || (!rawInput || /^\d+$/.test(rawInput) ? null : rawInput);
  if (nameToTest && !/^\d+$/.test(nameToTest)) {
    const cleanName = nameToTest
      .replace(/[^\w\sáéíóúüñ]/gi, ' ')
      .replace(/x\d+/gi, '')
      .trim();

    for (const [canonicalId, gift] of Object.entries(CANONICAL_GIFTS)) {
      if (canonicalId === cleanName || gift.aliases.some(alias => cleanName === alias || cleanName.includes(alias) || alias.includes(cleanName))) {
        return gift;
      }
    }
  }

  // 2. Try matching by giftId if present
  if (giftId) {
    for (const [canonicalId, gift] of Object.entries(CANONICAL_GIFTS)) {
      if (gift.tiktokGiftId && gift.tiktokGiftId.toLowerCase() === giftId) {
        return gift;
      }
    }
  }

  // 3. Fallback to rawInput if not a number
  if (rawInput && !/^\d+$/.test(rawInput)) {
    const cleanRaw = rawInput
      .replace(/[^\w\sáéíóúüñ]/gi, ' ')
      .replace(/x\d+/gi, '')
      .trim();
    for (const [canonicalId, gift] of Object.entries(CANONICAL_GIFTS)) {
      if (canonicalId === cleanRaw || gift.aliases.some(alias => cleanRaw === alias || cleanRaw.includes(alias) || alias.includes(cleanRaw))) {
        return gift;
      }
    }
  }

  return null;
}
