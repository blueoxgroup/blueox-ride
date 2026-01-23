import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getChurchCopy } from '@/config/churchCopy'
import { ChurchPageSEO } from '@/components/SEO'
import { useChurchAttribution } from '@/hooks/useChurchAttribution'
import HomePage from './HomePage'

/**
 * Church-specific landing page wrapper
 *
 * Renders the standard HomePage with customized hero copy based on the church slug.
 * All BlueOx branding, functionality, and UI remains unchanged.
 *
 * When a user visits this page, we store the church attribution in localStorage.
 * This attribution is used to credit the church when the user books a ride.
 *
 * Routes: /watoto, /worshipharvest, /holycity, /miraclecenter, /phaneroo
 * Unknown slugs fall back to default BlueOx copy.
 */
export default function ChurchLandingPage() {
  const { churchSlug } = useParams<{ churchSlug: string }>()
  const copy = getChurchCopy(churchSlug)
  const { setChurchAttribution } = useChurchAttribution()

  // Only show church-specific SEO if it's a known church
  const isKnownChurch = copy.churchName !== ''

  // Set church attribution when visiting a known church page
  useEffect(() => {
    if (isKnownChurch && churchSlug) {
      setChurchAttribution(churchSlug)
    }
  }, [isKnownChurch, churchSlug, setChurchAttribution])

  return (
    <>
      {isKnownChurch && (
        <ChurchPageSEO
          churchName={copy.churchName}
          slug={copy.slug}
        />
      )}
      <HomePage
        heroHeadline={copy.heroHeadline}
        heroSubtext={copy.heroSubtext}
        loggedInPrompt={copy.loggedInPrompt}
      />
    </>
  )
}
