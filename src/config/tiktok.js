const STORAGE_KEY_TIKTOK_USERNAME = 'cocoloco_tiktok_username';

export const TIKTOK_CONFIG = {
  username: localStorage.getItem(STORAGE_KEY_TIKTOK_USERNAME) || "cocolococr",
  mode: "REAL_TIKTOK", // "MOCK_TIKTOK" or "REAL_TIKTOK"
  proxyUrl: "ws://localhost:8080" // Optional WebSocket bridge for real TikTok connection
};

export const tiktokConfig = {
  getSavedUsername: () => {
    return localStorage.getItem(STORAGE_KEY_TIKTOK_USERNAME) || TIKTOK_CONFIG.username;
  },
  saveUsername: (username) => {
    if (username) {
      localStorage.setItem(STORAGE_KEY_TIKTOK_USERNAME, username.trim());
      TIKTOK_CONFIG.username = username.trim();
    }
  }
};
