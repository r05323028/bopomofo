import type { PlayerAnswer } from "@/lib/game/types";

type WordBoxProps = {
  answer: PlayerAnswer;
  guessedComponents: Set<string>;
  fullyRevealed: boolean;
  showOnlyTone?: boolean;
};

function cellClass(revealed: boolean): string {
  if (revealed) {
    return "flex h-8 items-center justify-center rounded border border-zinc-300 bg-white text-zinc-900";
  }
  return "flex h-8 items-center justify-center rounded border border-zinc-200 bg-zinc-100 text-zinc-100";
}

export function WordBox({
  answer,
  guessedComponents,
  fullyRevealed,
  showOnlyTone = false,
}: Readonly<WordBoxProps>) {
  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
      {answer.map((row, index) => {
        const toneKey = row.tone ?? "1";
        const topToneVisible =
          fullyRevealed || guessedComponents.has(row.topTone ?? "");
        const rightToneVisible =
          fullyRevealed || guessedComponents.has(toneKey);
        const initialVisible =
          (showOnlyTone ? false : fullyRevealed) ||
          (row.initial ? guessedComponents.has(row.initial) : false);
        const medialVisible =
          (showOnlyTone ? false : fullyRevealed) ||
          (row.medial ? guessedComponents.has(row.medial) : false);
        const finVisible =
          (showOnlyTone ? false : fullyRevealed) ||
          (row.final ? guessedComponents.has(row.final) : false);

        return (
          <div
            className="grid grid-cols-[1fr_7rem] gap-3"
            key={`${row.character}-${index}`}
          >
            <div className="flex h-24 items-center justify-center rounded-lg border border-zinc-300 bg-white text-3xl font-bold text-zinc-900">
              {showOnlyTone ? "?" : row.character}
            </div>

            <div className="grid grid-rows-[2rem_2rem_2rem_2rem] gap-1">
              <div className={cellClass(topToneVisible)}>
                {topToneVisible ? (row.topTone ?? "") : "·"}
              </div>
              <div className={cellClass(initialVisible)}>
                {initialVisible ? row.initial : "·"}
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div className={cellClass(medialVisible)}>
                  {medialVisible ? row.medial : "·"}
                </div>
                <div className={cellClass(rightToneVisible)}>
                  {rightToneVisible ? (row.tone ?? "") : "·"}
                </div>
              </div>
              <div className={cellClass(finVisible)}>
                {finVisible ? row.final : "·"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
