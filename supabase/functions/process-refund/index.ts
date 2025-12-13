// Blue Ox - Process Refund Edge Function
// Handles refunds based on cancellation rules:
// - Driver cancels → refund 10% to passenger
// - Passenger cancels > 1 hour before ride → refund 10% to passenger
// - Passenger cancels <= 1 hour before ride → refund 10% to driver

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RefundRequest {
  booking_id: string
  cancellation_type: 'passenger' | 'driver'
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const pandoraApiKey = Deno.env.get('PANDORA_API_KEY')!

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { booking_id, cancellation_type }: RefundRequest = await req.json()

    if (!booking_id || !cancellation_type) {
      throw new Error('Missing required fields')
    }

    // Get booking with ride and payment details
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        ride:rides (
          id,
          price,
          departure_time,
          driver_id
        ),
        payment:payments (
          id,
          amount,
          status,
          phone_number
        )
      `)
      .eq('id', booking_id)
      .eq('status', 'confirmed')
      .single()

    if (bookingError || !booking) {
      throw new Error('Confirmed booking not found')
    }

    // Verify user has permission to cancel
    const isDriver = booking.ride.driver_id === user.id
    const isPassenger = booking.passenger_id === user.id

    if (cancellation_type === 'driver' && !isDriver) {
      throw new Error('Only the driver can cancel as driver')
    }
    if (cancellation_type === 'passenger' && !isPassenger) {
      throw new Error('Only the passenger can cancel as passenger')
    }

    // Get the original payment
    const originalPayment = booking.payment?.find((p: any) =>
      p.status === 'completed' && p.amount > 0
    )

    if (!originalPayment) {
      throw new Error('No completed payment found for this booking')
    }

    // Calculate time until departure
    const departureTime = new Date(booking.ride.departure_time)
    const now = new Date()
    const hoursUntilDeparture = (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Determine refund recipient based on rules
    let refundTo: 'passenger' | 'driver'
    let refundType: 'refund_to_passenger' | 'refund_to_driver'

    if (cancellation_type === 'driver') {
      // Driver cancels → refund to passenger
      refundTo = 'passenger'
      refundType = 'refund_to_passenger'
    } else {
      // Passenger cancels
      if (hoursUntilDeparture > 1) {
        // More than 1 hour before → refund to passenger
        refundTo = 'passenger'
        refundType = 'refund_to_passenger'
      } else {
        // 1 hour or less → refund to driver (passenger forfeits fee)
        refundTo = 'driver'
        refundType = 'refund_to_driver'
      }
    }

    // Get recipient's phone number
    let recipientPhone: string
    let recipientId: string

    if (refundTo === 'passenger') {
      // Use the phone number from original payment
      recipientPhone = originalPayment.phone_number
      recipientId = booking.passenger_id
    } else {
      // Get driver's phone from users table
      const { data: driver, error: driverError } = await supabaseAdmin
        .from('users')
        .select('phone_number')
        .eq('id', booking.ride.driver_id)
        .single()

      if (driverError || !driver?.phone_number) {
        throw new Error('Driver phone number not found. Please contact support.')
      }
      recipientPhone = driver.phone_number
      recipientId = booking.ride.driver_id
    }

    // Generate refund reference
    const refundReference = `BLUEOX-REFUND-${Date.now()}-${booking_id.substring(0, 8)}`

    // Create refund payment record
    const { data: refundPayment, error: refundPaymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        booking_id: booking_id,
        user_id: recipientId,
        amount: originalPayment.amount,
        payment_type: refundType,
        status: 'pending',
        pandora_reference: refundReference,
        phone_number: recipientPhone,
      })
      .select()
      .single()

    if (refundPaymentError) {
      console.error('Refund payment creation error:', refundPaymentError)
      throw new Error('Failed to create refund record')
    }

    // Initiate refund with Pandora API
    // TODO: Replace with actual Pandora disbursement API
    const pandoraPayload = {
      api_key: pandoraApiKey,
      reference: refundReference,
      amount: originalPayment.amount,
      currency: 'UGX',
      phone_number: recipientPhone,
      description: `Blue Ox refund - Booking cancellation`,
      callback_url: `${supabaseUrl}/functions/v1/pandora-webhook`,
    }

    console.log('Initiating refund:', {
      reference: refundReference,
      amount: originalPayment.amount,
      to: refundTo,
    })

    const pandoraResponse = await fetch('https://api.pandorapayments.com/v1/disbursements/mobile-money', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pandoraApiKey}`,
      },
      body: JSON.stringify(pandoraPayload),
    })

    const pandoraResult = await pandoraResponse.json()

    if (!pandoraResponse.ok) {
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'failed',
          error_message: pandoraResult.message || 'Refund initiation failed',
        })
        .eq('id', refundPayment.id)

      throw new Error(pandoraResult.message || 'Refund initiation failed')
    }

    // Update refund payment status
    await supabaseAdmin
      .from('payments')
      .update({
        status: 'processing',
        pandora_transaction_id: pandoraResult.transaction_id,
      })
      .eq('id', refundPayment.id)

    // Update booking status
    const newStatus = cancellation_type === 'driver' ? 'cancelled_by_driver' : 'cancelled_by_passenger'
    await supabaseAdmin
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', booking_id)

    // Mark original payment as refunded
    await supabaseAdmin
      .from('payments')
      .update({ status: 'refunded' })
      .eq('id', originalPayment.id)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Refund initiated. ${refundTo === 'passenger' ? 'The passenger' : 'The driver'} will receive UGX ${originalPayment.amount.toLocaleString()} on ${recipientPhone}`,
        refund_to: refundTo,
        amount: originalPayment.amount,
        reference: refundReference,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Refund processing error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
