#!/bin/bash

# Load environment variables from backend/.env
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Get database URL from environment or use default
DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/eternity_wallet}"

echo "🔧 Creating wallet tables..."
echo "📊 Database: $DB_URL"

# Run SQL script
psql "$DB_URL" -f create-wallet-tables.sql

if [ $? -eq 0 ]; then
  echo "✅ Tables created successfully!"
else
  echo "❌ Failed to create tables"
  exit 1
fi
