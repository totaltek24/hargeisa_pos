import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SifaloCredentials {
  username: string;
  password: string;
}

async function getSifaloCredentials(supabase: any): Promise<SifaloCredentials | null> {
  try {
    const { data, error } = await supabase
      .from('payment_provider_settings')
      .select('api_key, merchant_code, is_active')
      .eq('provider', 'sifalo')
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching Sifalo credentials:', error);
      return null;
    }

    if (!data) {
      console.warn('No active Sifalo credentials found in database');
      return null;
    }

    return {
      username: data.merchant_code,
      password: data.api_key,
    };
  } catch (error) {
    console.error('Failed to load Sifalo credentials:', error);
    return null;
  }
}

async function verifyTransaction(sid: string, credentials: SifaloCredentials) {
  const authToken = btoa(`${credentials.username}:${credentials.password}`);

  const response = await fetch('https://api.sifalopay.com/gateway/verify.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${authToken}`,
    },
    body: JSON.stringify({ sid }),
  });

  if (!response.ok) {
    throw new Error(`Verification request failed: ${response.statusText}`);
  }

  return await response.json();
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

    const url = new URL(req.url);
    const sid = url.searchParams.get('sid');
    const paymentId = url.searchParams.get('payment_id');

    console.log('Webhook called with sid:', sid, 'payment_id:', paymentId);

    if (!sid) {
      throw new Error('Missing sid parameter');
    }

    const credentials = await getSifaloCredentials(supabase);
    if (!credentials) {
      throw new Error('Sifalo credentials not configured');
    }

    const verificationResult = await verifyTransaction(sid, credentials);
    console.log('Sifalo verification result:', verificationResult);

    let payment;
    if (paymentId) {
      const { data, error } = await supabase
        .from('mobile_money_payments')
        .select('*')
        .eq('id', paymentId)
        .maybeSingle();

      if (error) throw error;
      payment = data;
    } else {
      const { data, error } = await supabase
        .from('mobile_money_payments')
        .select('*')
        .eq('external_reference', sid)
        .maybeSingle();

      if (error) throw error;
      payment = data;
    }

    if (!payment) {
      throw new Error('Payment not found');
    }

    console.log('========== SIFALO VERIFICATION RESPONSE ==========');
    console.log('Full response:', JSON.stringify(verificationResult, null, 2));
    console.log('Looking for customer name in these fields:');
    console.log('- verificationResult.name:', verificationResult.name);
    console.log('- verificationResult.customerName:', verificationResult.customerName);
    console.log('- verificationResult.customer_name:', verificationResult.customer_name);
    console.log('- verificationResult.accountName:', verificationResult.accountName);
    console.log('- verificationResult.account_name:', verificationResult.account_name);
    console.log('- verificationResult.accountHolder:', verificationResult.accountHolder);
    console.log('- verificationResult.sender:', verificationResult.sender);
    console.log('- verificationResult.senderName:', verificationResult.senderName);
    console.log('- verificationResult.data?.name:', verificationResult.data?.name);
    console.log('- verificationResult.data?.customerName:', verificationResult.data?.customerName);
    console.log('=================================================');

    let newStatus: string;
    const updateData: any = {
      external_reference: sid,
    };

    const customerName = verificationResult.name ||
                        verificationResult.customerName ||
                        verificationResult.customer_name ||
                        verificationResult.accountName ||
                        verificationResult.account_name ||
                        verificationResult.accountHolder ||
                        verificationResult.senderName ||
                        verificationResult.sender?.name ||
                        verificationResult.data?.name ||
                        verificationResult.data?.customerName ||
                        verificationResult.data?.accountName;

    if (customerName) {
      console.log('✓ Found customer name:', customerName);
      updateData.customer_name = customerName;
    } else {
      console.log('✗ No customer name found in response');
    }

    if (verificationResult.status === 'success' && verificationResult.code === 601) {
      newStatus = 'confirmed';
      updateData.status = newStatus;
      updateData.confirmed_at = new Date().toISOString();
      updateData.amount_received = parseFloat(verificationResult.amount);
    } else if (verificationResult.status === 'pending') {
      newStatus = 'pending';
      updateData.status = newStatus;
    } else {
      newStatus = 'failed';
      updateData.status = newStatus;
    }

    const { error: updateError } = await supabase
      .from('mobile_money_payments')
      .update(updateData)
      .eq('id', payment.id);

    if (updateError) {
      console.error('Error updating payment:', updateError);
      throw updateError;
    }

    console.log(`Payment ${payment.id} updated to status: ${newStatus}`);

    if (req.method === 'GET') {
      const successPage = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Payment ${newStatus === 'confirmed' ? 'Success' : 'Status'}</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: ${newStatus === 'confirmed' ? '#f0fdf4' : '#fef2f2'};
              }
              .container {
                text-align: center;
                padding: 2rem;
                background: white;
                border-radius: 0.5rem;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .status {
                font-size: 3rem;
                margin-bottom: 1rem;
              }
              h1 {
                color: ${newStatus === 'confirmed' ? '#16a34a' : '#dc2626'};
                margin: 0 0 1rem 0;
              }
              p {
                color: #6b7280;
                margin: 0.5rem 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="status">${newStatus === 'confirmed' ? '✓' : '⏳'}</div>
              <h1>Payment ${newStatus === 'confirmed' ? 'Successful' : newStatus === 'pending' ? 'Pending' : 'Failed'}</h1>
              <p>Transaction ID: ${sid}</p>
              <p>You can close this window and return to the POS.</p>
            </div>
          </body>
        </html>
      `;

      return new Response(successPage, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html',
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment status updated',
        paymentId: payment.id,
        newStatus,
        verificationResult,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
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
