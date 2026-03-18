import type { BopomofoCell, PlayerAnswer } from "./types";

export function createId(prefix: string): string {
  const entropy = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${entropy}`;
}

export function normalizeWord(cells: PlayerAnswer): string {
  return cells.map((cell) => cell.character.trim()).join("");
}

export function isAnswerComplete(
  answer: PlayerAnswer,
  wordCount: number,
): { valid: boolean; incompleteRows: number[] } {
  if (answer.length !== wordCount) {
    return {
      valid: false,
      incompleteRows: Array.from({ length: wordCount }, (_, index) => index),
    };
  }

  const incompleteRows = answer.reduce<number[]>((rows, cell, index) => {
    const charCount = Array.from(cell.character.trim()).length;
    if (charCount !== 1) {
      rows.push(index);
    }
    return rows;
  }, []);

  return {
    valid: incompleteRows.length === 0,
    incompleteRows,
  };
}

export function sanitizeCell(cell: BopomofoCell): BopomofoCell {
  return {
    character: cell.character,
    initial: cell.initial,
    medial: cell.medial,
    final: cell.final,
    topTone: cell.topTone,
    tone: cell.tone,
  };
}
