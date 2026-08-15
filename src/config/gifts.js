export const GIFT_CONFIG = {
  DEFAULT_POINTS_PER_DIAMOND: 1,
  GIFTS: {
    "Rose": {
      id: "rose",
      name: "Rose",
      diamondValue: 1,
      pointsMultiplier: 1,
      effect: "none",
      sound: null
    },
    "Ice Cream": {
      id: "ice_cream",
      name: "Ice Cream",
      diamondValue: 1,
      pointsMultiplier: 1,
      effect: "sparkle",
      sound: "pop"
    },
    "Donut": {
      id: "donut",
      name: "Donut",
      diamondValue: 30,
      pointsMultiplier: 1,
      effect: "bounce",
      sound: "sweet"
    },
    "Cowboy Hat": {
      id: "cowboy_hat",
      name: "Cowboy Hat",
      diamondValue: 50,
      pointsMultiplier: 1,
      effect: "sparkle",
      sound: "country"
    },
    "Money Gun": {
      id: "money_gun",
      name: "Money Gun",
      diamondValue: 500,
      pointsMultiplier: 1.2,
      effect: "explosion",
      sound: "cash"
    },
    "Galaxy": {
      id: "galaxy",
      name: "Galaxy",
      diamondValue: 1000,
      pointsMultiplier: 1.5,
      effect: "explosion",
      sound: "epic"
    }
  }
};

export function getGiftConfig(giftName) {
  if (!giftName) return null;
  return GIFT_CONFIG.GIFTS[giftName] || {
    id: giftName.toLowerCase().replace(/\s+/g, '_'),
    name: giftName,
    diamondValue: 1,
    pointsMultiplier: 1,
    effect: "standard",
    sound: null
  };
}
