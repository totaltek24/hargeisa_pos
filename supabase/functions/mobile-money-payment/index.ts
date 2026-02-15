import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PaymentRequest {
  amount: number;
  currency: string;
  transactionReference: string;
  paymentId: string;
  provider: 'zaad' | 'edahab';
  customerPhone: string;
}

interface SifaloCredentials {
  username: string;
  password: string;
  merchantName?: string;
}

async function getSifaloCredentials(supabase: any): Promise<SifaloCredentials | null> {
  try {
    const { data, error } = await supabase
      .from('payment_provider_settings')
      .select('api_key, merchant_code, merchant_name, is_active')
      .eq('provider', 'sifalo')
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching Sifalo credentials:', error);
      return null;
    }

    if (!data || !data.merchant_code || !data.api_key) {
      console.warn('No active Sifalo credentials found in database');
      return null;
    }

    return {
      username: data.merchant_code,
      password: data.api_key,
      merchantName: data.merchant_name,
    };
  } catch (error) {
    console.error('Failed to load Sifalo credentials:', error);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const requestBody: PaymentRequest = await req.json();
    const { amount, currency, transactionReference, paymentId, provider, customerPhone } = requestBody;

    console.log(`Initiating Sifalo payment for ${amount} ${currency} via ${provider}`);
    console.log('Payment ID:', paymentId);
    console.log('Transaction Reference:', transactionReference);
    console.log('Customer Phone:', customerPhone);

    if (!customerPhone || customerPhone.length < 9) {
      throw new Error('Valid customer phone number is required');
    }

    const credentials = await getSifaloCredentials(supabase);

    if (!credentials) {
      console.error('No Sifalo credentials found');
      throw new Error('Sifalo payment credentials not configured. Please configure them in Payment Settings.');
    }

    console.log('Sifalo credentials loaded successfully');

    // Create Basic Auth token
    const authToken = btoa(`${credentials.username}:${credentials.password}`);

    // Map provider to gateway value
    // According to Sifalo docs: "For EVC, ZAAD and SAHAL use waafi value"
    const gateway = provider === 'zaad' ? 'waafi' : 'edahab';

    // eDahab only supports USD according to documentation
    if (provider === 'edahab' && currency === 'SLSH') {
      throw new Error('eDahab only supports USD payments');
    }

    // Process payment directly
    const paymentPayload: any = {
      account: customerPhone,
      gateway: gateway,
      amount: amount.toString(),
      currency: currency,
      order_id: transactionReference,
    };

    // Add merchant name if available - this appears on customer's phone
    // Trying multiple possible field names as Sifalo API docs don't specify the exact parameter
    if (credentials.merchantName) {
      paymentPayload.description = credentials.merchantName;
      paymentPayload.narration = credentials.merchantName;
      paymentPayload.business_name = credentials.merchantName;
      paymentPayload.merchant_name = credentials.merchantName;
    }

    const paymentResponse = await fetch('https://api.sifalopay.com/gateway/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authToken}`,
      },
      body: JSON.stringify(paymentPayload),
    });

    const paymentData = await paymentResponse.json();
    console.log('========== SIFALO PAYMENT RESPONSE ==========');
    console.log('Full response:', JSON.stringify(paymentData, null, 2));
    console.log('Response code:', paymentData.code, '(type:', typeof paymentData.code, ')');
    console.log('Response message:', paymentData.response);
    console.log('Looking for customer name in these fields:');
    console.log('- paymentData.name:', paymentData.name);
    console.log('- paymentData.customerName:', paymentData.customerName);
    console.log('- paymentData.customer_name:', paymentData.customer_name);
    console.log('- paymentData.accountName:', paymentData.accountName);
    console.log('- paymentData.account_name:', paymentData.account_name);
    console.log('- paymentData.accountHolder:', paymentData.accountHolder);
    console.log('- paymentData.sender:', paymentData.sender);
    console.log('- paymentData.senderName:', paymentData.senderName);
    console.log('==============================================');

    // Response format: { code: 601, sid: "transaction_id", response: "message" }
    // code: 601=processed, 603=pending, 604=insufficient balance, 600=failed
    // Handle both string and number codes by converting to number
    const responseCode = typeof paymentData.code === 'string' ? parseInt(paymentData.code, 10) : paymentData.code;

    let status = 'pending';
    let errorMessage = null;

    console.log('Parsed response code:', responseCode);

    // Check for success codes
    if (responseCode === 601 || responseCode === 200 || paymentData.response?.toLowerCase().includes('success') || paymentData.response?.toLowerCase().includes('processed')) {
      status = 'confirmed';
      console.log('✓ Payment confirmed (code:', responseCode, ')');
    } else if (responseCode === 603) {
      status = 'pending';
      console.log('○ Payment pending (code:', responseCode, ')');
    } else if (responseCode === 604) {
      status = 'failed';
      errorMessage = 'Insufficient balance in customer account';
      console.log('✗ Payment failed: insufficient balance');
    } else if (responseCode === 600) {
      status = 'failed';
      errorMessage = paymentData.response || 'Payment failed';
      console.log('✗ Payment failed (code 600):', errorMessage);
    } else {
      status = 'failed';
      errorMessage = paymentData.response || 'Unknown payment status';
      console.log('✗ Unknown payment code:', responseCode, 'Message:', paymentData.response);
    }

    // Try to extract customer name from payment response
    const customerName = paymentData.name ||
                        paymentData.customerName ||
                        paymentData.customer_name ||
                        paymentData.accountName ||
                        paymentData.account_name ||
                        paymentData.accountHolder ||
                        paymentData.senderName ||
                        paymentData.sender?.name;

    if (customerName) {
      console.log('✓ Found customer name in payment response:', customerName);
    } else {
      console.log('✗ No customer name in payment response (may come in webhook)');
    }

    // Update payment record
    const updateData: any = {
      status: status,
      external_reference: paymentData.sid || null,
      updated_at: new Date().toISOString(),
    };

    if (customerName) {
      updateData.customer_name = customerName;
    }

    await supabase
      .from('mobile_money_payments')
      .update(updateData)
      .eq('id', paymentId);

    return new Response(
      JSON.stringify({
        success: status === 'confirmed' || status === 'pending',
        status: status,
        transactionId: paymentData.sid,
        message: paymentData.response,
        code: paymentData.code,
        error: errorMessage,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Payment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      type: error?.constructor?.name,
    });

    return new Response(
      JSON.stringify({
        success: false,
        status: 'failed',
        error: errorMessage,
        details: errorStack,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
