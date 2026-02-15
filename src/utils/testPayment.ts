import { supabase } from '../services/supabaseClient';

export interface PaymentTestResult {
  success: boolean;
  message: string;
  details?: any;
  error?: string;
}

export async function setupTestCredentials(): Promise<PaymentTestResult> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: 'Authentication required',
        error: 'Please log in first',
      };
    }

    const { data, error } = await supabase.rpc('setup_waafi_test_credentials', {
      p_merchant_id: user.id,
      p_merchant_code: 'TEST_MERCHANT',
      p_merchant_phone: '+252000000000',
    });

    if (error) throw error;

    return {
      success: true,
      message: 'Test credentials configured successfully',
      details: data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to setup test credentials',
      error: error.message,
    };
  }
}

export async function testWaafiPayment(
  amount: number,
  referenceId?: string
): Promise<PaymentTestResult> {
  try {
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return {
        success: false,
        message: 'Authentication required',
        error: 'Please log in first',
      };
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/waafi-payment`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency: 'USD',
        description: 'Test Payment',
        referenceId: referenceId || `TEST-${Date.now()}`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: 'Payment initiation failed',
        error: data.error || 'Unknown error',
        details: data,
      };
    }

    return {
      success: true,
      message: 'Payment initiated successfully',
      details: data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Payment test failed',
      error: error.message,
    };
  }
}

export async function checkPaymentStatus(transactionId: string): Promise<PaymentTestResult> {
  try {
    const { data, error } = await supabase
      .from('mobile_money_payments')
      .select('*')
      .eq('transaction_id', transactionId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return {
        success: false,
        message: 'Transaction not found',
        error: `No transaction found with ID: ${transactionId}`,
      };
    }

    return {
      success: true,
      message: `Payment status: ${data.status}`,
      details: data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to check payment status',
      error: error.message,
    };
  }
}

export async function verifyPaymentSettings(): Promise<PaymentTestResult> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: 'Authentication required',
        error: 'Please log in first',
      };
    }

    const { data, error } = await supabase
      .from('payment_provider_settings')
      .select('*')
      .eq('merchant_id', user.id)
      .eq('provider', 'waafi')
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return {
        success: false,
        message: 'Waafi payment not configured',
        error: 'No Waafi settings found. Please configure in Settings page.',
      };
    }

    const hasApiKey = !!data.api_key;
    const hasApiSecret = !!data.api_secret;
    const hasMerchantCode = !!data.merchant_code;
    const isActive = data.is_active;

    if (!hasApiKey || !hasApiSecret) {
      return {
        success: false,
        message: 'Incomplete API configuration',
        error: 'API Key or API Secret is missing',
        details: { hasApiKey, hasApiSecret, hasMerchantCode, isActive },
      };
    }

    return {
      success: true,
      message: 'Waafi payment is properly configured',
      details: {
        provider: 'waafi',
        hasApiKey,
        hasApiSecret,
        hasMerchantCode,
        isActive,
        merchantPhone: data.merchant_phone,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to verify payment settings',
      error: error.message,
    };
  }
}
