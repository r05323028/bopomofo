"use client";

import { useMemo, useState } from "react";

import { BopomofoPicker } from "@/components/BopomofoPicker";
import type { BopomofoCell, PlayerAnswer } from "@/lib/game/types";

type SlotType = "initial" | "medial" | "final" | "topTone" | "tone";

type ActivePicker = {
  rowIndex: number;
  slot: SlotType;
};

type WordInputProps = {
  wordCount: number;
  value: PlayerAnswer;
  onChange: (value: PlayerAnswer) => void;
};

function createRows(count: number): PlayerAnswer {
  return Array.from({ length: count }, () => ({
    character: "",
    initial: null,
    medial: null,
    final: null,
    topTone: null,
    tone: null,
  }));
}

export function WordInput({
  wordCount,
  value,
  onChange,
}: Readonly<WordInputProps>) {
  const [activePicker, setActivePicker] = useState<ActivePicker | null>(null);
  const rowKeys = useMemo(
    () =>
      Array.from(
        { length: wordCount },
        (_, index) => `row-${wordCount}-${index + 1}`,
      ),
    [wordCount],
  );

  const rows = useMemo(() => {
    if (value.length === wordCount) {
      return value;
    }
    return createRows(wordCount);
  }, [value, wordCount]);

  const updateRow = (index: number, patch: Partial<BopomofoCell>) => {
    const next = rows.map((row, rowIndex) => {
      if (rowIndex !== index) {
        return row;
      }
      return {
        ...row,
        ...patch,
      };
    });
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div
          className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_7rem] sm:gap-3"
          key={rowKeys[index]}
        >
          <input
            className="h-20 rounded-lg border border-zinc-300 bg-white px-4 text-center text-3xl font-bold text-zinc-900 sm:h-24 sm:text-4xl"
            onChange={(event) => {
              updateRow(index, { character: event.target.value });
            }}
            placeholder="字"
            value={row.character}
          />

          <div className="grid grid-rows-[2rem_2rem_2rem_2rem] gap-1 sm:w-28">
            <button
              className="rounded border border-zinc-300 bg-white text-sm text-zinc-900"
              onClick={() =>
                setActivePicker({ rowIndex: index, slot: "topTone" })
              }
              type="button"
            >
              {row.topTone ? (
                <span className="tone-glyph">{row.topTone}</span>
              ) : (
                "上調"
              )}
            </button>
            <button
              className="rounded border border-zinc-300 bg-white text-sm text-zinc-900"
              onClick={() =>
                setActivePicker({ rowIndex: index, slot: "initial" })
              }
              type="button"
            >
              {row.initial ?? "聲母"}
            </button>
            <div className="grid grid-cols-2 gap-1">
              <button
                className="rounded border border-zinc-300 bg-white text-sm text-zinc-900"
                onClick={() =>
                  setActivePicker({ rowIndex: index, slot: "medial" })
                }
                type="button"
              >
                {row.medial ?? "介音"}
              </button>
              <button
                className="rounded border border-zinc-300 bg-white text-sm text-zinc-900"
                onClick={() =>
                  setActivePicker({ rowIndex: index, slot: "tone" })
                }
                type="button"
              >
                {row.tone ? (
                  <span className="tone-glyph">{row.tone}</span>
                ) : (
                  "右調"
                )}
              </button>
            </div>
            <button
              className="rounded border border-zinc-300 bg-white text-sm text-zinc-900"
              onClick={() =>
                setActivePicker({ rowIndex: index, slot: "final" })
              }
              type="button"
            >
              {row.final ?? "韻母"}
            </button>
          </div>
        </div>
      ))}

      <BopomofoPicker
        onClose={() => setActivePicker(null)}
        onSelect={(symbol) => {
          if (!activePicker) {
            return;
          }

          if (activePicker.slot === "topTone") {
            updateRow(activePicker.rowIndex, {
              topTone: symbol as BopomofoCell["topTone"],
            });
            return;
          }

          if (activePicker.slot === "tone") {
            updateRow(activePicker.rowIndex, {
              tone: symbol as BopomofoCell["tone"],
            });
            return;
          }

          updateRow(activePicker.rowIndex, {
            [activePicker.slot]: symbol,
          });
        }}
        open={Boolean(activePicker)}
        type={
          activePicker?.slot === "topTone"
            ? "top-tone"
            : activePicker?.slot === "tone"
              ? "right-tone"
              : (activePicker?.slot ?? "initial")
        }
      />
    </div>
  );
}
