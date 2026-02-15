# Quick Testing Guide for Waafi Payment Integration

## API Credentials Configured

Your test API credentials have been securely integrated into the system:
- **API User ID:** `key9HFXDP`
- **API Secret:** `a9b5a04e79ea2f40e1ce2840e0b406feda354555`

## Three Ways to Setup Test Credentials

### Option 1: Quick Setup Button (Easiest)

1. Login to your POS system
2. Go to **Settings** page
3. Scroll to **Mobile Money Payment Settings**
4. In the **Waafi Service** section, click the orange **"Quick Setup Test Credentials"** button
5. Done! The system will automatically configure everything

### Option 2: Manual Entry in Settings

1. Login to your POS system
2. Navigate to **Settings**
3. Scroll to **Waafi Service** section
4. Fill in:
   - Merchant Phone: `+252000000000` (or your actual number)
   - Merchant Code: `TEST_MERCHANT` (or your actual merchant code)
   - API Key: `key9HFXDP`
   - API Secret: `a9b5a04e79ea2f40e1ce2840e0b406feda354555`
   - Check "Enable Waafi API integration"
5. Click **"Save Payment Settings"**

### Option 3: Database SQL Command

Run this in your Supabase SQL Editor:

```sql
SELECT setup_waafi_test_credentials(
  auth.uid(),
  'TEST_MERCHANT',
  '+252000000000'
);
```

## Testing the Payment Flow

### Complete End-to-End Test

1. **Login** to the POS system
2. **Add products** to the cart
3. Click **"Pay"** button
4. Select **"Mobile Money"** as payment method
5. Choose **"Waafi"** from the dropdown
6. Enter the payment amount
7. Enter customer phone (optional)
8. Click **"Process Payment"**
9. System generates QR code and displays transaction details
10. Check **Reports** page to see the transaction

### Testing via Browser Console

Open the browser console (F12) and run these commands:

**1. Verify Configuration:**
```javascript
const { verifyPaymentSettings } = await import('./src/utils/testPayment.ts');
await verifyPaymentSettings();
```

**2. Test Payment API:**
```javascript
const { testWaafiPayment } = await import('./src/utils/testPayment.ts');
await testWaafiPayment(10.00);
```

**3. Check Transaction Status:**
```javascript
const { checkPaymentStatus } = await import('./src/utils/testPayment.ts');
await checkPaymentStatus('YOUR_TRANSACTION_ID');
```

## What's Been Set Up

### Database Tables
- `payment_provider_settings` - Stores API credentials securely
- `mobile_money_payments` - Tracks all mobile money transactions

### Edge Functions (Serverless APIs)
- `waafi-payment` - Handles payment initiation and QR code generation
- `mobile-money-webhook` - Processes payment status updates from Waafi

### Helper Functions
- `setup_waafi_test_credentials()` - Quick setup function for test credentials
- Test utilities in `src/utils/testPayment.ts`

### UI Components
- Settings page with Waafi configuration section
- Mobile Money Payment modal in checkout
- QR code display for customer scanning
- Transaction history in Reports

## Expected Behavior

### Successful Payment Flow:
1. Payment request sent to Waafi API
2. Transaction ID and QR code returned
3. Record saved to `mobile_money_payments` table with status "pending"
4. QR code displayed to customer
5. Customer scans and completes payment on their phone
6. Waafi sends webhook to update status to "completed"
7. Transaction appears in Reports with full details

## Troubleshooting

### "Waafi is not configured" Error
- Make sure you've saved the API credentials in Settings
- Verify the "Enable Waafi API integration" checkbox is checked
- Run `verifyPaymentSettings()` in console to check configuration

### Payment Initiation Fails
- Check browser console for error messages
- Verify you're logged in
- Ensure API credentials are correct
- Check network tab for API response details

### QR Code Not Generated
- Waafi API may be returning an error
- Check the API response in browser network tab
- Verify merchant code is correct for your Waafi account

### Status Not Updating After Payment
- Webhook URL must be configured in Waafi dashboard
- Webhook URL: `https://dscnxpxyzijitznjazzk.supabase.co/functions/v1/mobile-money-webhook`
- Check edge function logs in Supabase dashboard

## Security Notes

- API credentials are stored encrypted in Supabase database
- All API calls happen server-side through edge functions
- Client never has direct access to API secrets
- Row Level Security (RLS) ensures merchants only see their own data
- Credentials are only accessible to authenticated users

## Next Steps

1. Test the payment flow with the test credentials
2. Verify transactions are recorded correctly
3. Test the customer display (opens in new window)
4. Review transaction reports
5. When ready for production, replace test credentials with real ones

## Support

For detailed setup instructions, see: `PAYMENT_TEST_SETUP.md`

For API documentation: Waafi Pay API Documentation
