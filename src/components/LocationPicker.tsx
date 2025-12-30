import { useState, useRef, useEffect, useCallback } from 'react'
import { useGoogleMaps } from '@/contexts/GoogleMapsContext'
import { Input } from '@/components/ui/input'
import { MapPin, Loader2, X } from 'lucide-react'
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
}

interface Suggestion {
  placeId: string
  mainText: string
  secondaryText: string
  fullText: string
}

export function LocationPicker({
  value,
  onChange,
  placeholder = 'Search location',
  markerColor = 'pickup',
  className,
}: LocationPickerProps) {
  const { isLoaded, isError } = useGoogleMaps()
  const [input, setInput] = useState(value?.name || '')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)

  // Update input when value changes externally
  useEffect(() => {
    setInput(value?.name || '')
  }, [value?.name])

  // Initialize legacy services as fallback
  useEffect(() => {
    if (isLoaded && !autocompleteServiceRef.current) {
      try {
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService()
        const dummyElement = document.createElement('div')
        placesServiceRef.current = new google.maps.places.PlacesService(dummyElement)
        console.log('Legacy Places services initialized')
      } catch (e) {
        console.log('Could not initialize legacy Places services:', e)
      }
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

  // Try new API first, fall back to legacy
  const fetchSuggestions = useCallback(async (searchText: string) => {
    console.log('fetchSuggestions called:', { searchText, isLoaded })

    if (!searchText || searchText.length < 2) {
      setSuggestions([])
      return
    }

    if (!isLoaded) {
      console.log('Google Maps not loaded yet')
      return
    }

    setLoading(true)

    // Try new API first
    try {
      if (typeof google.maps.places.AutocompleteSuggestion?.fetchAutocompleteSuggestions === 'function') {
        console.log('Using new Places API')
        const { suggestions: results } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: searchText,
          includedRegionCodes: ['UG'],
        })

        if (results && results.length > 0) {
          const mappedSuggestions: Suggestion[] = results.map((suggestion) => {
            const placePrediction = suggestion.placePrediction
            return {
              placeId: placePrediction?.placeId || '',
              mainText: placePrediction?.mainText?.text || '',
              secondaryText: placePrediction?.secondaryText?.text || '',
              fullText: placePrediction?.text?.text || '',
            }
          })
          setSuggestions(mappedSuggestions)
          setShowDropdown(true)
          setLoading(false)
          return
        }
      }
    } catch (error) {
      console.log('New API failed, trying legacy:', error)
    }

    // Fall back to legacy API
    if (autocompleteServiceRef.current) {
      console.log('Using legacy Places API')
      try {
        autocompleteServiceRef.current.getPlacePredictions(
          {
            input: searchText,
            componentRestrictions: { country: 'ug' },
          },
          (results, status) => {
            console.log('Legacy API results:', { status, count: results?.length })
            setLoading(false)
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              const mappedSuggestions: Suggestion[] = results.map((r) => ({
                placeId: r.place_id,
                mainText: r.structured_formatting?.main_text || r.description,
                secondaryText: r.structured_formatting?.secondary_text || '',
                fullText: r.description,
              }))
              setSuggestions(mappedSuggestions)
              setShowDropdown(true)
            } else {
              setSuggestions([])
            }
          }
        )
        return
      } catch (error) {
        console.error('Legacy API error:', error)
      }
    }

    setLoading(false)
    setSuggestions([])
  }, [isLoaded])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInput(newValue)

    if (value) {
      onChange(null)
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue)
    }, 300)
  }

  // Handle place selection
  const handleSelectPlace = async (suggestion: Suggestion) => {
    setInput(suggestion.fullText || suggestion.mainText)
    setShowDropdown(false)
    setSuggestions([])
    setLoading(true)

    // Try new API first
    try {
      if (typeof google.maps.places.Place === 'function') {
        console.log('Using new Place API for details')
        const place = new google.maps.places.Place({
          id: suggestion.placeId,
        })

        await place.fetchFields({
          fields: ['location', 'displayName', 'formattedAddress'],
        })

        if (place.location) {
          onChange({
            lat: place.location.lat(),
            lng: place.location.lng(),
            name: suggestion.fullText || suggestion.mainText,
          })
          setLoading(false)
          return
        }
      }
    } catch (error) {
      console.log('New Place API failed, trying legacy:', error)
    }

    // Fall back to legacy API
    if (placesServiceRef.current) {
      console.log('Using legacy PlacesService for details')
      placesServiceRef.current.getDetails(
        {
          placeId: suggestion.placeId,
          fields: ['geometry', 'name', 'formatted_address'],
        },
        (result, status) => {
          setLoading(false)
          if (status === google.maps.places.PlacesServiceStatus.OK && result?.geometry?.location) {
            onChange({
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng(),
              name: suggestion.fullText || suggestion.mainText,
            })
          } else {
            onChange({
              lat: 0,
              lng: 0,
              name: suggestion.fullText || suggestion.mainText,
            })
          }
        }
      )
      return
    }

    // Final fallback - just use the name
    setLoading(false)
    onChange({
      lat: 0,
      lng: 0,
      name: suggestion.fullText || suggestion.mainText,
    })
  }

  // Clear location
  const handleClear = () => {
    setInput('')
    onChange(null)
    setSuggestions([])
  }

  const iconColor = markerColor === 'pickup' ? 'text-coral-500' : 'text-navy-900'

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <MapPin className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', iconColor)} />
        <Input
          value={input}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
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

      {/* Suggestions dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.placeId}
              type="button"
              onClick={() => handleSelectPlace(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b last:border-b-0"
            >
              <p className="font-medium text-sm truncate">
                {suggestion.mainText}
              </p>
              {suggestion.secondaryText && (
                <p className="text-xs text-muted-foreground truncate">
                  {suggestion.secondaryText}
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
