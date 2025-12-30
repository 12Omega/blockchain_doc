# Quick Start Checklist ✅

## 1. Get Free API Keys (5 minutes)

### WalletConnect Project ID
- [ ] Go to https://cloud.walletconnect.com
- [ ] Sign up (free account)
- [ ] Click "Create Project"
- [ ] Copy your Project ID
- [ ] Save it somewhere

### Magic Link API Key
- [ ] Go to https://magic.link
- [ ] Sign up (free account)
- [ ] Click "New App"
- [ ] Copy your Publishable API Key
- [ ] Save it somewhere

## 2. Configure Frontend (2 minutes)

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:
```env
REACT_APP_WALLETCONNECT_PROJECT_ID=paste_your_project_id_here
REACT_APP_MAGIC_API_KEY=paste_your_magic_key_here
```

## 3. Start the Application

### Terminal 1 - Backend
```bash
cd backend
npm run dev
```
Wait for: "Server running on port 3001"

### Terminal 2 - Frontend
```bash
cd frontend
npm start
```
Wait for: Browser opens at http://localhost:3000

## 4. Test WalletConnect

- [ ] Click "Connect with WalletConnect"
- [ ] Choose a wallet (or scan QR with mobile)
- [ ] Approve connection
- [ ] Click "Authenticate with Backend"
- [ ] Sign the message
- [ ] ✅ You're logged in!

## 5. Test Magic Link

- [ ] Disconnect wallet
- [ ] Enter your email address
- [ ] Click "Login with Email"
- [ ] Check your email inbox
- [ ] Click the magic link
- [ ] Click "Authenticate with Backend"
- [ ] Sign the message
- [ ] ✅ You're logged in!

## Troubleshooting

### "YOUR_PROJECT_ID" error?
- Check WalletConnect ID in .env
- Restart frontend: Ctrl+C, then `npm start`

### "Magic Link not configured" message?
- Check Magic API key in .env
- Restart frontend: Ctrl+C, then `npm start`

### Email not arriving?
- Check spam folder
- Wait 1-2 minutes
- Try different email

### Backend not connecting?
- Check backend is running on port 3001
- Check MongoDB is running
- Check backend/.env has correct settings

## What You Get

✅ **WalletConnect**
- 300+ wallet support
- Mobile wallet scanning
- Desktop wallet connection
- No MetaMask needed

✅ **Magic Link**
- Email-based login
- Auto-created wallet
- No crypto knowledge needed
- Perfect for beginners

## Next Steps

After successful login:
1. Update your profile
2. Upload a document
3. Verify a document
4. Check audit trail
5. Test role-based access

## Need Help?

- Setup Guide: `WALLET_SETUP_GUIDE.md`
- What Changed: `AUTHENTICATION_UPDATE.md`
- Test Results: `TEST_RESULTS.md`

## Status Check

Run this to verify everything:
```bash
# Check backend
curl http://localhost:3001/health

# Check frontend
# Browser should show login page at http://localhost:3000
```

## Done! 🎉

You now have a modern multi-wallet authentication system with:
- WalletConnect (300+ wallets)
- Magic Link (email login)
- No MetaMask dependency
- Free forever
