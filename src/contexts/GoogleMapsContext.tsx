import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

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

  useEffect(() => {
    // Check if already loaded
    if (window.google?.maps?.places) {
      console.log('Google Maps already loaded')
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
      // Poll for the google object to be available
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
          console.log('Google Maps loaded (polling)')
          setIsLoaded(true)
          clearInterval(checkLoaded)
        }
      }, 100)

      // Timeout after 10 seconds
      const timeout = setTimeout(() => {
        clearInterval(checkLoaded)
        if (!window.google?.maps?.places) {
          setIsError(true)
          setError('Google Maps loading timed out')
        }
      }, 10000)

      return () => {
        clearInterval(checkLoaded)
        clearTimeout(timeout)
      }
    }

    // Create and load script
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry`
    script.async = true
    script.defer = true

    script.onload = () => {
      console.log('Google Maps script loaded')
      // Wait a moment for the API to initialize
      setTimeout(() => {
        if (window.google?.maps?.places) {
          setIsLoaded(true)
        }
      }, 100)
    }

    script.onerror = () => {
      setIsError(true)
      setError('Failed to load Google Maps. Please check your internet connection.')
    }

    document.head.appendChild(script)

    // Timeout fallback
    const timeout = setTimeout(() => {
      if (!window.google?.maps?.places) {
        setIsError(true)
        setError('Google Maps loading timed out')
      }
    }, 10000)

    return () => clearTimeout(timeout)
  }, [])

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
