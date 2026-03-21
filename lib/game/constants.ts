export const bopomofoInitials = [
  "ㄅ",
  "ㄆ",
  "ㄇ",
  "ㄈ",
  "ㄉ",
  "ㄊ",
  "ㄋ",
  "ㄌ",
  "ㄍ",
  "ㄎ",
  "ㄏ",
  "ㄐ",
  "ㄑ",
  "ㄒ",
  "ㄓ",
  "ㄔ",
  "ㄕ",
  "ㄖ",
  "ㄗ",
  "ㄘ",
  "ㄙ",
] as const;

export const bopomofoMedials = ["ㄧ", "ㄨ", "ㄩ"] as const;

export const bopomofoFinals = [
  "ㄚ",
  "ㄛ",
  "ㄜ",
  "ㄝ",
  "ㄞ",
  "ㄟ",
  "ㄠ",
  "ㄡ",
  "ㄢ",
  "ㄣ",
  "ㄤ",
  "ㄥ",
  "ㄦ",
] as const;

export const bopomofoTopTones = ["˙"] as const;
export const bopomofoRightTones = ["ˊ", "ˇ", "ˋ"] as const;

export const allGuessableSymbols = [
  ...bopomofoInitials,
  ...bopomofoMedials,
  ...bopomofoFinals,
  ...bopomofoTopTones,
  ...bopomofoRightTones,
  "1",
] as const;

export const roomTtlMs = 2 * 60 * 60 * 1000;
export const roomCleanupIntervalMs = 10 * 60 * 1000;
export const reconnectGraceMs = 30 * 1000;
