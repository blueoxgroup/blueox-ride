import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PlaceInput } from '@/components/PlaceInput'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, calculateBookingFee } from '@/lib/utils'
import { ArrowLeft, Info } from 'lucide-react'

interface LocationData {
  name: string
  lat: number | null
  lng: number | null
}

export default function CreateRidePage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [origin, setOrigin] = useState<LocationData>({ name: '', lat: null, lng: null })
  const [destination, setDestination] = useState<LocationData>({ name: '', lat: null, lng: null })
  const [departureDate, setDepartureDate] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  const [price, setPrice] = useState('')
  const [seats, setSeats] = useState('3')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  // Check if user has phone number for driver contact
  const hasPhoneNumber = !!profile?.phone_number

  const handleOriginChange = (name: string, lat?: number, lng?: number) => {
    setOrigin({
      name,
      lat: lat ?? null,
      lng: lng ?? null,
    })
  }

  const handleDestinationChange = (name: string, lat?: number, lng?: number) => {
    setDestination({
      name,
      lat: lat ?? null,
      lng: lng ?? null,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: 'Not logged in',
        description: 'Please log in to create a ride.',
        variant: 'destructive',
      })
      return
    }

    if (!hasPhoneNumber) {
      toast({
        title: 'Phone number required',
        description: 'Please add your phone number in your profile before offering rides.',
        variant: 'destructive',
      })
      navigate('/profile')
      return
    }

    // Validate locations
    if (!origin.name || !destination.name) {
      toast({
        title: 'Missing locations',
        description: 'Please enter both pickup and drop-off locations.',
        variant: 'destructive',
      })
      return
    }

    // Use default coordinates for Uganda if not available
    const originLat = origin.lat ?? 0.3476
    const originLng = origin.lng ?? 32.5825
    const destLat = destination.lat ?? 0.3476
    const destLng = destination.lng ?? 32.5825

    const departureDateTime = new Date(`${departureDate}T${departureTime}`)

    if (departureDateTime <= new Date()) {
      toast({
        title: 'Invalid departure time',
        description: 'Departure time must be in the future.',
        variant: 'destructive',
      })
      return
    }

    const priceNum = parseInt(price)
    if (isNaN(priceNum) || priceNum < 1000) {
      toast({
        title: 'Invalid price',
        description: 'Please enter a valid price (minimum 1,000 UGX).',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    const { data, error } = await supabase.from('rides').insert({
      driver_id: user.id,
      origin_name: origin.name,
      origin_lat: originLat,
      origin_lng: originLng,
      destination_name: destination.name,
      destination_lat: destLat,
      destination_lng: destLng,
      departure_time: departureDateTime.toISOString(),
      price: priceNum,
      total_seats: parseInt(seats),
      available_seats: parseInt(seats),
      notes: notes || null,
      status: 'active',
    }).select().single()

    if (error) {
      console.error('Create ride error:', error)
      toast({
        title: 'Failed to create ride',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Ride created!',
        description: 'Your ride has been published.',
        variant: 'success',
      })
      navigate(`/rides/${data.id}`)
    }

    setLoading(false)
  }

  const priceNum = parseInt(price) || 0
  const bookingFee = calculateBookingFee(priceNum)

  // Get minimum date and time
  const now = new Date()
  const minDate = now.toISOString().split('T')[0]
  const minTime = departureDate === minDate ? now.toTimeString().slice(0, 5) : '00:00'

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="bg-avocado-600 pt-12 pb-6 px-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-white/80 hover:text-white mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back
          </button>
          <h1 className="text-xl font-semibold text-white">Offer a Ride</h1>
          <p className="text-avocado-100 text-sm mt-1">
            Share your journey with other travelers
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="px-4 -mt-4">
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-6">
            {!hasPhoneNumber && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Phone number required:</strong> Please add your phone number in your profile before offering rides. Passengers need to contact you.
                </p>
                <Button
                  variant="link"
                  className="p-0 h-auto text-yellow-800 underline"
                  onClick={() => navigate('/profile')}
                >
                  Go to profile
                </Button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Route */}
              <div className="space-y-3">
                <Label>Route</Label>
                <PlaceInput
                  value={origin.name}
                  onChange={handleOriginChange}
                  placeholder="Pickup location"
                  markerColor="green"
                />
                <PlaceInput
                  value={destination.name}
                  onChange={handleDestinationChange}
                  placeholder="Drop-off location"
                  markerColor="red"
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    min={minDate}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    min={minTime}
                    required
                  />
                </div>
              </div>

              {/* Price & Seats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="price">Price per seat (UGX)</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="e.g., 15000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    min="1000"
                    step="500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seats">Available seats</Label>
                  <Input
                    id="seats"
                    type="number"
                    value={seats}
                    onChange={(e) => setSeats(e.target.value)}
                    min="1"
                    max="8"
                    required
                  />
                </div>
              </div>

              {/* Price Breakdown */}
              {priceNum > 0 && (
                <div className="p-4 bg-avocado-50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Your price per seat</span>
                    <span className="font-medium">{formatCurrency(priceNum)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Passenger pays to book (10%)</span>
                    <span className="text-avocado-600">{formatCurrency(bookingFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-avocado-200">
                    <span className="text-muted-foreground">You receive in cash (90%)</span>
                    <span className="font-semibold">{formatCurrency(priceNum - bookingFee)}</span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <textarea
                  id="notes"
                  className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Any additional info (e.g., luggage space, pickup point details)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  Passengers pay 10% booking fee online. You collect the remaining 90% in cash after the ride.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={loading}
                disabled={!hasPhoneNumber}
              >
                Publish Ride
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
