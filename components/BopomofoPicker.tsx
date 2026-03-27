"use client";

import {
  bopomofoFinals,
  bopomofoInitials,
  bopomofoMedials,
  bopomofoRightTones,
  bopomofoTopTones,
} from "@/lib/game/constants";

type PickerType = "initial" | "medial" | "final" | "top-tone" | "right-tone";

type BopomofoPickerProps = {
  open: boolean;
  type: PickerType;
  selectedSymbol?: string | null;
  onClose: () => void;
  onSelect: (value: string | null) => void;
};

const byType: Record<PickerType, readonly string[]> = {
  initial: bopomofoInitials,
  medial: bopomofoMedials,
  final: bopomofoFinals,
  "top-tone": bopomofoTopTones,
  "right-tone": bopomofoRightTones,
};

export function BopomofoPicker({
  open,
  type,
  selectedSymbol,
  onClose,
  onSelect,
}: Readonly<BopomofoPickerProps>) {
  if (!open) {
    return null;
  }

  const symbols = byType[type];
  const showClear = true;
  const isTonePicker = type === "top-tone" || type === "right-tone";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900">
            選擇
            {type === "initial"
              ? "聲母"
              : type === "medial"
                ? "介音"
                : type === "final"
                  ? "韻母"
                  : type === "top-tone"
                    ? "上方聲調"
                    : "右側聲調"}
          </h3>
          <button
            className="rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100"
            onClick={onClose}
            type="button"
          >
            關閉
          </button>
        </div>

        <p className="mb-3 text-xs font-medium text-zinc-500">
          已選：
          <span className="font-semibold text-primary">
            {selectedSymbol
              ? selectedSymbol === "1"
                ? "一聲"
                : selectedSymbol
              : "尚未選擇"}
          </span>
        </p>

        <div className="grid grid-cols-6 gap-2">
          {symbols.map((symbol) => {
            const isSelected = selectedSymbol === symbol;

            return (
              <button
                aria-pressed={isSelected}
                className={`rounded-lg border px-2 py-2 text-lg font-medium transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                }`}
                key={symbol}
                onClick={() => {
                  onSelect(symbol);
                }}
                type="button"
              >
                {isTonePicker ? (
                  <span className="tone-glyph">{symbol}</span>
                ) : (
                  symbol
                )}
              </button>
            );
          })}

          {showClear ? (
            <button
              aria-pressed={!selectedSymbol}
              className={`col-span-3 rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                selectedSymbol
                  ? "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                  : "border-primary bg-primary/10 text-primary"
              }`}
              onClick={() => {
                onSelect(null);
              }}
              type="button"
            >
              清除
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
