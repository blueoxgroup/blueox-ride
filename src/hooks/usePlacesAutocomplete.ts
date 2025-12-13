import { useState, useEffect, useCallback, useRef } from 'react'

interface PlacePrediction {
  place_id: string
  description: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
}

interface PlaceDetails {
  name: string
  formatted_address: string
  lat: number
  lng: number
}

interface UsePlacesAutocompleteOptions {
  apiKey: string
  debounceMs?: number
  country?: string
}

export function usePlacesAutocomplete(options: UsePlacesAutocompleteOptions) {
  const { apiKey, debounceMs = 300, country = 'ug' } = options
  const [input, setInput] = useState('')
  const [predictions, setPredictions] = useState<PlacePrediction[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const fetchPredictions = useCallback(async (inputText: string) => {
    if (!inputText || inputText.length < 2) {
      setPredictions([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          inputText
        )}&components=country:${country}&key=${apiKey}`
      )
      const data = await response.json()

      if (data.predictions) {
        setPredictions(data.predictions)
      }
    } catch (error) {
      console.error('Places autocomplete error:', error)
      setPredictions([])
    } finally {
      setLoading(false)
    }
  }, [apiKey, country])

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      fetchPredictions(input)
    }, debounceMs)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [input, fetchPredictions, debounceMs])

  const getPlaceDetails = useCallback(async (placeId: string): Promise<PlaceDetails | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry&key=${apiKey}`
      )
      const data = await response.json()

      if (data.result) {
        return {
          name: data.result.name || data.result.formatted_address,
          formatted_address: data.result.formatted_address,
          lat: data.result.geometry.location.lat,
          lng: data.result.geometry.location.lng,
        }
      }
      return null
    } catch (error) {
      console.error('Place details error:', error)
      return null
    }
  }, [apiKey])

  const clearPredictions = useCallback(() => {
    setPredictions([])
  }, [])

  return {
    input,
    setInput,
    predictions,
    loading,
    getPlaceDetails,
    clearPredictions,
  }
}

// Simpler version that works with Google Maps JavaScript SDK
export function useGooglePlaces() {
  const [isLoaded, setIsLoaded] = useState(false)
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)

  useEffect(() => {
    // Check if Google Maps is loaded
    if (window.google?.maps?.places) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
      // PlacesService requires a DOM element or map
      const div = document.createElement('div')
      placesServiceRef.current = new window.google.maps.places.PlacesService(div)
      setIsLoaded(true)
    }
  }, [])

  const searchPlaces = useCallback(async (input: string): Promise<PlacePrediction[]> => {
    if (!autocompleteServiceRef.current || !input) return []

    return new Promise((resolve) => {
      autocompleteServiceRef.current!.getPlacePredictions(
        {
          input,
          componentRestrictions: { country: 'ug' },
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            resolve(predictions as unknown as PlacePrediction[])
          } else {
            resolve([])
          }
        }
      )
    })
  }, [])

  const getPlaceDetails = useCallback(async (placeId: string): Promise<PlaceDetails | null> => {
    if (!placesServiceRef.current) return null

    return new Promise((resolve) => {
      placesServiceRef.current!.getDetails(
        {
          placeId,
          fields: ['name', 'formatted_address', 'geometry'],
        },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
            resolve({
              name: place.name || place.formatted_address || '',
              formatted_address: place.formatted_address || '',
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            })
          } else {
            resolve(null)
          }
        }
      )
    })
  }, [])

  return {
    isLoaded,
    searchPlaces,
    getPlaceDetails,
  }
}
