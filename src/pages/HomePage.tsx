import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Ride } from '@/types'
import { Search, MapPin, Calendar, Users, Star, Plus, ArrowRight } from 'lucide-react'

interface RideWithDriver extends Ride {
  driver_name: string
  driver_avatar: string | null
  driver_rating: number | null
  driver_total_rides: number
}

export default function HomePage() {
  const { user, profile } = useAuth()
  const [searchOrigin, setSearchOrigin] = useState('')
  const [searchDestination, setSearchDestination] = useState('')
  const [rides, setRides] = useState<RideWithDriver[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRides()
  }, [])

  const fetchRides = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('rides_with_driver')
      .select('*')
      .eq('status', 'active')
      .gt('departure_time', new Date().toISOString())
      .order('departure_time', { ascending: true })
      .limit(20)

    if (error) {
      console.error('Error fetching rides:', error)
    } else {
      setRides(data as RideWithDriver[])
    }
    setLoading(false)
  }

  const searchRides = async () => {
    setLoading(true)
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

    const { data, error } = await query.limit(50)

    if (error) {
      console.error('Error searching rides:', error)
    } else {
      setRides(data as RideWithDriver[])
    }
    setLoading(false)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    searchRides()
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-avocado-600 to-avocado-500 pt-12 pb-8 px-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-avocado-100 text-sm">Hello,</p>
              <h1 className="text-xl font-semibold text-white">
                {profile?.full_name || 'Welcome'}
              </h1>
            </div>
            <Link to="/profile">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold">
                {profile?.full_name?.[0]?.toUpperCase() || '?'}
              </div>
            </Link>
          </div>

          {/* Search Box */}
          <Card className="shadow-lg">
            <CardContent className="p-4">
              <form onSubmit={handleSearch} className="space-y-3">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-avocado-500" />
                  <Input
                    placeholder="From where?"
                    value={searchOrigin}
                    onChange={(e) => setSearchOrigin(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
                  <Input
                    placeholder="To where?"
                    value={searchDestination}
                    onChange={(e) => setSearchDestination(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button type="submit" className="w-full">
                  <Search className="w-4 h-4 mr-2" />
                  Search Rides
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 -mt-4">
        <div className="max-w-lg mx-auto">
          <div className="flex gap-3">
            <Link to="/rides/create" className="flex-1">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-avocado-100 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-avocado-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Offer a Ride</p>
                    <p className="text-xs text-muted-foreground">Share your trip</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link to="/my-rides" className="flex-1">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-avocado-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-avocado-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">My Rides</p>
                    <p className="text-xs text-muted-foreground">View bookings</p>
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

      {/* Payment Info Banner */}
      <div className="px-4 mt-6">
        <div className="max-w-lg mx-auto">
          <Card className="bg-avocado-50 border-avocado-200">
            <CardContent className="p-4">
              <h3 className="font-medium text-avocado-800 mb-2">How payments work</h3>
              <ul className="text-sm text-avocado-700 space-y-1">
                <li>• Pay only 10% to book your seat</li>
                <li>• Get driver's contact after payment</li>
                <li>• Pay remaining 90% in cash after ride</li>
              </ul>
            </CardContent>
          </Card>
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
