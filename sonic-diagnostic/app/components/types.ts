export type TabId = 'home' | 'bike' | 'engine' | 'chat' | 'settings';
export type ScannerState = 'idle' | 'recording' | 'fileReady' | 'processing';
export type ChatMsg = { role: 'user' | 'model'; content: string };

export const springBouncy = { type: 'spring' as const, stiffness: 320, damping: 22 };
export const springSmooth = { type: 'spring' as const, stiffness: 200, damping: 26 };

export const ANALYSIS_GOALS = [
  'Wykryj usterkę',
  'Ocena stanu',
  'Identyfikacja dźwięku',
] as const;

export const FUEL_TYPES = ['Benzyna', 'Diesel', 'Hybryda', 'Elektryczny', 'LPG'] as const;

export const BIKE_TYPES = ['Szosowy', 'MTB', 'Gravel', 'Miejski', 'E-bike', 'Inny'] as const;

export const BIKE_COMPONENTS = [
  'Łańcuch / Napęd',
  'Hamulce',
  'Przerzutki',
  'Koła / Opony',
  'Rama',
  'Kierownica',
  'Zawieszenie',
  'Siodło',
  'Inne',
] as const;
