import type { PlayerAnswer } from "@/lib/game/types";

type WordBoxProps = {
  answer: PlayerAnswer;
  guessedComponents: Set<string>;
  fullyRevealed: boolean;
  showOnlyTone?: boolean;
};

function cellClass(revealed: boolean): string {
  if (revealed) {
    return "game-reveal-cell game-reveal-cell-revealed flex h-8 items-center justify-center rounded-lg border-[3px] border-primary/30 bg-surface text-text shadow-[0_2px_0_0_rgb(79_70_229/0.2)] transition-all duration-150";
  }
  return "game-reveal-cell flex h-8 items-center justify-center rounded-lg border-[3px] border-primary/10 bg-primary/5 text-primary/20 transition-all duration-150";
}

export function WordBox({
  answer,
  guessedComponents,
  fullyRevealed,
  showOnlyTone = false,
}: Readonly<WordBoxProps>) {
  return (
    <div className="space-y-3 rounded-2xl border-[3px] border-primary/20 bg-surface p-4 shadow-[0_4px_0_0_rgb(79_70_229/0.15)]">
      {answer.map((row, index) => {
        const toneKey = row.tone ?? "1";
        const topToneVisible =
          fullyRevealed || guessedComponents.has(row.topTone ?? "");
        const rightToneVisible =
          fullyRevealed || guessedComponents.has(toneKey);
        const initialVisible =
          fullyRevealed ||
          (!showOnlyTone &&
            (row.initial ? guessedComponents.has(row.initial) : false));
        const medialVisible =
          fullyRevealed ||
          (!showOnlyTone &&
            (row.medial ? guessedComponents.has(row.medial) : false));
        const finVisible =
          fullyRevealed ||
          (!showOnlyTone &&
            (row.final ? guessedComponents.has(row.final) : false));

        return (
          <div
            className="grid grid-cols-[1fr_7rem] gap-3"
            key={`${row.character}-${index}`}
          >
            <div className="flex h-24 items-center justify-center rounded-2xl border-[3px] border-primary/30 bg-surface text-3xl font-bold text-text shadow-[0_4px_0_0_rgb(79_70_229/0.2)]">
              {showOnlyTone && !fullyRevealed ? "?" : row.character}
            </div>

            <div className="grid grid-rows-[2rem_2rem_2rem_2rem] gap-1">
              <div className={cellClass(topToneVisible)}>
                {topToneVisible ? (
                  <span className="tone-glyph">{row.topTone ?? ""}</span>
                ) : (
                  "·"
                )}
              </div>
              <div className={cellClass(initialVisible)}>
                {initialVisible ? row.initial : "·"}
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div className={cellClass(medialVisible)}>
                  {medialVisible ? row.medial : "·"}
                </div>
                <div className={cellClass(rightToneVisible)}>
                  {rightToneVisible ? (
                    <span className="tone-glyph">{row.tone ?? ""}</span>
                  ) : (
                    "·"
                  )}
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
