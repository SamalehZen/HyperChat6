#!/bin/bash

echo "🔧 Updating dependencies for Vercel build..."

# Update caniuse-lite
echo "📦 Updating caniuse-lite..."
npx update-browserslist-db@latest

# Install dependencies with bun
echo "📦 Installing dependencies with bun..."
bun install

# Generate Prisma client
echo "🔄 Generating Prisma client..."
cd packages/prisma && bun prisma generate && cd ../..

# Clean caches
echo "🧹 Cleaning caches..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

echo "✅ Dependencies updated successfully!"