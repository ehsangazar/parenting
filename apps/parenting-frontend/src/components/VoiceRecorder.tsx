import { useState, useRef, useEffect } from 'react';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  existingAudioUrl?: string;
  disabled?: boolean;
}

type RecordingState = 'idle' | 'recording' | 'recorded';

export function VoiceRecorder({ onRecordingComplete, existingAudioUrl, disabled }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>(existingAudioUrl ? 'recorded' : 'idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(existingAudioUrl);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl && !existingAudioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl, existingAudioUrl]);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setState('recorded');
        onRecordingComplete(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setState('recording');
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Could not access microphone. Please check permissions.');
      setState('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const deleteRecording = () => {
    if (audioUrl && !existingAudioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(undefined);
    setState('idle');
    setRecordingTime(0);
    onRecordingComplete(new Blob()); // Empty blob to clear
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-error/10 text-error text-sm">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* IDLE STATE - Ready to record */}
      {state === 'idle' && (
        <button
          type="button"
          onClick={startRecording}
          disabled={disabled}
          className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 border-primary-300 bg-primary-50 hover:bg-primary-100 hover:border-primary-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-md active:scale-[0.98]"
        >
          {/* Microphone button on left */}
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-primary-500/20 rounded-full animate-ping" />
            <div className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary-500 text-white shadow-md">
              <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          
          {/* Text on right */}
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm sm:text-base font-bold text-primary-fg mb-0.5">
              Tap to record voice note
            </p>
            <p className="text-xs sm:text-sm text-text-secondary">
              Speak your answer instead of typing
            </p>
          </div>
        </button>
      )}

      {/* RECORDING STATE - Active recording */}
      {state === 'recording' && (
        <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 border-error bg-error/10">
          {/* Stop button on left */}
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-error/30 rounded-full animate-ping" />
            <button
              type="button"
              onClick={stopRecording}
              className="relative flex h-12 w-12 min-h-0 items-center justify-center rounded-full bg-error p-0 text-white shadow-md transition-all hover:bg-error/90 sm:h-14 sm:w-14"
              aria-label="Stop recording"
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-sm bg-surface" />
            </button>
          </div>
          
          {/* Recording info on right */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-error animate-pulse" />
              <p className="text-sm sm:text-base font-bold text-error">Recording...</p>
            </div>
            <p className="text-lg sm:text-xl font-mono font-bold text-text-primary tabular-nums">
              {formatTime(recordingTime)}
            </p>
          </div>

          {/* Animated sound waves */}
          <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
            <div className="w-1 h-6 bg-error rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-8 bg-error rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />
            <div className="w-1 h-5 bg-error rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
            <div className="w-1 h-7 bg-error rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}

      {/* RECORDED STATE - Playback and actions */}
      {state === 'recorded' && audioUrl && (
        <div className="space-y-2">
          {/* Audio player with success indicator */}
          <div className="p-3 sm:p-4 rounded-xl border-2 border-success/30 bg-success/5">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-xs sm:text-sm text-success font-medium">Voice note recorded</span>
            </div>
            <audio src={audioUrl} controls className="w-full h-10" />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                deleteRecording();
                startRecording();
              }}
              disabled={disabled}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 border-primary-300 bg-surface text-primary-fg text-sm font-semibold hover:bg-primary-50 hover:border-primary-fg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              aria-label="Re-record"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Record Again</span>
              <span className="sm:hidden">Re-record</span>
            </button>
            
            <button
              type="button"
              onClick={deleteRecording}
              disabled={disabled}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 border-error/30 bg-surface text-error text-sm font-semibold hover:bg-error/5 hover:border-error disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              aria-label="Delete recording"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
