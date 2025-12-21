// Church-specific landing page copy configuration
// Only hero text changes - all BlueOx branding and functionality remains unchanged

export interface ChurchCopy {
  slug: string
  churchName: string
  heroHeadline: string
  heroSubtext: string
  // Optional: customize the logged-in user prompt
  loggedInPrompt?: string
}

export const churchCopyMap: Record<string, ChurchCopy> = {
  watoto: {
    slug: 'watoto',
    churchName: 'Watoto Church',
    heroHeadline: 'Ride together to Watoto Church',
    heroSubtext: 'Find fellow believers heading to service. Save money, build community.',
  },
  worshipharvest: {
    slug: 'worshipharvest',
    churchName: 'Worship Harvest',
    heroHeadline: 'Ride together to Worship Harvest',
    heroSubtext: 'Connect with church members going your way. Travel together, worship together.',
  },
  holycity: {
    slug: 'holycity',
    churchName: 'Holy City Church',
    heroHeadline: 'Share rides to Holy City Church',
    heroSubtext: 'Join other members heading to service. Affordable, trusted carpooling.',
  },
  miraclecenter: {
    slug: 'miraclecenter',
    churchName: 'Miracle Center Cathedral',
    heroHeadline: 'Get to Miracle Center together',
    heroSubtext: 'Find rides with fellow believers. Save on transport, grow in fellowship.',
  },
  phaneroo: {
    slug: 'phaneroo',
    churchName: 'Phaneroo Ministries',
    heroHeadline: 'Ride together to Phaneroo',
    heroSubtext: 'Connect with others heading to the gathering. Share the journey, share the cost.',
  },
}

// Default copy for unknown slugs or main landing page
export const defaultCopy: ChurchCopy = {
  slug: '',
  churchName: '',
  heroHeadline: 'Travel together, pay less',
  heroSubtext: 'Find trusted drivers going your way across Uganda',
}

export function getChurchCopy(slug: string | undefined): ChurchCopy {
  if (!slug) return defaultCopy
  return churchCopyMap[slug.toLowerCase()] || defaultCopy
}
