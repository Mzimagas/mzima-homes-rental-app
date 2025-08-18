#!/bin/bash

echo "🚀 Deploying KodiRent to Vercel..."

# Make sure we're in the right directory
cd "$(dirname "$0")"

# Check if build works
echo "📦 Testing build..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "🌐 Starting Vercel deployment..."
    
    # Deploy with Vercel
    npx vercel --prod
else
    echo "❌ Build failed. Please fix build errors before deploying."
    exit 1
fi
