import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase, withTimeout, RequestTimeoutError } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Ride } from '@/types'
import { Search, Calendar, Users, Star, Plus, ArrowRight, RefreshCw, Shield, Wallet, UserCheck } from 'lucide-react'

interface RideWithDriver extends Ride {
  driver_name: string
  driver_avatar: string | null
  driver_rating: number | null
  driver_total_rides: number
  car_photo_url: string | null
}

export default function HomePage() {
  const { user, profile } = useAuth()
  const [searchOrigin, setSearchOrigin] = useState('')
  const [searchDestination, setSearchDestination] = useState('')
  const [rides, setRides] = useState<RideWithDriver[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasFetched = useRef(false)

  const fetchRides = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await withTimeout(
        supabase
          .from('rides_with_driver')
          .select('*')
          .eq('status', 'active')
          .gt('departure_time', new Date().toISOString())
          .order('departure_time', { ascending: true })
          .limit(20),
        15000
      )

      if (fetchError) {
        console.error('Error fetching rides:', fetchError)
        setError('Failed to load rides. Please try again.')
      } else {
        setRides(data as RideWithDriver[])
      }
    } catch (err) {
      if (err instanceof RequestTimeoutError) {
        console.error('Request timed out')
        setError('Request timed out. Please check your connection.')
      } else {
        console.error('Fetch error:', err)
        setError('An error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Only fetch once on mount
    if (!hasFetched.current) {
      hasFetched.current = true
      fetchRides()
    }
  }, [fetchRides])

  const searchRides = async () => {
    // Prevent search if already searching
    if (searching) return

    setSearching(true)
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('rides_with_driver')
        .select('*')
        .eq('status', 'active')
        .gt('departure_time', new Date().toISOString())
        .order('departure_time', { ascending: true })

      if (searchOrigin) {
        query = query.ilike('origin_name', `%${searchOrigin}%`)
      }
      if (searchDestination) {
        query = query.ilike('destination_name', `%${searchDestination}%`)
      }

      const { data, error: searchError } = await withTimeout(query.limit(50), 15000)

      if (searchError) {
        console.error('Error searching rides:', searchError)
        setError('Search failed. Please try again.')
      } else {
        setRides(data as RideWithDriver[])
      }
    } catch (err) {
      if (err instanceof RequestTimeoutError) {
        console.error('Search timed out')
        setError('Search timed out. Please try again.')
      } else {
        console.error('Search error:', err)
        setError('An error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    searchRides()
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-avocado-600 to-avocado-500 pt-8 pb-10 px-4">
        <div className="max-w-lg mx-auto">
          {/* Header with Logo */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img
                src="/assets/logo1.png"
                alt="BlueOx Rides"
                className="w-10 h-10 object-contain"
              />
              <span className="text-white font-bold text-lg">BlueOx Rides</span>
            </div>
            {user ? (
              <Link to="/profile">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold">
                  {profile?.full_name?.[0]?.toUpperCase() || '?'}
                </div>
              </Link>
            ) : (
              <Link to="/login">
                <div className="px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium hover:bg-white/30 transition-colors">
                  Sign In
                </div>
              </Link>
            )}
          </div>

          {/* Hero Message */}
          <div className="text-center mb-6">
            {user ? (
              <div>
                <p className="text-avocado-100 text-sm mb-1">Welcome back,</p>
                <h1 className="text-2xl font-bold text-white">
                  {profile?.full_name?.split(' ')[0] || 'Traveler'}
                </h1>
                <p className="text-avocado-100 mt-2">Where are you heading today?</p>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Travel together, pay less
                </h1>
                <p className="text-avocado-100 text-base">
                  Find trusted drivers going your way across Uganda
                </p>
              </div>
            )}
          </div>

          {/* Search Box */}
          <Card className="shadow-lg">
            <CardContent className="p-4">
              <form onSubmit={handleSearch} className="space-y-3">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-avocado-500" />
                  <Input
                    placeholder="Leaving from..."
                    value={searchOrigin}
                    onChange={(e) => setSearchOrigin(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-destructive" />
                  <Input
                    placeholder="Going to..."
                    value={searchDestination}
                    onChange={(e) => setSearchDestination(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={searching}>
                  {searching ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Find a Ride
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Value Props - Only show to non-logged in users */}
      {!user && (
        <div className="px-4 py-6 bg-avocado-50 border-b">
          <div className="max-w-lg mx-auto">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="w-10 h-10 rounded-full bg-avocado-100 flex items-center justify-center mx-auto mb-2">
                  <Wallet className="w-5 h-5 text-avocado-600" />
                </div>
                <p className="text-xs font-medium text-avocado-800">Save Money</p>
                <p className="text-xs text-avocado-600">Split travel costs</p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-full bg-avocado-100 flex items-center justify-center mx-auto mb-2">
                  <UserCheck className="w-5 h-5 text-avocado-600" />
                </div>
                <p className="text-xs font-medium text-avocado-800">Verified Users</p>
                <p className="text-xs text-avocado-600">Trusted community</p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-full bg-avocado-100 flex items-center justify-center mx-auto mb-2">
                  <Shield className="w-5 h-5 text-avocado-600" />
                </div>
                <p className="text-xs font-medium text-avocado-800">Secure Pay</p>
                <p className="text-xs text-avocado-600">Mobile Money</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className={`px-4 ${user ? '-mt-4' : 'mt-4'}`}>
        <div className="max-w-lg mx-auto">
          <div className="flex gap-3">
            <Link to={user ? '/rides/create' : '/login'} state={!user ? { from: '/rides/create' } : undefined} className="flex-1">
              <Card className="hover:shadow-md transition-shadow border-2 border-transparent hover:border-avocado-200">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-avocado-100 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-avocado-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Offer a Ride</p>
                    <p className="text-xs text-muted-foreground">Earn by sharing your trip</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link to={user ? '/my-rides' : '/login'} state={!user ? { from: '/my-rides' } : undefined} className="flex-1">
              <Card className="hover:shadow-md transition-shadow border-2 border-transparent hover:border-avocado-200">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-avocado-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-avocado-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">My Rides</p>
                    <p className="text-xs text-muted-foreground">View your bookings</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>

      {/* Available Rides */}
      <div className="px-4 mt-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Available Rides</h2>
            <Link to="/search" className="text-sm text-primary flex items-center">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

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
          ) : error ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={fetchRides} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : rides.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No rides available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Check back later or offer your own ride
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {rides.map((ride) => (
                <RideCard key={ride.id} ride={ride} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* How It Works - Only show to non-logged in users */}
      {!user && (
        <div className="px-4 mt-6">
          <div className="max-w-lg mx-auto">
            <Card className="bg-avocado-50 border-avocado-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-avocado-800 mb-3">How it works</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-avocado-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                    <div>
                      <p className="text-sm font-medium text-avocado-800">Find your ride</p>
                      <p className="text-xs text-avocado-600">Search for drivers going your way</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-avocado-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                    <div>
                      <p className="text-sm font-medium text-avocado-800">Book with 10% deposit</p>
                      <p className="text-xs text-avocado-600">Pay via Mobile Money to secure your seat</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-avocado-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                    <div>
                      <p className="text-sm font-medium text-avocado-800">Travel and pay the rest</p>
                      <p className="text-xs text-avocado-600">Pay 90% in cash to your driver after the ride</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Payment Info - For logged in users */}
      {user && (
        <div className="px-4 mt-6">
          <div className="max-w-lg mx-auto">
            <Card className="bg-avocado-50 border-avocado-200">
              <CardContent className="p-4">
                <h3 className="font-medium text-avocado-800 mb-2">Payment reminder</h3>
                <p className="text-sm text-avocado-700">
                  Book with 10% via Mobile Money, pay 90% cash to driver after the ride.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

function RideCard({ ride }: { ride: RideWithDriver }) {
  return (
    <Link to={`/rides/${ride.id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          {/* Car Photo Banner */}
          {ride.car_photo_url && (
            <div className="aspect-[3/1] rounded-lg overflow-hidden bg-muted mb-3 -mx-1 -mt-1">
              <img
                src={ride.car_photo_url}
                alt="Driver's car"
                className="w-full h-full object-cover"
              />
            </div>
          )}

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
