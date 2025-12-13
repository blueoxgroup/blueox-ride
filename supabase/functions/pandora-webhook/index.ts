// Blue Ox - Pandora Webhook Handler
// This function handles payment notifications from Pandora
//
// CALLBACK URL: https://zwuoewhxqndmutbfyzka.supabase.co/functions/v1/pandora-webhook
// Configure this URL in your Pandora dashboard

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PandoraWebhookPayload {
  reference: string
  transaction_id: string
  status: 'successful' | 'failed' | 'pending'
  amount: number
  currency: string
  phone_number: string
  message?: string
  metadata?: {
    booking_id?: string
    payment_id?: string
    user_id?: string
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const pandoraWebhookSecret = Deno.env.get('PANDORA_WEBHOOK_SECRET')

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verify webhook signature if secret is configured
    // TODO: Implement signature verification based on Pandora's documentation
    const signature = req.headers.get('X-Pandora-Signature')
    if (pandoraWebhookSecret && signature) {
      // Verify signature here
      // const isValid = verifySignature(await req.clone().text(), signature, pandoraWebhookSecret)
      // if (!isValid) throw new Error('Invalid webhook signature')
    }

    // Parse webhook payload
    const payload: PandoraWebhookPayload = await req.json()

    console.log('Received Pandora webhook:', {
      reference: payload.reference,
      status: payload.status,
      amount: payload.amount,
    })

    // Validate required fields
    if (!payload.reference || !payload.status) {
      throw new Error('Missing required fields in webhook payload')
    }

    // Find payment by reference
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('*, booking:bookings(*)')
      .eq('pandora_reference', payload.reference)
      .single()

    if (paymentError || !payment) {
      console.error('Payment not found for reference:', payload.reference)
      throw new Error('Payment not found')
    }

    // Check if payment is already processed
    if (payment.status === 'completed' || payment.status === 'refunded') {
      console.log('Payment already processed:', payment.id)
      return new Response(
        JSON.stringify({ success: true, message: 'Payment already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Process based on Pandora status
    if (payload.status === 'successful') {
      // Update payment status
      const { error: updatePaymentError } = await supabaseAdmin
        .from('payments')
        .update({
          status: 'completed',
          pandora_transaction_id: payload.transaction_id || payment.pandora_transaction_id,
        })
        .eq('id', payment.id)

      if (updatePaymentError) {
        console.error('Failed to update payment:', updatePaymentError)
        throw new Error('Failed to update payment status')
      }

      // Update booking status to confirmed
      const { error: updateBookingError } = await supabaseAdmin
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', payment.booking_id)

      if (updateBookingError) {
        console.error('Failed to update booking:', updateBookingError)
        throw new Error('Failed to confirm booking')
      }

      console.log('Payment successful, booking confirmed:', {
        payment_id: payment.id,
        booking_id: payment.booking_id,
      })

    } else if (payload.status === 'failed') {
      // Update payment status to failed
      const { error: updateError } = await supabaseAdmin
        .from('payments')
        .update({
          status: 'failed',
          error_message: payload.message || 'Payment failed',
          retry_count: payment.retry_count + 1,
        })
        .eq('id', payment.id)

      if (updateError) {
        console.error('Failed to update payment:', updateError)
      }

      console.log('Payment failed:', {
        payment_id: payment.id,
        message: payload.message,
      })
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
