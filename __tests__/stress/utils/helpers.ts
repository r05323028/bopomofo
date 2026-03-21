import {
  bopomofoFinals,
  bopomofoInitials,
  bopomofoMedials,
  bopomofoRightTones,
  bopomofoTopTones,
} from "@/lib/game/constants";
import type { BopomofoCell, PlayerAnswer } from "@/lib/game/types";

/**
 * 生成隨機玩家名稱
 */
export function generateRandomPlayerName(): string {
  const adjectives = [
    "快樂的",
    "勇敢的",
    "聰明的",
    "可愛的",
    "活潑的",
    "神秘的",
    "閃亮的",
    "強大的",
  ];
  const nouns = [
    "熊貓",
    "企鵝",
    "兔子",
    "狐狸",
    "貓咪",
    "狗狗",
    "鳥兒",
    "松鼠",
  ];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 1000);

  return `${adj}${noun}${number}`;
}

/**
 * 生成隨機注音符號格子
 */
export function generateRandomBopomofoCell(): BopomofoCell {
  const initial =
    Math.random() > 0.3
      ? (bopomofoInitials[
          Math.floor(Math.random() * bopomofoInitials.length)
        ] ?? null)
      : null;

  const medial =
    Math.random() > 0.5
      ? (bopomofoMedials[Math.floor(Math.random() * bopomofoMedials.length)] ??
        null)
      : null;

  const final =
    Math.random() > 0.3
      ? (bopomofoFinals[Math.floor(Math.random() * bopomofoFinals.length)] ??
        null)
      : null;

  const topTone =
    Math.random() > 0.8
      ? (bopomofoTopTones[
          Math.floor(Math.random() * bopomofoTopTones.length)
        ] ?? null)
      : null;

  const tone =
    Math.random() > 0.5
      ? (bopomofoRightTones[
          Math.floor(Math.random() * bopomofoRightTones.length)
        ] ?? null)
      : null;

  return {
    character: "測",
    initial,
    medial,
    final,
    topTone,
    tone,
  };
}

/**
 * 生成隨機玩家答案（注音符號陣列）
 */
export function generateRandomPlayerAnswer(wordCount: number): PlayerAnswer {
  return Array.from({ length: wordCount }, () => generateRandomBopomofoCell());
}

/**
 * 延遲函式（毫秒）
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 隨機選擇陣列元素
 */
export function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)] as T;
}

/**
 * 隨機布林值（給定機率）
 */
export function randomBoolean(probability = 0.5): boolean {
  return Math.random() < probability;
}

/**
 * 從注音符號陣列中提取所有符號（用於猜測）
 */
export function extractAllSymbols(answer: PlayerAnswer): string[] {
  const symbols = new Set<string>();

  for (const cell of answer) {
    if (cell.initial) {
      symbols.add(cell.initial);
    }
    if (cell.medial) {
      symbols.add(cell.medial);
    }
    if (cell.final) {
      symbols.add(cell.final);
    }
    if (cell.topTone) {
      symbols.add(cell.topTone);
    }
    if (cell.tone) {
      symbols.add(cell.tone);
    }
  }

  return Array.from(symbols);
}

/**
 * 將注音符號答案轉換為文字（用於猜測完整答案）
 */
export function answerToText(answer: PlayerAnswer): string {
  return answer.map((cell) => cell.character).join("");
}
