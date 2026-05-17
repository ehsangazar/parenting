import { VoiceRecorder } from '../VoiceRecorder.js';

interface TextQuestionProps {
  label: string;
  question: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  hint?: string;
  /** Enable voice recording as an alternative to typing. */
  enableVoiceRecording?: boolean;
  onVoiceRecording?: (audioBlob: Blob | null) => void;
  existingAudioUrl?: string;
}

export function TextQuestion({
  label,
  question,
  value,
  onChange,
  placeholder = 'Your answer...',
  multiline = false,
  rows = 4,
  hint,
  enableVoiceRecording = false,
  onVoiceRecording,
  existingAudioUrl,
}: TextQuestionProps) {
  const charCount = value.length;
  const hasContent = charCount > 0;
  const hasVoiceRecording = existingAudioUrl != null;

  return (
    <div className="space-y-4 min-w-0">
      {/* Question */}
      <div>
        <label className="block text-base sm:text-lg font-bold text-text-primary mb-1 break-words">
          {label}. {question}
        </label>
        {hint && (
          <p className="text-sm text-text-tertiary mt-1 break-words">{hint}</p>
        )}
      </div>

      {/* Input Field */}
      <div className="relative">
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className={`
              w-full min-w-0 rounded-xl border-2 px-4 py-3 text-sm sm:text-base
              text-text-primary placeholder-text-tertiary
              transition-all duration-200
              resize-none
              ${hasContent
                ? 'border-primary-300 bg-primary-50/30 focus:border-primary-400 focus:bg-primary-50/50'
                : 'border-border-light bg-surface focus:border-primary-400 focus:bg-primary-50/30'
              }
              focus:ring-4 focus:ring-primary-100 focus:outline-none
            `}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`
              w-full min-w-0 rounded-xl border-2 px-4 py-3 text-sm sm:text-base
              text-text-primary placeholder-text-tertiary
              transition-all duration-200
              ${hasContent
                ? 'border-primary-300 bg-primary-50/30 focus:border-primary-400 focus:bg-primary-50/50'
                : 'border-border-light bg-surface focus:border-primary-400 focus:bg-primary-50/30'
              }
              focus:ring-4 focus:ring-primary-100 focus:outline-none
            `}
          />
        )}

        {/* Character Count */}
        {multiline && hasContent && (
          <div className="absolute bottom-3 right-3 px-2 py-1 bg-surface rounded-md border border-border-light">
            <span className="text-xs font-medium text-text-tertiary">
              {charCount} character{charCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Voice Recording (optional) */}
      {enableVoiceRecording && onVoiceRecording && (
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-px bg-border-light" />
            <p className="text-sm font-medium text-text-tertiary uppercase tracking-wide">Or</p>
            <div className="flex-1 h-px bg-border-light" />
          </div>
          <VoiceRecorder
            onRecordingComplete={(blob) => onVoiceRecording(blob.size > 0 ? blob : null)}
            existingAudioUrl={existingAudioUrl}
          />
        </div>
      )}

      {/* Status Indicator */}
      {(hasContent || hasVoiceRecording) && (
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-success font-medium">
            {hasVoiceRecording && hasContent ? 'Text & voice provided' : hasVoiceRecording ? 'Voice note provided' : 'Answer provided'}
          </span>
        </div>
      )}
    </div>
  );
}
