interface RadioQuestionProps {
  label: string;
  question: string;
  options: string[];
  value?: string;
  onChange: (value: string) => void;
  hint?: string;
  /** Option value that triggers the "other" description field (e.g. "Guardian / Other"). */
  otherOptionValue?: string;
  /** When otherOptionValue is selected, show a text field for description. */
  otherDescription?: { value: string; onChange: (value: string) => void };
}

export function RadioQuestion({
  label,
  question,
  options,
  value,
  onChange,
  hint,
  otherOptionValue,
  otherDescription,
}: RadioQuestionProps) {
  const showOtherDescription = otherOptionValue != null && value === otherOptionValue && otherDescription != null;

  return (
    <div className="space-y-5 min-w-0">
      {/* Question */}
      <div>
        <label className="block text-base sm:text-lg font-bold text-text-primary mb-1 break-words">
          {label}. {question}
        </label>
        {hint && (
          <p className="text-sm text-text-tertiary mt-1 break-words">{hint}</p>
        )}
      </div>

      {/* Options */}
      <div className="space-y-3">
        {options.map((option) => {
          const isSelected = value === option;
          
          return (
            <label
              key={option}
              data-rough-skip="true"
              className={`
                group relative flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 cursor-pointer min-w-0
                transition-all duration-200
                ${isSelected
                  ? 'border-primary-400 bg-primary-50 shadow-md'
                  : 'border-border-light bg-surface hover:border-primary-300 hover:bg-primary-50/30 hover:shadow-sm'
                }
              `}
            >
              {/* Custom Radio */}
              <div className="relative flex items-center justify-center mt-0.5">
                <input
                  type="radio"
                  checked={isSelected}
                  onChange={() => onChange(option)}
                  className="sr-only"
                />
                <div
                  className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center
                    transition-all duration-200
                    ${isSelected
                      ? 'border-primary-400 bg-primary-400'
                      : 'border-border-medium bg-surface group-hover:border-primary-300'
                    }
                  `}
                >
                  {isSelected && (
                    <div className="w-2.5 h-2.5 rounded-full bg-surface animate-scale-in" />
                  )}
                </div>
              </div>

              {/* Option Text */}
              <div className="flex-1 min-w-0">
                <span
                  className={`
                    font-medium text-sm sm:text-base leading-relaxed break-words
                    ${isSelected ? 'text-primary-fg' : 'text-text-primary group-hover:text-primary-fg'}
                  `}
                >
                  {option}
                </span>
              </div>

              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3 flex-shrink-0">
                  <svg className="w-5 h-5 text-primary-700" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </label>
          );
        })}
      </div>

      {/* Other description (when the "other" option is selected) */}
      {showOtherDescription && (
        <div className="pt-2">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Please describe (optional)
          </label>
          <input
            type="text"
            value={otherDescription.value}
            onChange={(e) => otherDescription.onChange(e.target.value)}
            placeholder="e.g. Grandparent, foster care..."
            className="w-full px-4 py-3 rounded-xl border-2 border-border-light bg-surface text-text-primary placeholder:text-text-tertiary focus:border-primary-400 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all"
          />
        </div>
      )}
    </div>
  );
}
