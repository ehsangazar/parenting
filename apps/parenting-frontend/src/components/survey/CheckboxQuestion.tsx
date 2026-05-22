const OTHER_OPTION = 'Other';

interface CheckboxQuestionProps {
  label: string;
  question: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  hint?: string;
  /** When options include "Other" and user selects it, show a text field for description. */
  otherDescription?: { value: string; onChange: (value: string) => void };
}

export function CheckboxQuestion({
  label,
  question,
  options,
  value,
  onChange,
  hint,
  otherDescription,
}: CheckboxQuestionProps) {
  const showOtherDescription = options.includes(OTHER_OPTION) && value.includes(OTHER_OPTION) && otherDescription;
  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

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
          const isSelected = value.includes(option);
          
          return (
            <label
              key={option}
              data-rough-skip="true"
              className={`
                group relative flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 cursor-pointer min-w-0
                transition-all duration-200
                ${isSelected
                  ? 'border-secondary-400 bg-secondary-50 shadow-md'
                  : 'border-border-light bg-surface hover:border-secondary-300 hover:bg-secondary-50/30 hover:shadow-sm'
                }
              `}
            >
              {/* Custom Checkbox */}
              <div className="relative flex items-center justify-center mt-0.5">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOption(option)}
                  className="sr-only"
                />
                <div
                  className={`
                    w-6 h-6 rounded-md border-2 flex items-center justify-center
                    transition-all duration-200
                    ${isSelected
                      ? 'border-secondary-400 bg-secondary-400'
                      : 'border-border-medium bg-surface group-hover:border-secondary-300'
                    }
                  `}
                >
                  {isSelected && (
                    <svg
                      className="w-4 h-4 text-white animate-scale-in"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </div>

              {/* Option Text */}
              <div className="flex-1 min-w-0">
                <span
                  className={`
                    font-medium text-sm sm:text-base leading-relaxed break-words
                    ${isSelected ? 'text-secondary-700' : 'text-text-primary group-hover:text-secondary-600'}
                  `}
                >
                  {option}
                </span>
              </div>

              {/* Selected Count Badge */}
              {isSelected && (
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary-100 flex-shrink-0">
                  <svg className="w-4 h-4 text-secondary-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </label>
          );
        })}
      </div>

      {/* Other description (when "Other" is selected) */}
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

      {/* Selection Count */}
      {value.length > 0 && (
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-50 rounded-full border border-secondary-200">
            <svg className="w-4 h-4 text-secondary-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium text-secondary-700">
              {value.length} selected
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
