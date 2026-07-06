# The Republic - Mobile App Setup Guide

## Overview

The Republic is a curated directory/aggregator mobile app that lets users browse external websites inside an in-app WebView. It offers:
- Free access to 10 curated websites
- Paid Pro membership unlocks all ~140 websites across 140 categories
- Clean modern UI with pill tabs for categories
- In-app WebView with popup mitigation
- Light/dark mode support

## Project Structure

```
therepublic/
├── mobile/                    # React Native Expo app
│   ├── app/                 # App source code
│   │   ├── components/      # Reusable UI components
│   │   ├── screens/        # App screens
│   │   ├── navigation/     # Navigation setup
│   │   ├── services/       # API services
│   │   ├── contexts/       # React contexts
│   │   ├── constants/      # App constants
│   │   └── types/         # TypeScript types
│   ├── App.tsx             # App entry point
│   ├── app.json            # Expo config
│   └── package.json       # Dependencies
│
├── admin/                   # Admin panel (static HTML)
│   └── admin.html
│
├── backend/                 # Backend files
│   ├── supabase/           # Supabase SQL
│   ├── stripe/             # Stripe Edge Functions
│   └── postmark/           # Postmark helpers
│
└── docs/                   # Documentation
    └── README.md
```

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Supabase account
- Stripe account
- Postmark account (optional)

## Part 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to https://supabase.com and create a new project
2. Note your Project URL and API keys
3. Go to SQL Editor in the Supabase Dashboard

### 1.2 Execute SQL

Copy and paste the contents of `backend/supabase/supabase_full_setup.sql` into the SQL Editor and execute.

This will create:
- All required tables
- Row Level Security (RLS) policies
- Functions and triggers
- Seed data with 140 categories
- 10 free websites
- Admin helper views

### 1.3 Configure Edge Functions

In Supabase Dashboard, go to Edge Functions and create:

1. **`create-checkout-session`** - Creates Stripe checkout
2. **`handle-webhook`** - Handles Stripe webhooks  
3. **`create-customer-portal-session`** - Customer portal access

### 1.4 Set Environment Variables

In Edge Function settings, set:
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_PRICE_ID` - Your Stripe Price ID
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret
- `STRIPE_SUCCESS_URL` - `therepublic://checkout-success`
- `STRIPE_CANCEL_URL` - `therepublic://checkout-cancel`

## Part 2: Stripe Setup

### 2.1 Create Stripe Account

1. Go to https://stripe.com and sign up
2. Get your API keys from Developers > API keys

### 2.2 Create Product/Price

1. In Stripe Dashboard, go to Products
2. Create "Pro Membership" product
3. Set price as $9.99/month
4. Note the Price ID (starts with `price_`)

### 2.3 Configure Webhook

1. Go to Developers > Webhooks > Add endpoint
2. Endpoint URL: `https://<your-project>.supabase.co/functions/v1/handle-webhook`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Get signing secret and add to Supabase Edge Functions

### 2.4 Create Customer Portal (Optional)

1. Go to Settings > Customer Portal
2. Enable it with your branding
3. Configure allowed features

## Part 3: Postmark Setup (Optional)

### 3.1 Create Postmark Account

1. Go to https://postmarkapp.com and sign up
2. Verify your sending email
3. Get Server API Token

### 3.2 Configure

Add to Supabase Edge Functions:
- `POSTMARK_SERVER_TOKEN` - Your Postmark server token
- `FROM_EMAIL` - `contact@therepublic.it.com`

## Part 4: Mobile App Setup

### 4.1 Install Dependencies

```bash
cd mobile
npm install
```

### 4.2 Configure Environment

Create `.env` file:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
EXPO_PUBLIC_DEEPLINK_SCHEME=therepublic
```

### 4.3 Run Development Server

```bash
npx expo start
```

### 4.4 Build for Production

```bash
npx expo prebuild
npx expo run:android
npx expo run:ios
```

## Part 5: Admin Setup

### 5.1 Access Admin Panel

1. Host `admin/admin.html` on any static host
2. Or use local server: `npx serve admin`

### 5.2 Login

- Email: `admin@example.com`
- Password: `admin123`

### 5.3 Configure

In production, change the admin credentials in the JavaScript.

## Part 6: Deep Link Configuration

### iOS (Apple Developer)

1. Go to Xcode > Signing & Capabilities
2. Add Associated Domains: `therepublic://`

### Android

1. Add intent filter in AndroidManifest.xml:
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW"/>
  <category android:name="android.intent.category.DEFAULT"/>
  <category android:name="android.intent.category.BROWSABLE"/>
  <data android:scheme="therepublic"/>
</intent-filter>
```

## Part 7: Update Seed Data

### 7.1 Add Real Website URLs

The seed data uses placeholder URLs. Replace with real URLs in your database:

```sql
UPDATE websites 
SET url = 'https://www.walmart.com'
WHERE name = 'Walmart';
```

### 7.2 Add Categories

The 140 categories are seeded. Add more:

```sql
INSERT INTO categories (name, slug, description, default_color_light, default_sort_order)
VALUES ('New Category', 'new-category', 'Description here', '#000000', 141);
```

## Part 8: Testing Checklist

### 8.1 Authentication
- [ ] User can sign up
- [ ] User receives confirmation email
- [ ] User can sign in
- [ ] User can sign out
- [ ] Terms/privacy acceptance required

### 8.2 App Functionality
- [ ] Categories load in home screen
- [ ] Websites display correctly
- [ ] Free websites open in WebView
- [ ] Paid websites show upgrade prompt for free users
- [ ] Pro users can access all websites
- [ ] WebView works with external sites
- [ ] App banner mitigation works

### 8.3 Profile & Settings
- [ ] Profile displays correctly
- [ ] Theme toggle works
- [ ] Logout works

### 8.4 Membership
- [ ] Free user sees upgrade prompt
- [ ] Stripe checkout opens
- [ ] Success deep link works
- [ ] Cancel deep link works
- [ ] Webhook updates membership
- [ ] Profile shows Pro status

### 8.5 Support
- [ ] User can create ticket
- [ ] User can reply to ticket
- [ ] Admin can view tickets
- [ ] Admin can reply

### 8.6 Admin Panel
- [ ] Admin login works
- [ ] Dashboard shows stats
- [ ] Can manage websites
- [ ] Can manage categories

## Part 9: Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anon key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role | For Edge Functions |
| `STRIPE_SECRET_KEY` | Stripe secret key | Yes |
| `STRIPE_PRICE_ID` | Stripe Price ID | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | Yes |
| `STRIPE_SUCCESS_URL` | Success deep link | Yes |
| `STRIPE_CANCEL_URL` | Cancel deep link | Yes |
| `POSTMARK_SERVER_TOKEN` | Postmark token | Optional |
| `FROM_EMAIL` | Sender email | Optional |

## Part 10: Security Notes

- Never expose `SUPABASE_SERVICE_ROLE_KEY` in the mobile app
- Never expose `STRIPE_SECRET_KEY` in the mobile app
- Always use environment variables
- RLS policies protect your data
- Admin routes check for admin role

## Troubleshooting

### Issue: App won't build
- Run `npm install` again
- Clear node_modules and reinstall
- Check Expo doctor: `npx expo doctor`

### Issue: WebView not loading
- Check internet connection
- Verify URL is valid
- Check WebView logs

### Issue: Stripe checkout fails
- Verify Price ID is correct
- Check Stripe dashboard for errors
- Verify webhook endpoint is active

### Issue: Membership not updating
- Check webhook logs in Stripe
- Verify webhook endpoint in Supabase
- Check console for errors

## Support

For issues or questions:
- Email: contact@therepublic.it.com
- Use in-app support feature

## License

All rights reserved. The Republic 2026.