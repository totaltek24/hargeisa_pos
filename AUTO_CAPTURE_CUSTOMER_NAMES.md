# Automatic Customer Name Capture

## Overview

Customer names are now **automatically captured** from Sifalo payment responses after customers approve payments. No manual entry required!

## What Changed

### ✅ Removed
- Account verification button
- Manual customer name entry field
- verify-account-name edge function

### ✅ Simplified
Payment flow now only requires:
1. Select provider (Zaad/eDahab)
2. Select currency (USD/SLSH)
3. Enter customer phone number
4. Click "Send Payment Request"

The customer name is automatically saved to the database after the customer approves the payment.

## How It Works

1. **You enter phone number** → No name needed!
2. **Payment request sent** → Customer receives prompt on their phone
3. **Customer enters PIN** → Approves payment
4. **Sifalo returns data** → Includes customer's registered account name
5. **Auto-saved** → Name stored in `mobile_money_payments.customer_name`

## Testing Instructions

### Step 1: Process a Payment
1. Add items to cart
2. Click "Mobile Money"
3. Select provider (Zaad/eDahab)
4. Enter customer phone number only
5. Click "Send Payment Request"
6. Wait for customer to approve

### Step 2: Open Developer Console (F12)

Look for these log sections:

#### A) Initial Payment Response
```
========== SIFALO PAYMENT RESPONSE ==========
Full response: {
  "code": 601,
  "sid": "ABC123",
  "response": "Payment successful",
  "name": "Mohamed Ahmed Hassan"  ← CUSTOMER NAME HERE
}
✓ Found customer name in payment response: Mohamed Ahmed Hassan
```

#### B) Webhook Verification
```
========== SIFALO VERIFICATION RESPONSE ==========
Full response: {
  "status": "success",
  "code": 601,
  "amount": "10.00",
  "customerName": "Mohamed Ahmed Hassan"  ← CUSTOMER NAME HERE
}
✓ Found customer name: Mohamed Ahmed Hassan
```

### Step 3: Check Your Database

Query to see captured names:
```sql
SELECT
  transaction_reference,
  customer_name,
  sender_phone,
  amount,
  status
FROM mobile_money_payments
ORDER BY created_at DESC;
```

## Checked Field Names

The system automatically checks these fields (in order):
1. `name`
2. `customerName`
3. `customer_name`
4. `accountName`
5. `account_name`
6. `accountHolder`
7. `senderName`
8. `sender.name`
9. `data.name`
10. `data.customerName`
11. `data.accountName`

## If Names Aren't Being Captured

### 1. Check Console Logs
Look for:
- `✓ Found customer name:` = Working!
- `✗ No customer name found` = Need to investigate

### 2. Review Full API Response
The console logs the **complete** Sifalo response. Look for any field that contains a person's name.

### 3. Contact Sifalo Support

If you can't find the name field, email Sifalo:

```
Subject: Customer Name Field in Payment API Response

Hello Sifalo Support,

We're successfully processing payments via your API but need help identifying
which field contains the customer's account holder name.

Here's a sample response from your API:
[PASTE FULL RESPONSE FROM CONSOLE]

Could you please confirm which field contains the customer's registered name?

We've checked: name, customerName, accountName, senderName, accountHolder, etc.

Thank you!
```

### 4. Add the New Field

Once Sifalo confirms the field name, update these files:

**File:** `supabase/functions/mobile-money-payment/index.ts` (line ~154)
```typescript
const customerName = paymentData.name ||
                    paymentData.customerName ||
                    paymentData.THE_NEW_FIELD_NAME ||  // ← Add here
                    // ... rest
```

**File:** `supabase/functions/mobile-money-webhook/index.ts` (similar location)
```typescript
const customerName = verificationResult.name ||
                    verificationResult.customerName ||
                    verificationResult.THE_NEW_FIELD_NAME ||  // ← Add here
                    // ... rest
```

Then redeploy the functions (this happens automatically).

## Database Schema

**Table:** `mobile_money_payments`
**Column:** `customer_name` (text, nullable)

This field is automatically populated when Sifalo returns customer data.

## Benefits

✅ **Faster checkout** - No manual entry needed
✅ **More accurate** - Names come directly from mobile money provider
✅ **Better records** - Automatic capture means no missing data
✅ **Less errors** - No typos from manual entry

## Troubleshooting

**Q: What if the customer name is never captured?**
A: Payments still work! The phone number is always saved. Names are optional but helpful for records.

**Q: Can I still manually add a name?**
A: Yes, you can update the database directly if needed:
```sql
UPDATE mobile_money_payments
SET customer_name = 'Full Name'
WHERE id = 'payment_id';
```

**Q: Does this work with both Zaad and eDahab?**
A: Yes! Both providers go through Sifalo, so the same auto-capture logic applies.
