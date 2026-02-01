// Church-specific landing page copy configuration
// Includes brand colors and hero text customization

export interface ChurchBrandColors {
  // Primary brand color - used for hero background gradient
  primary: string
  primaryDark: string
  // Accent color - used for highlights, buttons, icons
  accent: string
  accentLight: string
  // Text colors for the hero section
  heroText: string
  heroSubtext: string
}

export interface ChurchCopy {
  slug: string
  churchName: string
  heroHeadline: string
  heroSubtext: string
  // Optional: customize the logged-in user prompt
  loggedInPrompt?: string
  // Brand colors for theming
  brandColors: ChurchBrandColors
}

// Default BlueOx brand colors (coral and navy)
export const defaultBrandColors: ChurchBrandColors = {
  primary: '#193153',      // Navy 900
  primaryDark: '#0f1d31',  // Navy 950
  accent: '#FF4040',       // Coral 500
  accentLight: '#ffe0e0',  // Coral 100
  heroText: '#ffffff',
  heroSubtext: '#ffe0e0',  // Coral 100
}

export const churchCopyMap: Record<string, ChurchCopy> = {
  // Watoto Church - Navy blue with orange/gold accents
  // Based on their official branding: dark blue logo with warm accent colors
  watoto: {
    slug: 'watoto',
    churchName: 'Watoto Church',
    heroHeadline: 'Ride together to Watoto Church',
    heroSubtext: 'Find fellow believers heading to service. Save money, build community.',
    brandColors: {
      primary: '#1E3A5F',       // Watoto Navy Blue
      primaryDark: '#142942',   // Darker navy
      accent: '#F5A623',        // Watoto Orange/Gold
      accentLight: '#FEF3DC',   // Light orange
      heroText: '#ffffff',
      heroSubtext: '#FEF3DC',
    },
  },

  // Worship Harvest - Orange/amber with dark navy
  // Based on their website: warm orange tones, community-focused
  worshipharvest: {
    slug: 'worshipharvest',
    churchName: 'Worship Harvest',
    heroHeadline: 'Ride together to Worship Harvest',
    heroSubtext: 'Connect with church members going your way. Travel together, worship together.',
    brandColors: {
      primary: '#E87722',       // Worship Harvest Orange
      primaryDark: '#C65A0A',   // Darker orange
      accent: '#1A3A5C',        // Dark Navy accent
      accentLight: '#FFF3E8',   // Light orange cream
      heroText: '#ffffff',
      heroSubtext: '#FFF3E8',
    },
  },

  // Holy City Church (Entebbe) - Royal purple with gold
  // Spiritual royalty theme with Professor Ronnie Makabai
  holycity: {
    slug: 'holycity',
    churchName: 'Holy City Church',
    heroHeadline: 'Share rides to Holy City Church',
    heroSubtext: 'Join other members heading to service. Affordable, trusted carpooling.',
    brandColors: {
      primary: '#5E3A7E',       // Royal Purple
      primaryDark: '#422A59',   // Darker purple
      accent: '#C9A227',        // Gold
      accentLight: '#F9F4E3',   // Light gold cream
      heroText: '#ffffff',
      heroSubtext: '#F9F4E3',
    },
  },

  // Miracle Centre Cathedral - Royal blue with gold
  // Based on their branding: blue and gold, Robert Kayanja Ministries
  miraclecenter: {
    slug: 'miraclecenter',
    churchName: 'Miracle Center Cathedral',
    heroHeadline: 'Get to Miracle Center together',
    heroSubtext: 'Find rides with fellow believers. Save on transport, grow in fellowship.',
    brandColors: {
      primary: '#1E4D8C',       // Royal Blue
      primaryDark: '#153764',   // Darker blue
      accent: '#FFD700',        // Gold
      accentLight: '#FFFDE7',   // Light gold
      heroText: '#ffffff',
      heroSubtext: '#FFFDE7',
    },
  },

  // Phaneroo Ministries - Maroon/burgundy with gold
  // Based on their website aesthetics: deep maroon with gold highlights
  phaneroo: {
    slug: 'phaneroo',
    churchName: 'Phaneroo Ministries',
    heroHeadline: 'Ride together to Phaneroo',
    heroSubtext: 'Connect with others heading to the gathering. Share the journey, share the cost.',
    brandColors: {
      primary: '#6B2D5B',       // Phaneroo Maroon/Burgundy
      primaryDark: '#4A1F3F',   // Darker burgundy
      accent: '#D4A853',        // Gold
      accentLight: '#FBF5E8',   // Light cream gold
      heroText: '#ffffff',
      heroSubtext: '#FBF5E8',
    },
  },
}

// Default copy for unknown slugs or main landing page
export const defaultCopy: ChurchCopy = {
  slug: '',
  churchName: '',
  heroHeadline: 'Travel together, pay less',
  heroSubtext: 'Find trusted drivers going your way across Uganda',
  brandColors: defaultBrandColors,
}

export function getChurchCopy(slug: string | undefined): ChurchCopy {
  if (!slug) return defaultCopy
  return churchCopyMap[slug.toLowerCase()] || defaultCopy
}
