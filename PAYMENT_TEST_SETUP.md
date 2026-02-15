# Payment Testing Setup Guide

## Test API Credentials

**Provider:** Waafi Pay

**Credentials:**
- **API User ID (Username):** `key9HFXDP`
- **API Key (Secret):** `a9b5a04e79ea2f40e1ce2840e0b406feda354555`

---

## Quick Setup (Fastest Method)

1. **Login to your POS system**
2. **Open Browser Console** (F12 or Right-click > Inspect > Console)
3. **Run this command:**
   ```javascript
   // Import the setup function
   const { setupTestCredentials } = await import('./src/utils/testPayment.ts');

   // Setup test credentials
   const result = await setupTestCredentials();
   console.log(result);
   ```

4. **Done!** Waafi payment is now configured with test credentials.

---

## Setup Instructions

### Method 1: Through the UI (Recommended)

1. **Login to the POS System**
   - Open the application
   - Login with your cashier credentials

2. **Navigate to Settings**
   - Click on the Settings icon in the sidebar
   - Scroll to the "Mobile Money Payment Settings" section

3. **Configure Waafi Payment**
   - Provider: Select "Waafi"
   - API Key (Username): `key9HFXDP`
   - API Secret: `a9b5a04e79ea2f40e1ce2840e0b406feda354555`
   - Merchant Code: `YOUR_MERCHANT_CODE` (if required)
   - Merchant Phone: Your business phone number
   - Check "Enable Waafi Payments"
   - Click "Save Settings"

### Method 2: Direct Database Insert

If you need to set up payment credentials directly in the database:

```sql
-- Insert Waafi payment settings for a specific user
INSERT INTO payment_provider_settings (
  merchant_id,
  provider,
  api_key,
  api_secret,
  merchant_code,
  merchant_phone,
  is_active
) VALUES (
  'YOUR_USER_ID_HERE',
  'waafi',
  'key9HFXDP',
  'a9b5a04e79ea2f40e1ce2840e0b406feda354555',
  'YOUR_MERCHANT_CODE',
  '+252XXXXXXXXX',
  true
);
```

## Testing Payment Flow

1. **Add Items to Cart**
   - Select products and add them to the shopping cart

2. **Initiate Payment**
   - Click "Pay" button
   - Select "Mobile Money" as payment method
   - Choose "Waafi" as the provider
   - Enter customer phone number (optional)
   - Enter amount

3. **Process Payment**
   - System will generate a QR code for customer to scan
   - Customer scans QR code with Waafi mobile app
   - Payment status updates automatically via webhook

4. **Verify Transaction**
   - Check transaction history in Reports
   - View payment details including status and transaction ID

## Security Notes

- API credentials are stored encrypted in the database
- Credentials are only accessible to authenticated merchants
- All API calls are made server-side through edge functions
- Never expose credentials in client-side code

## Testing with Browser Console

After setting up the credentials, you can test the payment integration using the browser console:

### 1. Verify Payment Settings

```javascript
const { verifyPaymentSettings } = await import('./src/utils/testPayment.ts');
const result = await verifyPaymentSettings();
console.log(result);
```

Expected output:
```
{
  success: true,
  message: "Waafi payment is properly configured",
  details: { hasApiKey: true, hasApiSecret: true, ... }
}
```

### 2. Test Payment Initiation

```javascript
const { testWaafiPayment } = await import('./src/utils/testPayment.ts');
const result = await testWaafiPayment(10.00); // Test $10 payment
console.log(result);
```

Expected output:
```
{
  success: true,
  message: "Payment initiated successfully",
  details: { transactionId: "...", qrCode: "...", ... }
}
```

### 3. Check Payment Status

```javascript
const { checkPaymentStatus } = await import('./src/utils/testPayment.ts');
const result = await checkPaymentStatus('TRANSACTION_ID_HERE');
console.log(result);
```

---

## Troubleshooting

### Payment Initiation Fails
- Verify API credentials are correct
- Check that Waafi service is enabled in settings
- Ensure merchant account is active
- Run `verifyPaymentSettings()` to check configuration

### QR Code Not Generated
- Check Waafi API response in edge function logs
- Verify merchant code is correct
- Ensure API credentials have proper permissions

### Webhook Not Updating Status
- Confirm webhook URL is configured in Waafi dashboard
- Check edge function logs for incoming webhook calls
- Verify webhook URL: `https://dscnxpxyzijitznjazzk.supabase.co/functions/v1/mobile-money-webhook`

### API Authentication Errors
- Ensure you're logged in to the POS system
- Check that your session is still valid
- Try logging out and back in
