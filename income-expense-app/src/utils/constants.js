export const COLOR_PALETTES = {
  indigo: { primary: '#6366f1', name: 'Indigo Aura' },
  violet: { primary: '#8b5cf6', name: 'Violet Spark' },
  emerald: { primary: '#10b981', name: 'Emerald Glow' },
  rose: { primary: '#f43f5e', name: 'Rose Petal' },
  amber: { primary: '#f59e0b', name: 'Amber Sun' }
};

export const GUJARATI_FONTS = [
  { value: 'font-noto-sans', label: 'Noto Sans Gujarati (Clean)' },
  { value: 'font-noto-serif', label: 'Noto Serif Gujarati (Traditional)' },
  { value: 'font-baloo', label: 'Baloo Bhai 2 (Rounded / Soft)' },
  { value: 'font-mogra', label: 'Mogra (Artistic / Bold)' },
  { value: 'font-farsan', label: 'Farsan (Calligraphic / Script)' },
  { value: 'font-ghanshyam', label: 'Ghanshyam (Legacy Font - Conversion Active)' }
];

export const EN_GU_DEBOUNCE_MS = 420;

/** Gujarati Unicode block — stripped from the English pane so that side stays Roman-only. */
export const GUJARATI_UNICODE_RE = /[\u0A80-\u0AFF]/g;
