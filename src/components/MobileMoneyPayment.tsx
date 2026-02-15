import { useState, useEffect } from 'react';
import { Smartphone, CheckCircle, XCircle, Loader2, User, Phone, DollarSign, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import type { CartItem } from '../types';

type Provider = 'zaad' | 'edahab';
type Currency = 'USD' | 'SLSH';
type PaymentStatus = 'input' | 'processing' | 'waiting' | 'success' | 'failed' | 'cancelled';

interface MobileMoneyPaymentProps {
  amount: number;
  amountSlsh: number;
  onPaymentConfirmed: (provider: Provider) => void;
  onCancel: () => void;
  merchantPhone: string;
  cartItems: CartItem[];
  transactionNumber: string;
}

export default function MobileMoneyPayment({
  amount,
  amountSlsh,
  onPaymentConfirmed,
  onCancel,
  merchantPhone,
  cartItems,
  transactionNumber
}: MobileMoneyPaymentProps) {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('input');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [pollingTimeout, setPollingTimeout] = useState<NodeJS.Timeout | null>(null);

  const finalAmount = currency === 'USD' ? amount : amountSlsh;

  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      if (pollingTimeout) {
        clearTimeout(pollingTimeout);
      }
    };
  }, [pollingInterval, pollingTimeout]);

  const initiatePayment = async () => {
    if (!provider || !customerPhone.trim()) {
      setErrorMessage('Please enter customer phone number');
      return;
    }

    if (customerPhone.length < 9) {
      setErrorMessage('Please enter a valid phone number');
      return;
    }

    setPaymentStatus('processing');
    setErrorMessage('');

    try {
      const transactionItems = cartItems.map(item => ({
        productId: item.product.id,
        productName: item.product.nameEn,
        quantity: item.quantity,
        unitPrice: item.product.priceUsd,
        subtotal: item.product.priceUsd * item.quantity,
      }));

      const { data: existingPayment } = await supabase
        .from('mobile_money_payments')
        .select('*')
        .eq('transaction_reference', transactionNumber)
        .maybeSingle();

      let paymentRecord;

      if (existingPayment && existingPayment.status !== 'confirmed') {
        const { data, error: updateError } = await supabase
          .from('mobile_money_payments')
          .update({
            payment_method: provider,
            amount: finalAmount,
            payment_currency: currency,
            merchant_phone: merchantPhone,
            sender_phone: customerPhone,
            status: 'pending',
            transaction_items: transactionItems,
            external_reference: null,
          })
          .eq('id', existingPayment.id)
          .select()
          .single();

        if (updateError) throw updateError;
        paymentRecord = data;
      } else if (!existingPayment) {
        const { data, error: insertError } = await supabase
          .from('mobile_money_payments')
          .insert({
            transaction_reference: transactionNumber,
            payment_method: provider,
            amount: finalAmount,
            payment_currency: currency,
            merchant_phone: merchantPhone,
            sender_phone: customerPhone,
            status: 'pending',
            transaction_items: transactionItems,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        paymentRecord = data;
      } else {
        throw new Error('A payment has already been confirmed for this transaction');
      }

      setPaymentId(paymentRecord.id);
      setPaymentStatus('waiting');

      const { data, error } = await supabase.functions.invoke('mobile-money-payment', {
        body: {
          amount: finalAmount,
          currency,
          transactionReference: transactionNumber,
          paymentId: paymentRecord.id,
          provider: provider,
          customerPhone: customerPhone,
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Payment service error: ${error.message || 'Unknown error'}`);
      }

      if (data && data.success) {
        if (data.status === 'confirmed') {
          setPaymentStatus('success');
          setTimeout(() => {
            onPaymentConfirmed(provider);
          }, 2000);
        } else if (data.status === 'pending') {
          startPollingPaymentStatus(paymentRecord.id);
        } else {
          throw new Error(data.error || 'Payment failed');
        }
      } else {
        const errorMsg = data?.error || 'Failed to process payment';
        console.error('Payment failed:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('Payment initiation error:', err);
      setErrorMessage(err.message || 'Failed to initiate payment. Please try again.');
      setPaymentStatus('failed');
    }
  };

  const startPollingPaymentStatus = (paymentRecordId: string) => {
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('mobile_money_payments')
          .select('status')
          .eq('id', paymentRecordId)
          .single();

        if (error) throw error;

        if (data.status === 'confirmed') {
          clearInterval(interval);
          if (pollingTimeout) clearTimeout(pollingTimeout);
          setPaymentStatus('success');
          setTimeout(() => {
            onPaymentConfirmed(provider!);
          }, 2000);
        } else if (data.status === 'failed' || data.status === 'expired') {
          clearInterval(interval);
          if (pollingTimeout) clearTimeout(pollingTimeout);
          setPaymentStatus('failed');
          setErrorMessage('Payment failed or was declined by customer');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);

    setPollingInterval(interval);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setPaymentStatus('failed');
      setErrorMessage('Payment request timed out. Customer did not respond.');
    }, 120000);

    setPollingTimeout(timeout);
  };

  const handleCancel = async () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    if (pollingTimeout) {
      clearTimeout(pollingTimeout);
    }

    if (paymentId) {
      await supabase
        .from('mobile_money_payments')
        .update({ status: 'cancelled' })
        .eq('id', paymentId);
    }

    setPaymentStatus('cancelled');
    onCancel();
  };

  if (!provider) {
    return (
      <div className="p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">Select Payment Provider</h2>

        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-base sm:text-lg font-semibold text-gray-800">
            Amount to Pay: <span className="text-blue-600">${amount.toFixed(2)}</span>
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {amountSlsh.toLocaleString()} SLSH
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <button
            onClick={() => setProvider('zaad')}
            className="w-full p-4 sm:p-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl shadow-lg transition-all transform hover:scale-105"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <Smartphone size={28} className="sm:w-8 sm:h-8 flex-shrink-0" />
              <div className="text-left">
                <p className="font-bold text-base sm:text-lg">Zaad Service</p>
                <p className="text-xs sm:text-sm text-green-100">Direct payment via Sifalo API</p>
                <p className="text-xs text-green-100">Supports USD & SLSH</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setProvider('edahab')}
            className="w-full p-4 sm:p-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl shadow-lg transition-all transform hover:scale-105"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <Smartphone size={28} className="sm:w-8 sm:h-8 flex-shrink-0" />
              <div className="text-left">
                <p className="font-bold text-base sm:text-lg">eDahab</p>
                <p className="text-xs sm:text-sm text-orange-100">Direct payment via Sifalo API</p>
                <p className="text-xs text-orange-100">USD payments only</p>
              </div>
            </div>
          </button>
        </div>

        <button
          onClick={onCancel}
          className="w-full mt-4 sm:mt-6 p-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition text-sm sm:text-base"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (paymentStatus === 'success') {
    return (
      <div className="p-6 text-center">
        <CheckCircle size={80} className="text-green-500 mx-auto mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h2>
        <p className="text-gray-600">Customer confirmed payment</p>
        <p className="text-sm text-gray-500 mt-2">Generating receipt...</p>
      </div>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <div className="p-6 text-center">
        <XCircle size={80} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h2>
        <p className="text-gray-600 mb-4">{errorMessage}</p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setProvider(null);
              setPaymentStatus('input');
              setErrorMessage('');
            }}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
          >
            Try Again
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'waiting') {
    return (
      <div className="p-6 text-center">
        <div className="mb-6">
          <Loader2 size={80} className="text-blue-500 mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold text-blue-600 mb-2">Processing Payment</h2>
          <p className="text-gray-600">Phone: {customerPhone}</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 mb-2">
            <strong>Payment request sent to customer's mobile:</strong>
          </p>
          <ol className="text-sm text-blue-700 text-left space-y-1 list-decimal list-inside">
            <li>Customer receives payment prompt on their phone</li>
            <li>Customer enters their PIN to approve payment</li>
            <li>Transaction is processed through {provider === 'zaad' ? 'Zaad' : 'eDahab'}</li>
          </ol>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <AlertCircle className="inline w-4 h-4 mr-1" />
            Waiting for customer to approve payment on their mobile device...
          </p>
        </div>

        <button
          onClick={handleCancel}
          className="w-full p-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition"
        >
          Cancel Payment
        </button>
      </div>
    );
  }

  if (paymentStatus === 'processing') {
    return (
      <div className="p-6 text-center">
        <Loader2 size={80} className="text-blue-500 mx-auto mb-4 animate-spin" />
        <h2 className="text-2xl font-bold text-blue-600 mb-2">Processing...</h2>
        <p className="text-gray-600">Initiating payment request</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {provider === 'zaad' ? 'Zaad Payment' : 'eDahab Payment'}
        </h2>
        <button
          onClick={() => setProvider(null)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Change Provider
        </button>
      </div>

      <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl">
        <p className="text-sm text-gray-600 mb-2">Amount to Charge:</p>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-blue-600">
            {currency === 'USD' ? `$${amount.toFixed(2)}` : `${amountSlsh.toLocaleString()} SLSH`}
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 flex items-center gap-2">
            <AlertCircle size={16} />
            {errorMessage}
          </p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <DollarSign className="inline w-4 h-4 mr-1" />
            Select Currency
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setCurrency('USD')}
              className={`p-4 rounded-lg border-2 transition-all ${
                currency === 'USD'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-bold">USD (Dollar)</p>
              <p className="text-sm">${amount.toFixed(2)}</p>
            </button>
            <button
              onClick={() => setCurrency('SLSH')}
              disabled={provider === 'edahab'}
              className={`p-4 rounded-lg border-2 transition-all ${
                currency === 'SLSH'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              } ${provider === 'edahab' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <p className="font-bold">SLSH (Shilling)</p>
              <p className="text-sm">{amountSlsh.toLocaleString()}</p>
              {provider === 'edahab' && (
                <p className="text-xs text-red-600 mt-1">Not supported</p>
              )}
            </button>
          </div>
          {provider === 'edahab' && currency === 'SLSH' && (
            <p className="text-xs text-orange-600 mt-2">
              eDahab only supports USD payments
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Phone className="inline w-4 h-4 mr-1" />
            Customer Phone Number *
          </label>
          <input
            type="tel"
            value={customerPhone}
            onChange={e => setCustomerPhone(e.target.value)}
            placeholder={provider === 'zaad' ? '63XXXXXXX or 252615234567' : '252615234567'}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            {provider === 'zaad'
              ? 'Zaad: Use 63 prefix or full number with 252'
              : 'Payment request will be sent to this number'}
          </p>
          <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
            <User size={12} />
            Customer name will be captured automatically after approval
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>What happens next:</strong>
        </p>
        <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
          <li>Payment request is sent directly to customer's phone</li>
          <li>Customer receives prompt on their {provider === 'zaad' ? 'Zaad' : 'eDahab'} app</li>
          <li>Customer enters PIN to approve payment</li>
          <li>Receipt is generated automatically upon confirmation</li>
        </ol>
      </div>

      <div className="flex gap-2 sm:gap-3">
        <button
          onClick={handleCancel}
          className="flex-1 py-3 sm:py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition text-sm sm:text-base"
        >
          Cancel
        </button>
        <button
          onClick={initiatePayment}
          disabled={!customerPhone.trim() || customerPhone.length < 9 || (provider === 'edahab' && currency === 'SLSH')}
          className="flex-1 py-3 sm:py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition flex items-center justify-center gap-1 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          <CheckCircle size={18} className="flex-shrink-0" />
          <span className="hidden sm:inline">Send Payment Request</span>
          <span className="sm:hidden">Send Request</span>
        </button>
      </div>
    </div>
  );
}
