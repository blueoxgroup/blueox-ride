// Blue Ox - Initiate Payment Edge Function
// This function handles payment initiation with Pandora Mobile Money API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentRequest {
  booking_id: string
  phone_number: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const pandoraApiKey = Deno.env.get('PANDORA_API_KEY')!

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Create client with user's auth token
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    const { booking_id, phone_number }: PaymentRequest = await req.json()

    if (!booking_id || !phone_number) {
      throw new Error('Missing required fields: booking_id and phone_number')
    }

    // Validate phone number format (Uganda: +256 or 0 followed by 7 or 9 digits)
    const phoneRegex = /^(\+256|0)?[7-9]\d{8}$/
    if (!phoneRegex.test(phone_number.replace(/\s/g, ''))) {
      throw new Error('Invalid phone number format. Use Uganda format: 07XXXXXXXX or +2567XXXXXXXX')
    }

    // Normalize phone number to +256 format
    let normalizedPhone = phone_number.replace(/\s/g, '')
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+256' + normalizedPhone.substring(1)
    } else if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+256' + normalizedPhone
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        ride:rides (
          id,
          price,
          departure_time,
          origin_name,
          destination_name,
          driver_id
        )
      `)
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      throw new Error('Booking not found')
    }

    // Verify this is the passenger's booking
    if (booking.passenger_id !== user.id) {
      throw new Error('You can only pay for your own bookings')
    }

    // Check booking status
    if (booking.status !== 'pending_payment') {
      throw new Error(`Cannot process payment. Booking status is: ${booking.status}`)
    }

    // Check if ride hasn't departed
    if (new Date(booking.ride.departure_time) < new Date()) {
      throw new Error('Cannot pay for a ride that has already departed')
    }

    // Calculate 10% booking fee
    const bookingFee = Math.ceil(booking.ride.price * 0.1 * booking.seats_booked)

    // Generate unique payment reference
    const paymentReference = `BLUEOX-${Date.now()}-${booking_id.substring(0, 8)}`

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        booking_id: booking_id,
        user_id: user.id,
        amount: bookingFee,
        payment_type: 'booking_fee',
        status: 'pending',
        pandora_reference: paymentReference,
        phone_number: normalizedPhone,
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Payment creation error:', paymentError)
      throw new Error('Failed to create payment record')
    }

    // Update booking fee if needed
    if (booking.booking_fee !== bookingFee) {
      await supabaseAdmin
        .from('bookings')
        .update({ booking_fee: bookingFee })
        .eq('id', booking_id)
    }

    // Initiate payment with Pandora API
    // Note: This is a generic implementation - adjust based on actual Pandora API docs
    const pandoraPayload = {
      api_key: pandoraApiKey,
      reference: paymentReference,
      amount: bookingFee,
      currency: 'UGX',
      phone_number: normalizedPhone,
      description: `Blue Ox booking fee for ride from ${booking.ride.origin_name} to ${booking.ride.destination_name}`,
      callback_url: `${supabaseUrl}/functions/v1/pandora-webhook`,
      metadata: {
        booking_id: booking_id,
        payment_id: payment.id,
        user_id: user.id,
      }
    }

    console.log('Initiating Pandora payment:', { reference: paymentReference, amount: bookingFee })

    // Make request to Pandora API
    // TODO: Replace with actual Pandora API endpoint
    const pandoraResponse = await fetch('https://api.pandorapayments.com/v1/collections/mobile-money', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pandoraApiKey}`,
      },
      body: JSON.stringify(pandoraPayload),
    })

    const pandoraResult = await pandoraResponse.json()

    if (!pandoraResponse.ok) {
      // Update payment status to failed
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'failed',
          error_message: pandoraResult.message || 'Pandora API error',
        })
        .eq('id', payment.id)

      throw new Error(pandoraResult.message || 'Payment initiation failed')
    }

    // Update payment with Pandora transaction ID
    await supabaseAdmin
      .from('payments')
      .update({
        status: 'processing',
        pandora_transaction_id: pandoraResult.transaction_id,
      })
      .eq('id', payment.id)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment initiated. Please check your phone to confirm the mobile money transaction.',
        payment_id: payment.id,
        reference: paymentReference,
        amount: bookingFee,
        phone_number: normalizedPhone,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Payment initiation error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
