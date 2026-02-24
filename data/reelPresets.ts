export interface ReelPreset {
  id: string;
  label: string;
  prompt: string;
}

/** Presety opisów do generowania rolek (Veo). Użytkownik może wybrać preset lub wpisać własny prompt. */
export const REEL_PRESETS: ReelPreset[] = [
  {
    id: 'slow-zoom',
    label: 'Powolne zbliżenie',
    prompt: 'Smooth slow zoom into the scene. Camera gently moves forward. Cinematic, professional, 8 seconds.',
  },
  {
    id: 'pan-right',
    label: 'Przejazd w prawo',
    prompt: 'Smooth horizontal pan from left to right across the scene. Steady movement, cinematic lighting. 8 seconds.',
  },
  {
    id: 'ambient',
    label: 'Spokojna scena (bez ruchu kamery)',
    prompt: 'Static shot. Soft ambient light, subtle atmosphere. Scene stays still, calm mood. 8 seconds.',
  },
  {
    id: 'light-change',
    label: 'Zmiana światła (dzień → wieczór)',
    prompt: 'Same room, time lapse feel: daylight gradually shifts to warm evening golden hour. Smooth transition. 8 seconds.',
  },
  {
    id: 'reveal',
    label: 'Odsłonięcie (reveal)',
    prompt: 'Camera starts slightly obscured, then reveals the full scene with a smooth pull back. Elegant reveal. 8 seconds.',
  },
];
