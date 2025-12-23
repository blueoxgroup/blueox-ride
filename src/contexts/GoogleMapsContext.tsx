import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface GoogleMapsContextType {
  isLoaded: boolean
  isError: boolean
  error: string | null
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  isError: false,
  error: null,
})

export function useGoogleMaps() {
  return useContext(GoogleMapsContext)
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

interface GoogleMapsProviderProps {
  children: ReactNode
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadGoogleMaps = useCallback(() => {
    // Check if already loaded
    if (window.google?.maps) {
      setIsLoaded(true)
      return
    }

    // Check if API key exists
    if (!GOOGLE_MAPS_API_KEY) {
      setIsError(true)
      setError('Google Maps API key not configured')
      return
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsLoaded(true))
      existingScript.addEventListener('error', () => {
        setIsError(true)
        setError('Failed to load Google Maps')
      })
      return
    }

    // Create and load script
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&callback=initGoogleMaps`
    script.async = true
    script.defer = true

    // Global callback for Google Maps
    ;(window as any).initGoogleMaps = () => {
      setIsLoaded(true)
      delete (window as any).initGoogleMaps
    }

    script.onerror = () => {
      setIsError(true)
      setError('Failed to load Google Maps. Please check your internet connection.')
      delete (window as any).initGoogleMaps
    }

    document.head.appendChild(script)

    // Timeout fallback
    const timeout = setTimeout(() => {
      if (!isLoaded && !isError) {
        setIsError(true)
        setError('Google Maps loading timed out')
      }
    }, 10000)

    return () => clearTimeout(timeout)
  }, [isLoaded, isError])

  useEffect(() => {
    loadGoogleMaps()
  }, [loadGoogleMaps])

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, isError, error }}>
      {children}
    </GoogleMapsContext.Provider>
  )
}

// Type declarations for Google Maps
declare global {
  interface Window {
    google?: {
      maps: typeof google.maps
    }
  }
}
