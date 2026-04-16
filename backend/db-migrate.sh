#!/bin/bash
# Database Migration Helper Script

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}VITAL API - Database Migration Helper${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}✗ .env file not found!${NC}"
    echo "Please copy .env.example to .env and update with your Supabase credentials"
    exit 1
fi

# Check if DATABASE_URL is set
if ! grep -q "DATABASE_URL=" .env; then
    echo -e "${RED}✗ DATABASE_URL not configured in .env${NC}"
    exit 1
fi

# Extract password placeholder check
if grep -q "\[YOUR-PASSWORD\]" .env; then
    echo -e "${YELLOW}⚠️  WARNING: [YOUR-PASSWORD] placeholder found in .env${NC}"
    echo "Please update your .env with the actual Supabase password"
    echo ""
fi

# Activate virtual environment
source venv/bin/activate

# Main menu
echo "Available commands:"
echo ""
echo "1. Create new migration (with auto-detection)"
echo "   - alembic revision --autogenerate -m 'migration name'"
echo ""
echo "2. Apply migrations to database"
echo "   - alembic upgrade head"
echo ""
echo "3. Create empty migration"
echo "   - alembic revision -m 'migration name'"
echo ""
echo "4. Check current migration status"
echo "   - alembic current"
echo ""
echo "5. Show migration history"
echo "   - alembic history"
echo ""
echo "Example usage:"
echo "  bash db-migrate.sh upgrade     # Apply all pending migrations"
echo "  bash db-migrate.sh current     # Show current revision"
echo "  bash db-migrate.sh history     # Show migration history"
echo ""

# Handle command line arguments
if [ $# -eq 0 ]; then
    echo "Usage: bash db-migrate.sh [command]"
    echo "Commands: upgrade, current, history, or run 'alembic --help'"
    exit 0
fi

# Run alembic command
echo -e "${BLUE}Running: alembic $@${NC}"
echo ""
alembic "$@"
echo ""
echo -e "${GREEN}✓ Command completed${NC}"
