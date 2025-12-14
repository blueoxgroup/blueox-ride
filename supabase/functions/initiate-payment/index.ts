// Blue Ox - Initiate Payment Edge Function
// This function handles payment initiation with Pandora Mobile Money API
// Documentation: https://pandorapayments.com/documentation

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

// Pandora API configuration
const PANDORA_BASE_URL = 'https://api.pandorapayments.com/v1'

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

    if (!pandoraApiKey) {
      throw new Error('PANDORA_API_KEY environment variable not configured')
    }

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
    const phoneRegex = /^(\+256|256|0)?[7-9]\d{8}$/
    const cleanPhone = phone_number.replace(/\s/g, '')
    if (!phoneRegex.test(cleanPhone)) {
      throw new Error('Invalid phone number format. Use Uganda format: 07XXXXXXXX or 256XXXXXXXXX')
    }

    // Normalize phone number to 256XXXXXXXXX format (Pandora requires this format)
    let normalizedPhone = cleanPhone
    if (normalizedPhone.startsWith('+256')) {
      normalizedPhone = normalizedPhone.substring(1) // Remove the +
    } else if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '256' + normalizedPhone.substring(1)
    } else if (!normalizedPhone.startsWith('256')) {
      normalizedPhone = '256' + normalizedPhone
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
    const paymentReference = `BLUEOX${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`

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

    // Build callback URL for Pandora webhook
    const callbackUrl = `${supabaseUrl}/functions/v1/pandora-webhook`

    // Prepare Pandora API request
    // Documentation: https://pandorapayments.com/documentation
    const pandoraPayload = {
      amount: bookingFee,
      transaction_ref: paymentReference,
      contact: normalizedPhone,
      narrative: `Blue Ox ride booking: ${booking.ride.origin_name} to ${booking.ride.destination_name}`,
      callback_url: callbackUrl,
    }

    console.log('Initiating Pandora payment:', {
      reference: paymentReference,
      amount: bookingFee,
      contact: normalizedPhone,
      callback_url: callbackUrl,
    })

    // Make request to Pandora API
    const pandoraResponse = await fetch(`${PANDORA_BASE_URL}/transactions/mobile-money`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': pandoraApiKey,
      },
      body: JSON.stringify(pandoraPayload),
    })

    // Get response text first to handle non-JSON responses
    const responseText = await pandoraResponse.text()

    let pandoraResult
    try {
      pandoraResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Pandora API returned non-JSON response:', responseText.substring(0, 500))

      // Update payment status to failed
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'failed',
          error_message: 'Payment service unavailable. Please try again.',
        })
        .eq('id', payment.id)

      throw new Error('Payment service temporarily unavailable. Please try again.')
    }

    console.log('Pandora API response:', pandoraResult)

    // Check if request was successful
    if (!pandoraResult.success) {
      // Update payment status to failed
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'failed',
          error_message: pandoraResult.messages?.join(', ') || 'Pandora API error',
        })
        .eq('id', payment.id)

      throw new Error(pandoraResult.messages?.join(', ') || 'Payment initiation failed')
    }

    // Update payment with processing status
    await supabaseAdmin
      .from('payments')
      .update({
        status: 'processing',
        // Store any transaction ID from Pandora if available
        pandora_transaction_id: pandoraResult.data?.[0]?.transaction_reference || paymentReference,
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
        network: pandoraResult.data?.[0]?.network || 'Mobile Money',
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
