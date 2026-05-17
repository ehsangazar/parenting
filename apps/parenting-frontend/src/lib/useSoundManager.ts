import { useState } from 'react';
import { soundManager } from './soundManager.js';
import type { SoundName } from './soundManager.js';

/**
 * Thin React hook over soundManager for components that need to reactively
 * re-render when the sound preference changes (e.g. the Settings toggle).
 * For fire-and-forget usage, import soundManager directly.
 */
export function useSoundManager() {
  const [soundEnabled, _setSoundEnabled] = useState(() => soundManager.isEnabled());
  const [voiceEnabled, _setVoiceEnabled] = useState(() => soundManager.isVoiceEnabled());

  const setSoundEnabled = (enabled: boolean) => {
    soundManager.setEnabled(enabled);
    _setSoundEnabled(enabled);
  };

  const setVoiceEnabled = (enabled: boolean) => {
    soundManager.setVoiceEnabled(enabled);
    _setVoiceEnabled(enabled);
  };

  return {
    play: (name: SoundName) => soundManager.play(name),
    speak: (text: string) => soundManager.speakPhrase(text),
    soundEnabled,
    setSoundEnabled,
    voiceEnabled,
    setVoiceEnabled,
  };
}
