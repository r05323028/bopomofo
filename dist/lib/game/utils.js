"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createId = createId;
exports.normalizeWord = normalizeWord;
exports.isAnswerComplete = isAnswerComplete;
exports.sanitizeCell = sanitizeCell;
function createId(prefix) {
    const entropy = Math.random().toString(36).slice(2, 8);
    return `${prefix}_${Date.now().toString(36)}_${entropy}`;
}
function normalizeWord(cells) {
    return cells.map((cell) => cell.character.trim()).join("");
}
function isAnswerComplete(answer, wordCount) {
    if (answer.length !== wordCount) {
        return {
            valid: false,
            incompleteRows: Array.from({ length: wordCount }, (_, index) => index),
        };
    }
    const incompleteRows = answer.reduce((rows, cell, index) => {
        const charCount = Array.from(cell.character.trim()).length;
        if (charCount !== 1 || !cell.final) {
            rows.push(index);
        }
        return rows;
    }, []);
    return {
        valid: incompleteRows.length === 0,
        incompleteRows,
    };
}
function sanitizeCell(cell) {
    return {
        character: cell.character,
        initial: cell.initial,
        medial: cell.medial,
        final: cell.final,
        topTone: cell.topTone,
        tone: cell.tone,
    };
}
