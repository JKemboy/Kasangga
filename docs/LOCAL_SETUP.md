# CampusTutor local setup

## Requirements

- Git
- Node.js `20.19+` or `22.12+` (or newer) and npm
- Access to the configured Supabase project

## Get the code

For a fresh checkout:

```powershell
git clone https://github.com/JKemboy/Campustutor.git
cd Campustutor
```

To update an existing checkout on `main`:

```powershell
git switch main
git pull origin main
```

## Install and configure

Install the project packages:

```powershell
npm install
```

Create the local Vite environment file from the example:

```powershell
Copy-Item .env.example .env.local
```

`.env.example` points to the configured CampusTutor Supabase project and includes its public client key. Keep `.env.local` on your computer; it is ignored by Git. If using another Supabase project, replace these values with that project's URL and publishable (or anon) key:

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

The browser app connects to the Supabase project in `.env.local`; Vite itself runs locally. Local changes and test accounts may therefore affect that project's data.

## Run the app

```powershell
npm run dev
```

Open the localhost URL printed by Vite, usually `http://localhost:5173`.

Google sign-in must allow the local callback URL in Supabase Authentication URL settings and Google OAuth settings:

```text
http://localhost:5173/register
```

Use an authorized CSU account. Payment checkout and webhooks also require the configured Supabase Edge Functions and provider secrets; `npm run dev` alone does not start those services.

## Other commands

```powershell
npm run build
npm run preview
```
