let lastAnnouncedStepIdx = -1;
let lastAnnouncedWarning = '';
let isVoiceMuted = false;

export const voiceNavigationService = {
  setMuted: (muted: boolean): void => {
    isVoiceMuted = muted;
    if (muted && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  },

  isMuted: (): boolean => isVoiceMuted,

  speak: (text: string, force = false): void => {
    if (isVoiceMuted && !force) return;
    if (!('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.lang = 'en-IN';
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis notice:", e);
    }
  },

  announceManeuver: (
    stepIdx: number,
    instruction: string,
    distMeters: number,
    streetName?: string
  ): void => {
    if (stepIdx === lastAnnouncedStepIdx) return;

    let text = instruction;
    if (distMeters > 50 && distMeters < 500) {
      text = `In ${Math.round(distMeters)} meters, ${instruction}`;
    }

    lastAnnouncedStepIdx = stepIdx;
    voiceNavigationService.speak(text);
  },

  announceRiskWarning: (riskLevel: string, distMeters: number): void => {
    if (riskLevel !== 'elevated' && riskLevel !== 'higher') return;

    const warningKey = `${riskLevel}_${Math.round(distMeters / 100)}`;
    if (lastAnnouncedWarning === warningKey) return;

    lastAnnouncedWarning = warningKey;
    if (distMeters < 450 && distMeters > 50) {
      voiceNavigationService.speak(`Warning: A higher-risk route segment begins in approximately ${Math.round(distMeters)} meters.`);
    } else if (distMeters <= 50) {
      voiceNavigationService.speak(`You are entering a higher-risk route segment. Stay vigilant.`);
    }
  },

  announceArea: (areaName: string): void => {
    if (!areaName) return;
    voiceNavigationService.speak(`You are currently near ${areaName}.`);
  },

  reset: (): void => {
    lastAnnouncedStepIdx = -1;
    lastAnnouncedWarning = '';
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
};
