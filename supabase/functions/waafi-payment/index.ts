import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WaafiPaymentRequest {
  amount: number;
  currency: string;
  description?: string;
  referenceId: string;
}

interface WaafiPaymentResponse {
  success: boolean;
  transactionId?: string;
  qrCode?: string;
  message?: string;
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const paymentRequest: WaafiPaymentRequest = await req.json();

    const { data: settings, error: settingsError } = await supabase
      .from('payment_provider_settings')
      .select('*')
      .eq('merchant_id', user.id)
      .eq('provider', 'waafi')
      .eq('is_active', true)
      .maybeSingle();

    if (settingsError) {
      throw new Error('Error fetching payment settings');
    }

    if (!settings || !settings.api_key || !settings.api_secret || !settings.merchant_code) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Waafi is not configured. Please add your API credentials in Settings.',
        } as WaafiPaymentResponse),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const waafiResponse = await fetch('https://api.waafipay.net/asm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        schemaVersion: '1.0',
        requestId: paymentRequest.referenceId,
        timestamp: new Date().toISOString(),
        channelName: 'WEB',
        serviceName: 'API_PURCHASE',
        serviceParams: {
          merchantUid: settings.merchant_code,
          apiUserId: settings.api_key,
          apiKey: settings.api_secret,
          paymentMethod: 'MWALLET_ACCOUNT',
          payerInfo: {
            accountNo: 'CUSTOMER_SCANS_QR',
          },
          transactionInfo: {
            referenceId: paymentRequest.referenceId,
            invoiceId: paymentRequest.referenceId,
            amount: paymentRequest.amount,
            currency: paymentRequest.currency || 'USD',
            description: paymentRequest.description || 'POS Payment',
          },
        },
      }),
    });

    const waafiData = await waafiResponse.json();

    if (waafiData.responseCode === '2001' || waafiData.responseMsg === 'Success') {
      await supabase
        .from('mobile_money_payments')
        .insert({
          merchant_id: user.id,
          provider: 'waafi',
          transaction_id: waafiData.params?.transactionId || paymentRequest.referenceId,
          amount: paymentRequest.amount,
          currency: paymentRequest.currency || 'USD',
          reference_id: paymentRequest.referenceId,
          status: 'pending',
          qr_code_data: waafiData.params?.qrCode || null,
        });

      return new Response(
        JSON.stringify({
          success: true,
          transactionId: waafiData.params?.transactionId || paymentRequest.referenceId,
          qrCode: waafiData.params?.qrCode,
          message: 'Payment initiated successfully',
        } as WaafiPaymentResponse),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: waafiData.responseMsg || 'Payment initiation failed',
        } as WaafiPaymentResponse),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  } catch (error) {
    console.error('Error processing Waafi payment:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      } as WaafiPaymentResponse),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
