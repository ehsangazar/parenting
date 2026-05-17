import { Howl, Howler } from 'howler';

export type SoundName =
  | 'buttonPrimary'
  | 'buttonSecondary'
  | 'tabChange'
  | 'unlock'
  | 'xpEarn'
  | 'questComplete'
  | 'playbookTry'
  | 'dailyLogin'
  | 'lessonComplete'
  | 'moduleComplete'
  | 'achievementUnlock'
  | 'levelUp'
  | 'streakMilestone';

const SOUND_FILES: Record<SoundName, string> = {
  buttonPrimary:    '/sounds/buttonPrimary.mp3',
  buttonSecondary:  '/sounds/buttonSecondary.mp3',
  tabChange:        '/sounds/tabChange.mp3',
  unlock:           '/sounds/unlock.mp3',
  xpEarn:           '/sounds/xpEarn.mp3',
  questComplete:    '/sounds/questComplete.mp3',
  playbookTry:      '/sounds/playbookTry.mp3',
  dailyLogin:       '/sounds/dailyLogin.mp3',
  lessonComplete:   '/sounds/lessonComplete.mp3',
  moduleComplete:   '/sounds/moduleComplete.mp3',
  achievementUnlock:'/sounds/achievementUnlock.mp3',
  levelUp:          '/sounds/levelUp.wav',
  streakMilestone:  '/sounds/streakMilestone.wav',
};

const VOLUMES: Partial<Record<SoundName, number>> = {
  buttonPrimary:    0.5,
  buttonSecondary:  0.4,
  tabChange:        0.4,
};

const howls = new Map<SoundName, Howl>();

function getHowl(name: SoundName): Howl {
  if (!howls.has(name)) {
    howls.set(name, new Howl({
      src: [SOUND_FILES[name]],
      volume: VOLUMES[name] ?? 0.7,
      preload: true,
    }));
  }
  return howls.get(name)!;
}

// ─── Preferences ──────────────────────────────────────────────────────────────

const SOUND_KEY = 'raised_sound_enabled';
const VOICE_KEY = 'raised_voice_enabled';

function readPref(key: string, defaultVal = true): boolean {
  const v = localStorage.getItem(key);
  return v === null ? defaultVal : v !== 'false';
}

let _soundEnabled = readPref(SOUND_KEY);
let _voiceEnabled = readPref(VOICE_KEY);

// ─── Public API ────────────────────────────────────────────────────────────────

export const soundManager = {
  play(name: SoundName): void {
    if (!_soundEnabled) return;
    try {
      getHowl(name).play();
    } catch {
      // Audio failure must never break UI
    }
  },

  speakPhrase(text: string): void {
    if (!_voiceEnabled) return;
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.1;
      utterance.volume = 0.9;
      const setVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find((v) => v.lang.startsWith('en') && /female|woman|samantha|karen|moira|tessa|victoria/i.test(v.name)) ??
          voices.find((v) => v.lang.startsWith('en')) ??
          null;
        if (preferred) utterance.voice = preferred;
        window.speechSynthesis.speak(utterance);
      };
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.addEventListener('voiceschanged', setVoice, { once: true });
      } else {
        setVoice();
      }
    } catch {
      // Speech failure must never break UI
    }
  },

  isEnabled(): boolean {
    return _soundEnabled;
  },

  isVoiceEnabled(): boolean {
    return _voiceEnabled;
  },

  setEnabled(enabled: boolean): void {
    _soundEnabled = enabled;
    Howler.mute(!enabled);
    localStorage.setItem(SOUND_KEY, String(enabled));
  },

  setVoiceEnabled(enabled: boolean): void {
    _voiceEnabled = enabled;
    localStorage.setItem(VOICE_KEY, String(enabled));
  },
};
