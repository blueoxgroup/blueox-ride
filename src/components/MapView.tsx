import { useRef, useEffect, useState, useCallback } from 'react'
import { useGoogleMaps } from '@/contexts/GoogleMapsContext'
import { Navigation, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Location {
  lat: number
  lng: number
  name?: string
}

interface RouteInfo {
  distance: string
  distanceValue: number // in meters
  duration: string
  durationValue: number // in seconds
}

interface MapViewProps {
  origin?: Location | null
  destination?: Location | null
  onOriginChange?: (location: Location) => void
  onDestinationChange?: (location: Location) => void
  onRouteCalculated?: (info: RouteInfo) => void
  showRoute?: boolean
  interactive?: boolean
  height?: string
  className?: string
}

// Uganda center coordinates
const UGANDA_CENTER = { lat: 1.3733, lng: 32.2903 }
const DEFAULT_ZOOM = 7

export function MapView({
  origin,
  destination,
  onOriginChange,
  onDestinationChange,
  onRouteCalculated,
  showRoute = true,
  interactive = false,
  height = '200px',
  className,
}: MapViewProps) {
  const { isLoaded, isError, error } = useGoogleMaps()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const originMarkerRef = useRef<google.maps.Marker | null>(null)
  const destinationMarkerRef = useRef<google.maps.Marker | null>(null)
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return

    const map = new google.maps.Map(mapRef.current, {
      center: origin || destination || UGANDA_CENTER,
      zoom: origin || destination ? 14 : DEFAULT_ZOOM,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: 'greedy',
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
      ],
    })

    mapInstanceRef.current = map

    // Initialize directions renderer
    directionsRendererRef.current = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#FF4040',
        strokeWeight: 4,
        strokeOpacity: 0.8,
      },
    })

    // Handle map clicks for interactive mode
    if (interactive) {
      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return

        const location: Location = {
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
        }

        // Reverse geocode to get place name
        const geocoder = new google.maps.Geocoder()
        geocoder.geocode({ location: e.latLng }, (results, status) => {
          if (status === 'OK' && results?.[0]) {
            location.name = results[0].formatted_address
          }

          // Set origin first, then destination
          if (!origin && onOriginChange) {
            onOriginChange(location)
          } else if (origin && !destination && onDestinationChange) {
            onDestinationChange(location)
          }
        })
      })
    }

    return () => {
      // Cleanup
      if (originMarkerRef.current) originMarkerRef.current.setMap(null)
      if (destinationMarkerRef.current) destinationMarkerRef.current.setMap(null)
      if (directionsRendererRef.current) directionsRendererRef.current.setMap(null)
    }
  }, [isLoaded, interactive])

  // Update origin marker
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return

    if (originMarkerRef.current) {
      originMarkerRef.current.setMap(null)
    }

    if (origin) {
      originMarkerRef.current = new google.maps.Marker({
        position: origin,
        map: mapInstanceRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#FF4040',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3,
        },
        title: origin.name || 'Pickup',
        draggable: interactive,
      })

      if (interactive && onOriginChange) {
        originMarkerRef.current.addListener('dragend', () => {
          const pos = originMarkerRef.current?.getPosition()
          if (pos) {
            const geocoder = new google.maps.Geocoder()
            geocoder.geocode({ location: pos }, (results, status) => {
              onOriginChange({
                lat: pos.lat(),
                lng: pos.lng(),
                name: status === 'OK' && results?.[0] ? results[0].formatted_address : undefined,
              })
            })
          }
        })
      }
    }
  }, [isLoaded, origin, interactive, onOriginChange])

  // Update destination marker
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return

    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.setMap(null)
    }

    if (destination) {
      destinationMarkerRef.current = new google.maps.Marker({
        position: destination,
        map: mapInstanceRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#193153',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3,
        },
        title: destination.name || 'Drop-off',
        draggable: interactive,
      })

      if (interactive && onDestinationChange) {
        destinationMarkerRef.current.addListener('dragend', () => {
          const pos = destinationMarkerRef.current?.getPosition()
          if (pos) {
            const geocoder = new google.maps.Geocoder()
            geocoder.geocode({ location: pos }, (results, status) => {
              onDestinationChange({
                lat: pos.lat(),
                lng: pos.lng(),
                name: status === 'OK' && results?.[0] ? results[0].formatted_address : undefined,
              })
            })
          }
        })
      }
    }
  }, [isLoaded, destination, interactive, onDestinationChange])

  // Fit bounds to show both markers
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return

    const bounds = new google.maps.LatLngBounds()
    let hasPoints = false

    if (origin) {
      bounds.extend(origin)
      hasPoints = true
    }
    if (destination) {
      bounds.extend(destination)
      hasPoints = true
    }

    if (hasPoints) {
      mapInstanceRef.current.fitBounds(bounds, 50)
      // Don't zoom in too much for single point
      const listener = google.maps.event.addListener(mapInstanceRef.current, 'idle', () => {
        const zoom = mapInstanceRef.current?.getZoom()
        if (zoom && zoom > 15) {
          mapInstanceRef.current?.setZoom(15)
        }
        google.maps.event.removeListener(listener)
      })
    }
  }, [isLoaded, origin, destination])

  // Calculate and display route
  const calculateRoute = useCallback(async () => {
    if (!isLoaded || !origin || !destination || !showRoute) return

    setIsCalculating(true)

    const directionsService = new google.maps.DirectionsService()

    try {
      const result = await directionsService.route({
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
      })

      if (directionsRendererRef.current) {
        directionsRendererRef.current.setDirections(result)
      }

      const route = result.routes[0]?.legs[0]
      if (route) {
        const info: RouteInfo = {
          distance: route.distance?.text || '',
          distanceValue: route.distance?.value || 0,
          duration: route.duration?.text || '',
          durationValue: route.duration?.value || 0,
        }
        setRouteInfo(info)
        onRouteCalculated?.(info)
      }
    } catch (error) {
      console.error('Route calculation error:', error)
      // Clear route on error
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setDirections({ routes: [] } as any)
      }
      setRouteInfo(null)
    } finally {
      setIsCalculating(false)
    }
  }, [isLoaded, origin, destination, showRoute, onRouteCalculated])

  useEffect(() => {
    if (origin && destination && showRoute) {
      calculateRoute()
    } else {
      // Clear route when one point is missing
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setDirections({ routes: [] } as any)
      }
      setRouteInfo(null)
    }
  }, [origin, destination, showRoute, calculateRoute])

  // Error state
  if (isError) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center bg-muted rounded-lg border',
          className
        )}
        style={{ height }}
      >
        <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground text-center px-4">
          {error || 'Maps unavailable'}
        </p>
        {origin && destination && (
          <p className="text-xs text-muted-foreground mt-2">
            Route: {origin.name} → {destination.name}
          </p>
        )}
      </div>
    )
  }

  // Loading state
  if (!isLoaded) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted rounded-lg border',
          className
        )}
        style={{ height }}
      >
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className={cn('relative rounded-lg overflow-hidden border', className)}>
      <div ref={mapRef} style={{ height, width: '100%' }} />

      {/* Route info overlay */}
      {routeInfo && (
        <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-coral-500" />
              <span className="font-medium">{routeInfo.distance}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>~{routeInfo.duration}</span>
            </div>
          </div>
        </div>
      )}

      {/* Calculating indicator */}
      {isCalculating && (
        <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm rounded-full p-2 shadow">
          <Loader2 className="w-4 h-4 animate-spin text-coral-500" />
        </div>
      )}

      {/* Legend */}
      {(origin || destination) && (
        <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm rounded-lg p-2 shadow text-xs space-y-1">
          {origin && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-coral-500 border-2 border-white shadow" />
              <span className="truncate max-w-[120px]">Pickup</span>
            </div>
          )}
          {destination && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-navy-900 border-2 border-white shadow" />
              <span className="truncate max-w-[120px]">Drop-off</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
