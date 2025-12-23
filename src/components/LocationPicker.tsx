import { useState, useRef, useEffect, useCallback } from 'react'
import { useGoogleMaps } from '@/contexts/GoogleMapsContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MapPin, Loader2, Map, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Location {
  lat: number
  lng: number
  name: string
}

interface LocationPickerProps {
  value: Location | null
  onChange: (location: Location | null) => void
  placeholder?: string
  markerColor?: 'pickup' | 'dropoff'
  className?: string
  showMapButton?: boolean
  onMapClick?: () => void
}

interface Prediction {
  place_id: string
  description: string
  structured_formatting?: {
    main_text: string
    secondary_text: string
  }
}

// Fallback API key from env
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

export function LocationPicker({
  value,
  onChange,
  placeholder = 'Search location',
  markerColor = 'pickup',
  className,
  showMapButton = true,
  onMapClick,
}: LocationPickerProps) {
  const { isLoaded, isError } = useGoogleMaps()
  const [input, setInput] = useState(value?.name || '')
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Update input when value changes externally
  useEffect(() => {
    setInput(value?.name || '')
  }, [value?.name])

  // Initialize services when Google Maps loads
  useEffect(() => {
    if (isLoaded && !autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService()
      // Create a dummy element for PlacesService
      const dummyElement = document.createElement('div')
      placesServiceRef.current = new google.maps.places.PlacesService(dummyElement)
    }
  }, [isLoaded])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch predictions using Google Maps API
  const fetchPredictions = useCallback(async (searchText: string) => {
    if (!searchText || searchText.length < 2) {
      setPredictions([])
      return
    }

    setLoading(true)

    // Try native API first
    if (isLoaded && autocompleteServiceRef.current) {
      try {
        const request: google.maps.places.AutocompletionRequest = {
          input: searchText,
          componentRestrictions: { country: 'ug' },
        }

        autocompleteServiceRef.current.getPlacePredictions(request, (results, status) => {
          setLoading(false)
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results.map(r => ({
              place_id: r.place_id,
              description: r.description,
              structured_formatting: r.structured_formatting,
            })))
            setShowDropdown(true)
          } else {
            setPredictions([])
          }
        })
        return
      } catch (error) {
        console.error('Native autocomplete error:', error)
      }
    }

    // Fallback to CORS proxy
    if (GOOGLE_MAPS_API_KEY) {
      try {
        const encodedInput = encodeURIComponent(searchText)
        const url = `https://corsproxy.io/?${encodeURIComponent(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodedInput}&components=country:ug&key=${GOOGLE_MAPS_API_KEY}`
        )}`

        const response = await fetch(url)
        const data = await response.json()

        if (data.predictions) {
          setPredictions(data.predictions)
          setShowDropdown(true)
        }
      } catch (error) {
        console.error('Fallback autocomplete error:', error)
        setPredictions([])
      }
    }

    setLoading(false)
  }, [isLoaded])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInput(newValue)

    // Clear location when typing
    if (value) {
      onChange(null)
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      fetchPredictions(newValue)
    }, 300)
  }

  // Handle place selection
  const handleSelectPlace = async (prediction: Prediction) => {
    setInput(prediction.description)
    setShowDropdown(false)
    setPredictions([])
    setLoading(true)

    // Try native API first
    if (isLoaded && placesServiceRef.current) {
      try {
        placesServiceRef.current.getDetails(
          {
            placeId: prediction.place_id,
            fields: ['geometry', 'name', 'formatted_address'],
          },
          (result, status) => {
            setLoading(false)
            if (status === google.maps.places.PlacesServiceStatus.OK && result?.geometry?.location) {
              onChange({
                lat: result.geometry.location.lat(),
                lng: result.geometry.location.lng(),
                name: prediction.description,
              })
            } else {
              // Fallback: just use the name without coordinates
              onChange({
                lat: 0,
                lng: 0,
                name: prediction.description,
              })
            }
          }
        )
        return
      } catch (error) {
        console.error('Native place details error:', error)
      }
    }

    // Fallback to CORS proxy
    if (GOOGLE_MAPS_API_KEY) {
      try {
        const url = `https://corsproxy.io/?${encodeURIComponent(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,name&key=${GOOGLE_MAPS_API_KEY}`
        )}`

        const response = await fetch(url)
        const data = await response.json()

        if (data.result?.geometry?.location) {
          const { lat, lng } = data.result.geometry.location
          onChange({
            lat,
            lng,
            name: prediction.description,
          })
        } else {
          onChange({
            lat: 0,
            lng: 0,
            name: prediction.description,
          })
        }
      } catch (error) {
        console.error('Fallback place details error:', error)
        onChange({
          lat: 0,
          lng: 0,
          name: prediction.description,
        })
      }
    }

    setLoading(false)
  }

  // Clear location
  const handleClear = () => {
    setInput('')
    onChange(null)
    setPredictions([])
  }

  const iconColor = markerColor === 'pickup' ? 'text-coral-500' : 'text-navy-900'

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <MapPin className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', iconColor)} />
          <Input
            value={input}
            onChange={handleInputChange}
            onFocus={() => predictions.length > 0 && setShowDropdown(true)}
            placeholder={placeholder}
            className="pl-10 pr-10"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
          {!loading && value && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {showMapButton && onMapClick && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onMapClick}
            className="shrink-0"
          >
            <Map className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Predictions dropdown */}
      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-auto">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handleSelectPlace(prediction)}
              className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b last:border-b-0"
            >
              <p className="font-medium text-sm truncate">
                {prediction.structured_formatting?.main_text || prediction.description}
              </p>
              {prediction.structured_formatting?.secondary_text && (
                <p className="text-xs text-muted-foreground truncate">
                  {prediction.structured_formatting.secondary_text}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Error fallback message */}
      {isError && (
        <p className="text-xs text-muted-foreground mt-1">
          Location search limited. You can still type an address manually.
        </p>
      )}
    </div>
  )
}
