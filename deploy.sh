#!/bin/bash

# FinTrack-ERP Deployment Script
# This script helps deploy the FinTrack-ERP application on a server

echo "🚀 Starting FinTrack-ERP Deployment..."

# Check if required environment variables are set
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ] || [ -z "$DB_PORT" ]; then
    echo "❌ Error: Database environment variables not set!"
    echo "Please set the following environment variables:"
    echo "  - DB_HOST"
    echo "  - DB_USER" 
    echo "  - DB_PASSWORD"
    echo "  - DB_NAME"
    echo "  - DB_PORT"
    echo ""
    echo "Example:"
    echo "export DB_HOST=localhost"
    echo "export DB_USER=postgres"
    echo "export DB_PASSWORD=yourpassword"
    echo "export DB_NAME=fintrack_erp"
    echo "export DB_PORT=5432"
    exit 1
fi

echo "✅ Environment variables check passed"

# Install dependencies if needed
if ! command -v go &> /dev/null; then
    echo "❌ Error: Go is not installed!"
    echo "Please install Go first: https://golang.org/dl/"
    exit 1
fi

echo "✅ Go is installed"

# Check if we're in the right directory
if [ ! -f "main.go" ]; then
    echo "❌ Error: main.go not found!"
    echo "Please run this script from the FinTrack-ERP root directory"
    exit 1
fi

echo "✅ In correct project directory"

# Download Go modules
echo "📦 Downloading Go modules..."
go mod download
go mod tidy

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to download Go modules!"
    exit 1
fi

echo "✅ Go modules downloaded successfully"

# Build the application
echo "🔨 Building the application..."
go build -o fintrack-erp main.go

if [ $? -ne 0 ]; then
    echo "❌ Error: Build failed!"
    exit 1
fi

echo "✅ Build successful"

# Run database migration
echo "🗄️ Running database migration..."
./fintrack-erp --migrate-only

if [ $? -ne 0 ]; then
    echo "❌ Error: Database migration failed!"
    echo "Please check your database connection and permissions"
    exit 1
fi

echo "✅ Database migration completed successfully"

# Start the server
echo "🌐 Starting the server..."
echo "Server will be available at: http://localhost:8090"
echo "Press Ctrl+C to stop the server"
echo ""

./fintrack-erp
