# Multi-Wallet Authentication Setup Guide

Your app now supports **TWO** authentication methods:
1. **WalletConnect** - Connect 300+ wallets (Trust Wallet, Rainbow, Coinbase Wallet, etc.)
2. **Magic Link** - Login with email (no wallet extension needed)

## Quick Setup

### Step 1: Get WalletConnect Project ID (FREE)

1. Go to https://cloud.walletconnect.com
2. Sign up for a free account
3. Create a new project
4. Copy your Project ID
5. Add to `frontend/.env`:
   ```
   REACT_APP_WALLETCONNECT_PROJECT_ID=your_project_id_here
   ```

### Step 2: Get Magic Link API Key (FREE)

1. Go to https://magic.link
2. Sign up for a free account
3. Create a new app
4. Copy your Publishable API Key
5. Add to `frontend/.env`:
   ```
   REACT_APP_MAGIC_API_KEY=your_magic_api_key_here
   ```

### Step 3: Create Frontend .env File

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env` with your keys:
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_CHAIN_ID=11155111
REACT_APP_CHAIN_NAME=Sepolia
REACT_APP_WALLETCONNECT_PROJECT_ID=your_project_id_here
REACT_APP_MAGIC_API_KEY=your_magic_api_key_here
```

### Step 4: Start the App

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

## How It Works

### WalletConnect Option
- Click "Connect with WalletConnect"
- Scan QR code with mobile wallet OR
- Choose from 300+ supported wallets
- Sign message to authenticate
- No MetaMask extension needed!

### Magic Link Option
- Enter your email address
- Check your email for magic link
- Click link to login
- Wallet created automatically
- No crypto knowledge needed!

## Supported Wallets (WalletConnect)

- Trust Wallet
- Rainbow Wallet
- Coinbase Wallet
- MetaMask Mobile
- Argent
- Zerion
- Ledger Live
- And 300+ more!

## Benefits

### WalletConnect
✅ Works with mobile wallets  
✅ No browser extension needed  
✅ Secure QR code connection  
✅ Multi-chain support  
✅ Free forever  

### Magic Link
✅ No wallet needed  
✅ Email-based login  
✅ Wallet created automatically  
✅ Perfect for non-crypto users  
✅ Free tier available  

## Testing Without API Keys

If you don't have API keys yet:
- WalletConnect will show "YOUR_PROJECT_ID" error
- Magic Link will show "not configured" message
- Get free keys from links above (takes 2 minutes)

## Troubleshooting

### WalletConnect not working?
- Check Project ID is correct in .env
- Restart frontend: `npm start`
- Try different wallet app

### Magic Link not working?
- Check API key is correct in .env
- Check email spam folder
- Verify email is valid
- Restart frontend

### Still using MetaMask?
No! MetaMask is completely removed. You now have:
- WalletConnect (300+ wallets)
- Magic Link (email login)

## Free Tier Limits

### WalletConnect
- Unlimited connections
- Unlimited users
- No credit card required

### Magic Link
- 1,000 monthly active users (free)
- Unlimited logins
- No credit card required

## Next Steps

1. Get your free API keys (5 minutes)
2. Add to .env file
3. Start the app
4. Test both login methods
5. Choose your favorite!

## Support

- WalletConnect Docs: https://docs.walletconnect.com
- Magic Link Docs: https://magic.link/docs
- Issues? Check console for errors
