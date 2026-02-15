# Sifalo Pay Integration Setup Guide

## Overview

The POS system now integrates with Sifalo Pay for mobile money payments (Zaad and eDahab) using their hosted checkout flow.

## How It Works

1. **Customer Selection**: Customer chooses mobile money payment at checkout
2. **Customer Info**: Cashier enters customer name (phone optional for records)
3. **Checkout Opens**: Secure Sifalo Pay checkout page opens in new window
4. **Payment**: Customer selects payment method (Zaad or eDahab) and completes payment
5. **Verification**: System automatically verifies payment status via webhook
6. **Receipt**: Receipt is generated once payment is confirmed

## Setup Instructions

### 1. Get Sifalo Pay Credentials

1. Register at [Sifalo Pay](https://pay.sifalo.com/auth/signup)
2. Log in to your dashboard
3. Navigate to the Developers section
4. Copy your API credentials (username and password)

### 2. Configure in POS Settings

1. Open your POS application
2. Go to **Settings** → **Payment Providers**
3. Click **Configure** next to Sifalo Pay
4. Enter your credentials:
   - **Merchant Code**: Your Sifalo username
   - **API Key**: Your Sifalo password
5. Set **Active** to ON
6. Save settings

## Payment Flow

### Frontend (Customer Display)
- Customer sees Zaad and eDahab options
- Cashier enters customer name
- Click "Open Payment Checkout"
- Checkout window opens automatically

### Sifalo Checkout Page
- Customer sees amount in USD
- Selects payment method (Zaad or eDahab)
- Enters phone number
- Enters PIN to authorize payment
- Payment processes instantly

### Backend Verification
- Payment status automatically verified via webhook
- Transaction updated in real-time
- POS displays success/failure
- Receipt generated automatically

## Testing

### Test Mode
Use test credentials provided by Sifalo:
- Test amounts: Use small amounts like $1 or $2
- Test phone numbers: Use Sifalo-provided test numbers
- Test PINs: Use Sifalo-provided test PINs

### Production Mode
1. Activate your live Sifalo account
2. Update credentials in settings
3. Use real phone numbers and amounts

## Supported Features

### Currency Support
- **USD**: Supported by both Zaad and eDahab
- **SLSH**: Automatically converted to USD (rate: 11,000 SLSH = $1 USD)

### Payment Methods
- Zaad Service
- eDahab

### Transaction Tracking
- All payments recorded in database
- Status tracking (pending, confirmed, failed)
- External reference (Sifalo transaction ID)
- Customer details saved for records

## API Endpoints

### Initiate Payment
**Edge Function**: `mobile-money-payment`
- Creates checkout session
- Returns checkout URL
- Opens in new window

### Payment Webhook
**Edge Function**: `mobile-money-webhook`
- Receives payment callback from Sifalo
- Verifies transaction status
- Updates payment record
- Returns success page to customer

## Troubleshooting

### Payment Not Initiating
- Verify credentials are correct in Settings
- Check that Sifalo provider is set to Active
- Ensure internet connection is stable

### Checkout Window Doesn't Open
- Check browser popup blocker settings
- Allow popups for your POS domain
- Try using a different browser

### Payment Status Not Updating
- Check webhook URL is accessible
- Verify Sifalo account is active
- Check edge function logs in Supabase

### Failed Transactions
- Verify customer has sufficient balance
- Check phone number is correct
- Ensure payment method is active
- Contact Sifalo support if issues persist

## Security Notes

- All API calls use Basic Authentication
- Credentials stored securely in database
- Edge functions use service role for database access
- No credentials exposed to client
- HTTPS required for all communications

## Support

For Sifalo-specific issues:
- Email: support@sifalo.com
- Documentation: https://developer.sifalopay.com

For POS integration issues:
- Check edge function logs in Supabase
- Review payment records in database
- Check browser console for errors
