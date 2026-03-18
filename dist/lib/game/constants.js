"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomCleanupIntervalMs = exports.roomTtlMs = exports.allGuessableSymbols = exports.bopomofoRightTones = exports.bopomofoTopTones = exports.bopomofoFinals = exports.bopomofoMedials = exports.bopomofoInitials = void 0;
exports.bopomofoInitials = [
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
];
exports.bopomofoMedials = ["ㄧ", "ㄨ", "ㄩ"];
exports.bopomofoFinals = [
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
];
exports.bopomofoTopTones = ["˙"];
exports.bopomofoRightTones = ["ˊ", "ˇ", "ˋ"];
exports.allGuessableSymbols = [
    ...exports.bopomofoInitials,
    ...exports.bopomofoMedials,
    ...exports.bopomofoFinals,
    ...exports.bopomofoTopTones,
    ...exports.bopomofoRightTones,
    "1",
];
exports.roomTtlMs = 2 * 60 * 60 * 1000;
exports.roomCleanupIntervalMs = 10 * 60 * 1000;
