# Sifalo Account Verification Setup

## Current Status

The system attempts to verify account holder names from phone numbers using the Sifalo API. Currently, **8 different endpoint combinations** are tested, but none return account names.

## Debug Information

When you test account verification:

1. Open browser **Developer Console** (F12)
2. Enter a phone number and click **Verify**
3. Look for section: **RAW API RESPONSES**
4. This shows exactly what Sifalo returns for each attempt

## Tested Endpoints

All attempts use: `https://api.sifalopay.com/gateway/`

The following parameter combinations are tested:

### 1. Account Info with paymentMethod
```json
{
  "gateway": "waafi",
  "merchant": "[your-merchant-code]",
  "paymentMethod": "MWALLET_ACCOUNT",
  "accountNo": "634171876",
  "currency": "USD",
  "action": "getAccountInfo"
}
```

### 2. Gateway with account_info action
```json
{
  "gateway": "waafi",
  "account": "634171876",
  "action": "account_info",
  "currency": "USD"
}
```

### 3. Gateway with verify_account action
```json
{
  "gateway": "waafi",
  "account": "634171876",
  "action": "verify_account"
}
```

### 4. Gateway with inquiry type
```json
{
  "gateway": "waafi",
  "account": "634171876",
  "type": "inquiry",
  "currency": "USD"
}
```

### 5. Gateway with validate action
```json
{
  "gateway": "waafi",
  "mobile": "634171876",
  "action": "validate"
}
```

### 6-8. Alternative endpoints
- `/account/lookup` - Returns 404
- `/inquiry/` - Returns 404
- `/customer/info` - Returns 404

## What to Ask Sifalo Support

**Email:** support@sifalo.com
**Website:** https://sifalopay.com

### Sample Email

```
Subject: Account Name Verification API Endpoint

Hello Sifalo Support,

I'm integrating your API and need to verify account holder names from mobile numbers
before processing payments (similar to how the underlying Waafi/Zaad/eDahab APIs work).

I've tested multiple endpoint combinations but none return the account holder's name:

- POST https://api.sifalopay.com/gateway/
  With actions: getAccountInfo, account_info, verify_account, validate
  All return HTTP 200 but no name field

Could you please provide:

1. The correct API endpoint for account name verification
2. Required request parameters and format
3. Expected response format with example
4. Any authentication headers needed beyond Basic Auth

Our current credentials:
- Merchant Code: [your-merchant-code]
- Using Basic Auth with username/password

Thank you!
```

## Expected Response Format

Once Sifalo provides the correct endpoint, we expect responses like:

```json
{
  "success": true,
  "accountName": "Mohamed Ahmed Hassan",
  "phoneNumber": "634171876",
  "provider": "zaad"
}
```

Or:

```json
{
  "status": "success",
  "data": {
    "name": "Mohamed Ahmed Hassan",
    "phone": "634171876"
  }
}
```

## Updating the Code

Once you get the correct endpoint from Sifalo, update:

**File:** `supabase/functions/verify-account-name/index.ts`

1. Find the `attempts` array (around line 80)
2. Add the correct endpoint/parameters as the first attempt
3. Redeploy: The system will auto-deploy on save

## Fallback Behavior

Until account verification works:
- User can manually enter customer name
- Name field shows immediately if verification fails
- Payment still processes normally
