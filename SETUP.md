# Poker Night Manager — Setup Guide

## 1. Install Node.js

Download from https://nodejs.org and install the LTS version.

Then in this folder run:
```bash
npm install
```

---

## 2. Set Up Supabase (free database)

1. Go to https://supabase.com and create a free account
2. Click **New Project** — give it any name, pick the free tier
3. Wait ~2 minutes for it to provision
4. Go to **SQL Editor** and paste the entire contents of `supabase-schema.sql` and click **Run**
5. Go to **Settings > API** and copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon public** key
   - **service_role** key (click to reveal)

---

## 3. Configure Environment Variables

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Pick your group's admin PIN** (e.g. `1234`) and generate its hash:
```bash
node -e "const c=require('crypto'); console.log(c.createHash('sha256').update('1234'+'my-secret-salt').digest('hex'))"
```

Replace `1234` with your PIN and `my-secret-salt` with any random string.
Add to `.env.local`:
```
PIN_SALT=my-secret-salt
ADMIN_PIN_HASH=<output from above>
```

---

## 4. Run Locally

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

---

## 5. Deploy to Vercel (free — always on)

1. Create a free GitHub account if you don't have one
2. Create a new repository and push this folder to it:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/poker-night.git
   git push -u origin main
   ```
3. Go to https://vercel.com and sign in with GitHub
4. Click **Add New Project** → import your repository
5. Go to **Environment Variables** and add all the variables from `.env.local`
6. Click **Deploy**

Your app will be live at something like `https://poker-night-xxxxx.vercel.app`

Share this URL with all 14 players and tell them to **Add to Home Screen** on their phones!

---

## 6. Add App Icon to Home Screen (iPhone)

1. Open the URL in Safari
2. Tap the Share button (box with arrow)
3. Tap **Add to Home Screen**
4. Name it "Poker Night" → Add

---

## Notes

- **Admin PIN** is needed for: creating sessions, starting a session, entering results, deleting sessions
- The PIN is cached for 30 minutes per browser tab
- RSVPs and claiming bring items require NO PIN — anyone can do it
- Results must balance to ₪0 before saving (e.g. one player wins +₪100, others must total -₪100)
