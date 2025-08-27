# Mzima Homes Rental App - Deployment Guide

## Prerequisites

1. Supabase project with database and edge functions deployed
2. GitHub account
3. Vercel account (free tier available)

## Step-by-Step Deployment

### 1. Prepare Repository

```bash
# Initialize git repository (if not already done)
git init
git add .
git commit -m "Initial commit - Mzima Homes Rental App"

# Create GitHub repository and push
git remote add origin https://github.com/yourusername/mzima-homes-app.git
git branch -M main
git push -u origin main
```

### 2. Deploy to Vercel

#### Option A: Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: mzima-homes-app
# - Directory: ./voi-rental-app
# - Override settings? No
```

#### Option B: Vercel Dashboard

1. Go to https://vercel.com
2. Click "New Project"
3. Import from GitHub
4. Select your repository
5. Set root directory to `voi-rental-app`
6. Click "Deploy"

### 3. Configure Environment Variables

In Vercel Dashboard:

1. Go to Project Settings > Environment Variables
2. Add the following variables:

**Required:**

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `NEXT_PUBLIC_APP_NAME`: "Mzima Homes Rental Management"
- `NEXT_PUBLIC_APP_URL`: Your Vercel app URL

**Optional (for future features):**

- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `SMTP_HOST`
- `SMTP_USER`
- `SMTP_PASS`

### 4. Custom Domain (Optional)

1. In Vercel Dashboard > Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. SSL certificate will be automatically provisioned

### 5. Post-Deployment Verification

1. Visit your deployed app
2. Test authentication flow
3. Verify database connectivity
4. Check all major features

## Production URLs

- **Vercel URL**: https://your-app-name.vercel.app
- **Custom Domain**: https://your-domain.com (if configured)

## Monitoring & Maintenance

- Monitor performance in Vercel Analytics
- Check Supabase logs for database issues
- Set up error tracking (Sentry recommended)
- Regular database backups via Supabase

## Troubleshooting

- Check Vercel function logs for errors
- Verify environment variables are set correctly
- Ensure Supabase RLS policies allow access
- Check network connectivity between Vercel and Supabase
