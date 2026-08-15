export const GIFT_RULES_BY_MODE = {
  context: [
    { giftId: "rose", action: "Add points", value: 1, team: "All Teams", active: true },
    { giftId: "heart", action: "Add points", value: 5, team: "All Teams", active: true },
    { giftId: "coffee", action: "Give clue", value: 10, team: "All Teams", active: true },
    { giftId: "ice_cream", action: "Give clue", value: 50, team: "All Teams", active: true }
  ],
  vs_battle: [
    { giftId: "rose", action: "Add points", value: 1, team: "Equipo Rojo", active: true },
    { giftId: "heart", action: "Add points", value: 5, team: "Equipo Azul", active: true },
    { giftId: "ice_cream", action: "Special event", value: 100, team: "All Teams", active: true },
    { giftId: "dragon", action: "Special event", value: 1000, team: "All Teams", active: true }
  ],
  tournament: [
    { giftId: "gg", action: "Register player", value: 100, team: "All Teams", active: true },
    { giftId: "lion", action: "Bonus", value: 500, team: "All Teams", active: true },
    { giftId: "universe", action: "Special event", value: 5000, team: "All Teams", active: true }
  ]
};
