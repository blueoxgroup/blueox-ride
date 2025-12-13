// Database types matching our Supabase schema

export type UserRole = 'passenger' | 'driver' | 'admin'

export type RideStatus = 'active' | 'full' | 'completed' | 'cancelled'

export type BookingStatus = 'pending_payment' | 'confirmed' | 'cancelled_by_passenger' | 'cancelled_by_driver' | 'completed'

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'

export type PaymentType = 'booking_fee' | 'refund_to_passenger' | 'refund_to_driver'

export interface User {
  id: string
  email: string
  full_name: string
  phone_number: string | null
  avatar_url: string | null
  role: UserRole
  average_rating: number | null
  total_rides: number
  created_at: string
  updated_at: string
}

export interface Ride {
  id: string
  driver_id: string
  driver?: User
  origin_name: string
  origin_lat: number
  origin_lng: number
  destination_name: string
  destination_lat: number
  destination_lng: number
  departure_time: string
  price: number
  available_seats: number
  total_seats: number
  status: RideStatus
  distance_km: number | null
  duration_minutes: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  ride_id: string
  ride?: Ride
  passenger_id: string
  passenger?: User
  seats_booked: number
  booking_fee: number
  status: BookingStatus
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  booking_id: string
  booking?: Booking
  user_id: string
  amount: number
  payment_type: PaymentType
  status: PaymentStatus
  pandora_reference: string | null
  pandora_transaction_id: string | null
  phone_number: string
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  booking_id: string
  booking?: Booking
  reviewer_id: string
  reviewer?: User
  reviewee_id: string
  reviewee?: User
  rating: number
  comment: string | null
  created_at: string
}

// API request/response types
export interface CreateRideRequest {
  origin_name: string
  origin_lat: number
  origin_lng: number
  destination_name: string
  destination_lat: number
  destination_lng: number
  departure_time: string
  price: number
  total_seats: number
  notes?: string
}

export interface SearchRidesParams {
  origin_lat?: number
  origin_lng?: number
  destination_lat?: number
  destination_lng?: number
  date?: string
  min_seats?: number
  max_price?: number
}

export interface InitiatePaymentRequest {
  booking_id: string
  phone_number: string
}

export interface PandoraWebhookPayload {
  reference: string
  transaction_id: string
  status: 'successful' | 'failed' | 'pending'
  amount: number
  currency: string
  phone_number: string
  metadata?: Record<string, unknown>
}

// Google Maps types
export interface PlaceResult {
  name: string
  lat: number
  lng: number
  formatted_address: string
}

export interface DirectionsResult {
  distance_km: number
  duration_minutes: number
  polyline?: string
}
