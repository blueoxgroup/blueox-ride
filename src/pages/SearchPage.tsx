import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Ride, User } from '@/types'
import { Search, MapPin, Calendar, Users, Star, Filter, X } from 'lucide-react'

interface RideWithDriver extends Ride {
  driver_name: string
  driver_avatar: string | null
  driver_rating: number | null
}

export default function SearchPage() {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [date, setDate] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minSeats, setMinSeats] = useState('1')
  const [showFilters, setShowFilters] = useState(false)
  const [rides, setRides] = useState<RideWithDriver[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    setLoading(true)
    setHasSearched(true)

    let query = supabase
      .from('rides_with_driver')
      .select('*')
      .eq('status', 'active')
      .gt('departure_time', new Date().toISOString())
      .gte('available_seats', parseInt(minSeats) || 1)
      .order('departure_time', { ascending: true })

    if (origin) {
      query = query.ilike('origin_name', `%${origin}%`)
    }
    if (destination) {
      query = query.ilike('destination_name', `%${destination}%`)
    }
    if (date) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      query = query
        .gte('departure_time', startOfDay.toISOString())
        .lte('departure_time', endOfDay.toISOString())
    }
    if (maxPrice) {
      query = query.lte('price', parseInt(maxPrice))
    }

    const { data, error } = await query.limit(50)

    if (error) {
      console.error('Search error:', error)
    } else {
      setRides(data as RideWithDriver[])
    }

    setLoading(false)
  }

  const clearFilters = () => {
    setOrigin('')
    setDestination('')
    setDate('')
    setMaxPrice('')
    setMinSeats('1')
  }

  const hasActiveFilters = origin || destination || date || maxPrice || minSeats !== '1'

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-avocado-600 pt-12 pb-6 px-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-semibold text-white mb-4">Search Rides</h1>

          {/* Main Search */}
          <div className="space-y-3">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-avocado-500" />
              <Input
                placeholder="From where?"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
              <Input
                placeholder="To where?"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-shrink-0"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-2 w-5 h-5 bg-avocado-600 text-white rounded-full text-xs flex items-center justify-center">
                    !
                  </span>
                )}
              </Button>
              <Button className="flex-1" onClick={handleSearch}>
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="px-4 py-4 bg-muted border-b">
          <div className="max-w-lg mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Filters</span>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="date" className="text-xs">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="minSeats" className="text-xs">Min Seats</Label>
                <Input
                  id="minSeats"
                  type="number"
                  min="1"
                  max="8"
                  value={minSeats}
                  onChange={(e) => setMinSeats(e.target.value)}
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label htmlFor="maxPrice" className="text-xs">Max Price (UGX)</Label>
                <Input
                  id="maxPrice"
                  type="number"
                  placeholder="e.g., 50000"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="px-4 mt-4">
        <div className="max-w-lg mx-auto">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="skeleton h-20 rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !hasSearched ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Enter your route to find available rides
              </p>
            </div>
          ) : rides.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-2">No rides found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search criteria
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                {rides.length} ride{rides.length !== 1 ? 's' : ''} found
              </p>
              <div className="space-y-3">
                {rides.map((ride) => (
                  <RideCard key={ride.id} ride={ride} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function RideCard({ ride }: { ride: RideWithDriver }) {
  return (
    <Link to={`/rides/${ride.id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-avocado-500" />
                <p className="font-medium text-sm truncate">{ride.origin_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                <p className="font-medium text-sm truncate">{ride.destination_name}</p>
              </div>
            </div>
            <div className="text-right ml-4">
              <p className="font-bold text-avocado-600">{formatCurrency(ride.price)}</p>
              <p className="text-xs text-muted-foreground">per seat</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(ride.departure_time)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {ride.available_seats} seats
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <div className="w-8 h-8 rounded-full bg-avocado-100 flex items-center justify-center text-avocado-700 text-xs font-medium">
              {ride.driver_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{ride.driver_name}</p>
            </div>
            {ride.driver_rating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm">{ride.driver_rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
