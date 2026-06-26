#!/usr/bin/env bash
##############################################################################
#  Epic Club — Automated First-Time Setup Script
#
#  Usage:
#    chmod +x scripts/setup.sh
#    ./scripts/setup.sh
#
#  What this script does:
#    1. Verifies Docker & Docker Compose are installed
#    2. Creates .env from .env.example if it doesn't exist
#    3. Generates cryptographically secure secrets automatically
#    4. Creates required directories (nginx logs, ssl placeholders)
#    5. Creates self-signed SSL certs for local development
#    6. Builds and starts all containers
#    7. Waits for the database to be healthy then confirms setup
##############################################################################

set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ─── Helpers ──────────────────────────────────────────────────────────────────
info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*"; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}══ $* ══${RESET}\n"; }

# Script directory (works regardless of where it's called from)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

# ─── 1. Dependency Checks ─────────────────────────────────────────────────────
header "Checking Dependencies"

command -v docker >/dev/null 2>&1 || error "Docker is not installed. Visit https://docs.docker.com/get-docker/"
success "Docker found: $(docker --version)"

# Support both 'docker compose' (v2) and 'docker-compose' (v1)
if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    error "Docker Compose not found. Visit https://docs.docker.com/compose/install/"
fi
success "Docker Compose found: $($COMPOSE_CMD version)"

command -v openssl >/dev/null 2>&1 || error "openssl is required but not installed."
success "OpenSSL found: $(openssl version)"

# ─── 2. Generate .env File ────────────────────────────────────────────────────
header "Setting Up Environment File"

if [ -f ".env" ]; then
    warn ".env file already exists — skipping creation. Delete it to regenerate."
else
    info "Copying .env.example to .env..."
    cp .env.example .env

    # Auto-generate cryptographically secure secrets
    info "Generating secure secrets with openssl..."

    JWT_SECRET=$(openssl rand -base64 32)
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)
    DB_PASSWORD=$(openssl rand -base64 18 | tr -dc 'a-zA-Z0-9' | head -c 24)
    REDIS_PASSWORD=$(openssl rand -base64 18 | tr -dc 'a-zA-Z0-9' | head -c 24)

    # Use sed to replace placeholder values in .env
    # macOS and Linux compatible sed syntax
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|CHANGE_ME_replace_with_openssl_rand_base64_32_output|${JWT_SECRET}|g" .env
        sed -i '' "s|CHANGE_ME_replace_with_different_openssl_rand_base64_32|${JWT_REFRESH_SECRET}|g" .env
        sed -i '' "s|CHANGE_ME_strong_db_password_here|${DB_PASSWORD}|g" .env
        sed -i '' "s|CHANGE_ME_strong_redis_password_here|${REDIS_PASSWORD}|g" .env
    else
        sed -i "s|CHANGE_ME_replace_with_openssl_rand_base64_32_output|${JWT_SECRET}|g" .env
        sed -i "s|CHANGE_ME_replace_with_different_openssl_rand_base64_32|${JWT_REFRESH_SECRET}|g" .env
        sed -i "s|CHANGE_ME_strong_db_password_here|${DB_PASSWORD}|g" .env
        sed -i "s|CHANGE_ME_strong_redis_password_here|${REDIS_PASSWORD}|g" .env
    fi

    success ".env created with auto-generated secrets."
    warn "IMPORTANT: Update GOOGLE_CLIENT_ID and APP_URL in .env before deploying."
fi

# ─── 3. Create Required Directories ──────────────────────────────────────────
header "Creating Directories"

mkdir -p nginx/logs nginx/ssl
success "nginx/logs and nginx/ssl directories are ready."

# ─── 4. Self-signed SSL for Local Development ─────────────────────────────────
header "SSL Certificate Setup"

if [ -f "nginx/ssl/fullchain.pem" ] && [ -f "nginx/ssl/privkey.pem" ]; then
    success "SSL certificates already exist — skipping generation."
else
    info "Generating self-signed SSL certificates for local development..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/privkey.pem \
        -out nginx/ssl/fullchain.pem \
        -subj "/C=US/ST=Local/L=Local/O=EpicClub/CN=localhost" \
        -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" \
        2>/dev/null

    success "Self-signed certificates created in nginx/ssl/"
    warn "For production: replace with real certificates from Let's Encrypt or your CA."
fi

# ─── 5. Ensure .gitignore Protects Secrets ────────────────────────────────────
header "Securing Sensitive Files"

GITIGNORE_LINES=(
    ".env"
    "nginx/ssl/*.pem"
    "nginx/logs/"
    "*.pem"
    "*.key"
)

if [ -f ".gitignore" ]; then
    for line in "${GITIGNORE_LINES[@]}"; do
        if ! grep -qF "$line" .gitignore; then
            echo "$line" >> .gitignore
            info "Added '$line' to .gitignore"
        fi
    done
else
    printf "%s\n" "${GITIGNORE_LINES[@]}" > .gitignore
    info "Created .gitignore"
fi

success ".gitignore is protecting secrets and certificates."

# ─── 6. Build Docker Images ───────────────────────────────────────────────────
header "Building Docker Images"

info "Building backend and frontend images (this may take a few minutes)..."
$COMPOSE_CMD build --parallel

success "All images built successfully."

# ─── 7. Start Services ────────────────────────────────────────────────────────
header "Starting Services"

info "Bringing up all services in detached mode..."
$COMPOSE_CMD up -d

# ─── 8. Wait for Database Health ─────────────────────────────────────────────
header "Waiting for Database"

info "Waiting for PostgreSQL to become healthy..."
MAX_RETRIES=30
RETRY_INTERVAL=3

for i in $(seq 1 $MAX_RETRIES); do
    STATUS=$($COMPOSE_CMD ps postgres --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | grep -o '[^"]*$' || echo "unknown")
    
    if [[ "$STATUS" == "healthy" ]]; then
        success "PostgreSQL is healthy!"
        break
    fi

    if [ "$i" -eq "$MAX_RETRIES" ]; then
        error "PostgreSQL did not become healthy in time. Check logs: $COMPOSE_CMD logs postgres"
    fi

    info "[$i/$MAX_RETRIES] Postgres status: ${STATUS}. Retrying in ${RETRY_INTERVAL}s..."
    sleep $RETRY_INTERVAL
done

# ─── 9. Final Status Summary ──────────────────────────────────────────────────
header "Setup Complete"

echo ""
echo -e "${BOLD}Service Status:${RESET}"
$COMPOSE_CMD ps

echo ""
echo -e "${GREEN}${BOLD}✅ Epic Club is now running!${RESET}"
echo ""
echo -e "  ${BOLD}Application:${RESET}  https://localhost  (or http://localhost if SSL is redirecting)"
echo -e "  ${BOLD}API Health:${RESET}   https://localhost/health"
echo ""
echo -e "${YELLOW}Useful commands:${RESET}"
echo -e "  View all logs:       ${CYAN}$COMPOSE_CMD logs -f${RESET}"
echo -e "  View backend logs:   ${CYAN}$COMPOSE_CMD logs -f backend${RESET}"
echo -e "  Stop all services:   ${CYAN}$COMPOSE_CMD down${RESET}"
echo -e "  Rebuild & restart:   ${CYAN}$COMPOSE_CMD up -d --build${RESET}"
echo ""
echo -e "${YELLOW}⚠️  Before production deployment:${RESET}"
echo -e "  1. Set GOOGLE_CLIENT_ID in .env"
echo -e "  2. Set your real domain in APP_URL and CORS_ALLOWED_ORIGINS"
echo -e "  3. Replace nginx/ssl/ certs with real Let's Encrypt certificates"
echo ""
