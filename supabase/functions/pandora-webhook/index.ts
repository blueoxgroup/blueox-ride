// Blue Ox - Pandora Webhook Handler
// This function handles payment notifications from Pandora Payments
// Documentation: https://pandorapayments.com/documentation
//
// CALLBACK URL: https://[YOUR-PROJECT-REF].supabase.co/functions/v1/pandora-webhook
// Configure this URL when initiating payments

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Pandora webhook payload format (actual format from Pandora)
interface PandoraWebhookPayload {
  transaction_ref: string  // Pandora sends transaction_ref, not transaction_reference
  status: 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired'
  message?: string
  amount: string
  contact?: string
  narrative?: string
  timestamp?: number
  network_ref?: string
  signature?: string
  // Legacy fields (in case they change)
  transaction_reference?: string
  transaction_charge?: string
  sub_account?: string
  transaction_type?: string
  network?: string
  completed_on?: string
  failed_on?: string
  reason?: string
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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Parse webhook payload
    const payload: PandoraWebhookPayload = await req.json()

    // Support both transaction_ref (actual) and transaction_reference (legacy)
    const transactionRef = payload.transaction_ref || payload.transaction_reference

    console.log('Received Pandora webhook:', {
      transaction_ref: transactionRef,
      status: payload.status,
      amount: payload.amount,
      message: payload.message,
    })

    // Validate required fields
    if (!transactionRef || !payload.status) {
      console.error('Missing required fields in webhook payload:', payload)
      throw new Error('Missing required fields: transaction_ref and status')
    }

    // SECURITY: Verify webhook by checking transaction_ref exists in our records
    // (As per Pandora documentation: "verify that webhook requests originated from PandoraPay
    // by checking the transaction reference against your records")
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('*, booking:bookings(*)')
      .eq('pandora_reference', transactionRef)
      .single()

    if (paymentError || !payment) {
      console.error('Payment not found for reference:', transactionRef)
      // Return 200 to prevent Pandora from retrying (unknown reference)
      return new Response(
        JSON.stringify({ success: false, message: 'Unknown transaction reference' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log('Found payment record:', {
      payment_id: payment.id,
      current_status: payment.status,
      booking_id: payment.booking_id,
    })

    // Check if payment is already processed (idempotency)
    if (payment.status === 'completed' || payment.status === 'refunded') {
      console.log('Payment already processed, skipping:', payment.id)
      return new Response(
        JSON.stringify({ success: true, message: 'Payment already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Process based on Pandora status
    if (payload.status === 'completed') {
      // Payment successful - update payment and confirm booking
      const { error: updatePaymentError } = await supabaseAdmin
        .from('payments')
        .update({
          status: 'completed',
          pandora_transaction_id: transactionRef,
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
        network: payload.network,
      })

    } else if (payload.status === 'failed' || payload.status === 'cancelled' || payload.status === 'expired') {
      // Payment failed/cancelled/expired - update payment status
      const errorMessage = payload.message || payload.reason ||
        (payload.status === 'cancelled' ? 'Transaction cancelled by user' :
         payload.status === 'expired' ? 'Transaction expired - user did not complete in time' :
         'Payment failed')

      const { error: updateError } = await supabaseAdmin
        .from('payments')
        .update({
          status: 'failed',
          error_message: errorMessage,
          retry_count: payment.retry_count + 1,
        })
        .eq('id', payment.id)

      if (updateError) {
        console.error('Failed to update payment:', updateError)
      }

      console.log('Payment failed/cancelled/expired:', {
        payment_id: payment.id,
        status: payload.status,
        message: errorMessage,
      })

    } else if (payload.status === 'processing') {
      // Still processing - just log it
      console.log('Payment still processing:', payment.id)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Webhook processing error:', error)
    // Return 200 to prevent retry loops for invalid payloads
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
