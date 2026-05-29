/**
 * Nolea Category Theme System
 * 
 * Jede Oberkategorie hat ihr eigenes Farbschema.
 * "Alle" ist die neutrale Basis die alles zusammenhält.
 */

export interface CategoryTheme {
  primary: string;        // Haupt-Akzentfarbe (Buttons, aktive Pills)
  primaryDark: string;    // Hover/Dark-Variante
  primaryLight: string;   // Leichte Variante (Badges, Hintergründe)
  primaryGlow: string;    // Glow/Shadow-Farbe (mit Transparenz)
  accent: string;         // Sekundärakzent
  gradientFrom: string;   // Gradient Start
  gradientTo: string;     // Gradient Ende
  icon: string;           // Emoji/Icon für die Kategorie
  label: string;          // Anzeige-Label
  description: string;    // Kurzbeschreibung
}

export const categoryThemes: Record<string, CategoryTheme> = {
  Alle: {
    primary: '#8A9A5B',
    primaryDark: '#6B7A46',
    primaryLight: '#D9DED1',
    primaryGlow: 'rgba(138, 154, 91, 0.3)',
    accent: '#8A9A5B',
    gradientFrom: '#8A9A5B',
    gradientTo: '#6B7A46',
    icon: '✦',
    label: 'Alle Produkte',
    description: 'Unsere komplette Kollektion handverlesener Guides',
  },
  Technik: {
    primary: '#5B8CA8',
    primaryDark: '#3D6E87',
    primaryLight: '#C8DDE8',
    primaryGlow: 'rgba(91, 140, 168, 0.3)',
    accent: '#7BAAC4',
    gradientFrom: '#5B8CA8',
    gradientTo: '#3D6E87',
    icon: '⚡',
    label: 'Technik',
    description: 'Digitale Skills, Tech-Guides & Produktivitäts-Hacks',
  },
  Lifestyle: {
    primary: '#B87B8A',
    primaryDark: '#9A5D6D',
    primaryLight: '#EACDD4',
    primaryGlow: 'rgba(184, 123, 138, 0.3)',
    accent: '#D4A0AC',
    gradientFrom: '#B87B8A',
    gradientTo: '#9A5D6D',
    icon: '♥',
    label: 'Lifestyle',
    description: 'Selbstfürsorge, Routinen & bewusster Lebensstil',
  },
  Food: {
    primary: '#C4854C',
    primaryDark: '#A66A35',
    primaryLight: '#ECD4BC',
    primaryGlow: 'rgba(196, 133, 76, 0.3)',
    accent: '#D9A87A',
    gradientFrom: '#C4854C',
    gradientTo: '#A66A35',
    icon: '🍽',
    label: 'Food',
    description: 'Rezepte, Ernährung & kulinarische Entdeckungen',
  },
  Business: {
    primary: '#4A6178',
    primaryDark: '#344A5E',
    primaryLight: '#C0CDD8',
    primaryGlow: 'rgba(74, 97, 120, 0.3)',
    accent: '#6B8399',
    gradientFrom: '#4A6178',
    gradientTo: '#344A5E',
    icon: '◆',
    label: 'Business',
    description: 'Finanzen, Unternehmertum & Karriere-Strategien',
  },
};

/**
 * Helper: Gibt das Theme für eine Kategorie zurück.
 * Fallback auf "Alle" wenn Kategorie nicht gefunden.
 */
export function getTheme(category: string): CategoryTheme {
  // Case-insensitive match
  const key = Object.keys(categoryThemes).find(
    k => k.toLowerCase() === category.toLowerCase()
  );
  return categoryThemes[key || 'Alle'];
}

/**
 * Kategorien-Liste für den Shop-Filter
 */
export const shopCategories = ['Alle', 'Technik', 'Lifestyle', 'Food', 'Business'];
