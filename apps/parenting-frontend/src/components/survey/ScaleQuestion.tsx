import { useState } from 'react';

interface ScaleQuestionProps {
  label: string;
  question: string;
  lowLabel: string;
  highLabel: string;
  value?: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function ScaleQuestion({
  label,
  question,
  lowLabel,
  highLabel,
  value,
  onChange,
  min = 1,
  max = 10,
}: ScaleQuestionProps) {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  const displayValue = hoveredValue ?? value ?? 0;
  const currentValue = value ?? min;

  return (
    <div className="space-y-6 sm:space-y-8 min-w-0 w-full">
      {/* Question */}
      <div>
        <label className="block text-base sm:text-lg font-bold text-text-primary mb-1 break-words">
          {label}. {question}
        </label>
      </div>

      {/* End labels with circular badges (1 and 10) */}
      <div className="flex justify-between items-start sm:items-center gap-2 sm:gap-6 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
          <div className="flex-shrink-0 w-7 h-7 sm:w-10 sm:h-10 rounded-full border-2 border-primary-200 bg-primary-50 flex items-center justify-center">
            <span className="text-primary-fg font-bold text-xs sm:text-lg">{min}</span>
          </div>
          <span className="text-xs font-medium text-text-secondary break-words line-clamp-2">{lowLabel}</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 justify-end">
          <span className="text-xs font-medium text-text-secondary text-right break-words line-clamp-2">{highLabel}</span>
          <div className="flex-shrink-0 w-7 h-7 sm:w-10 sm:h-10 rounded-full border-2 border-secondary-200 bg-secondary-50 flex items-center justify-center">
            <span className="text-secondary-600 font-bold text-xs sm:text-lg">{max}</span>
          </div>
        </div>
      </div>

      {/* Mobile: native range slider - always fits, no overflow */}
      <div className="sm:hidden w-full">
        <input
          type="range"
          min={min}
          max={max}
          value={currentValue}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="w-full h-2 accent-primary-500 cursor-pointer"
          aria-label={`Rate from ${min} to ${max}`}
        />
        <div className="flex justify-between mt-1.5 px-1">
          <span className="text-xs text-text-tertiary">{min}</span>
          <span className="text-base font-semibold text-primary-fg">{currentValue}</span>
          <span className="text-xs text-text-tertiary">{max}</span>
        </div>
      </div>

      {/* Desktop: number buttons - no scale transform to avoid overflow */}
      <div className="hidden sm:block relative pt-2 pb-1 min-w-0 w-full">
        {/* Background track */}
        <div className="absolute top-1/2 left-0 right-0 h-2.5 -translate-y-1/2 bg-primary-100 rounded-full" />

        {/* Active fill */}
        {displayValue > 0 && (
          <div
            className="absolute top-1/2 left-0 h-2.5 -translate-y-1/2 rounded-full transition-all duration-300 ease-out bg-primary-400"
            style={{
              width: `${((displayValue - min) / (max - min)) * 100}%`,
            }}
          />
        )}

        {/* Number buttons - flex-1, no scale to prevent overflow */}
        <div className="relative flex w-full items-center">
          {numbers.map((num) => {
            const isSelected = value === num;
            const isHovered = hoveredValue === num;

            return (
              <button
                key={num}
                type="button"
                title={`Select ${num}`}
                onClick={() => onChange(num)}
                onMouseEnter={() => setHoveredValue(num)}
                onMouseLeave={() => setHoveredValue(null)}
                data-rough-skip="true"
                className={`
                  relative flex-1 min-w-0 flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm cursor-pointer tabular-nums leading-none
                  transition-colors duration-200 ease-out
                  ${isSelected
                    ? 'bg-surface text-primary-fg shadow-md z-20 ring-2 ring-primary-400'
                    : isHovered
                    ? 'bg-surface text-text-primary z-10 shadow-md ring-2 ring-primary-300'
                    : 'bg-surface/60 text-text-tertiary hover:bg-surface hover:text-text-primary hover:ring-2 hover:ring-primary-200'
                  }
                `}
              >
                {num}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected value pill */}
      {value !== undefined && value > 0 && (
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 rounded-full border border-primary-200">
            <span className="text-sm font-medium text-text-secondary">Selected</span>
            <span className="text-lg font-bold text-primary-fg">{value}</span>
            <span className="text-sm text-text-tertiary">/ {max}</span>
          </div>
        </div>
      )}
    </div>
  );
}
