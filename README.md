# ProAutomate Bundle - Standalone Automation Dashboard

A self-hosted, standalone business automation platform that runs **4 powerful AI-powered automations without Make.com or Zapier**. Everything runs inside a single Next.js web app backed by your own PostgreSQL database — no third-party automation subscriptions, no per-task fees, and full control over your data and API keys.

Built with Next.js 16 (App Router), TypeScript, Prisma, NextAuth, and Tailwind CSS.

---

## ✨ What It Does

ProAutomate replaces the classic "connect Etsy → ChatGPT → Gmail" no-code chains you'd normally build in Make.com or Zapier with a single dashboard you own. You sign in, store your credentials once (encrypted), and trigger or schedule automations directly from the app. AI-powered steps (emails, content, customer analysis) are generated through the Abacus.AI API.

Key points:
- **No Make.com / Zapier required** — the automation logic lives in the app's own API routes.
- **Your keys, your data** — credentials are stored in your database, not a third-party platform.
- **Central dashboard** — run counts, last-run times, and run history for every automation.
- **Authentication built in** — sign up / log in via NextAuth.

---

## 🤖 The 4 Automations

| # | Automation | Description |
|---|------------|-------------|
| 1 | **Etsy → Thank-You Email** | Pulls new Etsy orders and sends personalized, AI-generated thank-you emails to each customer, then logs the order. |
| 2 | **Social Media Planner** | Turns a topic and audience into platform-specific posts (Instagram, Twitter/X, LinkedIn) and schedules them from your content calendar. |
| 3 | **WooCommerce → Notion CRM** | Syncs new WooCommerce orders into a Notion database and adds an AI-generated customer analysis note for each order. |
| 4 | **Content Generator** | Generates a full content package — SEO blog post, social media captions, and an email newsletter — from a single topic/keyword. |

---

## 📋 Requirements

- **Node.js 18+** (Node 20.9+ recommended)
- **PostgreSQL** database (local or hosted)
- An **Abacus.AI API key** for the AI-powered steps

---

## 🚀 Setup

### 1. Install dependencies

```bash
npm install
```

> The project also works with `yarn install` (a `yarn.lock` is included).

### 2. Configure environment variables

Copy the example file and fill in your own values:

```bash
cp .env.example .env
```

Then edit `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?connect_timeout=15"
NEXTAUTH_SECRET="your-nextauth-secret-here"
AUTH_SECRET="your-auth-secret-here"
ABACUSAI_API_KEY="your-abacusai-api-key-here"
```

Generate secure secrets with:

```bash
openssl rand -base64 32
```

### 3. Set up the database

Generate the Prisma client and push the schema to your database:

```bash
npx prisma generate
npx prisma db push
```

(Optional) Seed initial data:

```bash
npx prisma db seed
```

### 4. Run the app

```bash
npm run dev
```

The app will be available at **http://localhost:3000**. Sign up for an account, add your service credentials in **Settings**, and start running automations from the **Dashboard**.

### Production build

```bash
npm run build
npm run start
```

---

## 🗂️ Project Structure

```
proautomate-bundle/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes (automations, auth, settings)
│   │   └── automations/      # etsy-email, social-media,
│   │                         # woocommerce-notion, content-generator
│   ├── automation/           # Automation UI pages
│   ├── dashboard/            # Main dashboard
│   ├── login/ · signup/      # Auth pages
│   └── settings/             # Credential management
├── components/               # Reusable UI components
├── lib/                      # Shared utilities
├── prisma/                   # Prisma schema
├── scripts/                  # Seed / utility scripts
├── public/                   # Static assets
└── .env.example              # Environment variable template
```

---

## 📸 Screenshots

> _Screenshots coming soon._
>
> - Dashboard overview
> - Automation detail / run page
> - Settings (credential management)

<!-- Add images here, e.g.:
![Dashboard](docs/screenshots/dashboard.png)
![Automation](docs/screenshots/automation.png)
-->

---

## 🔒 Security

- `.env` is git-ignored — **never commit real credentials**.
- Service credentials are stored in your own database.
- Rotate `NEXTAUTH_SECRET` / `AUTH_SECRET` and API keys periodically.

---

## 📄 License

Proprietary — part of the ProAutomate Bundle. All rights reserved.
