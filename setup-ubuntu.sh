#!/bin/bash

#############################################################################
# NetPulse NMS - Ubuntu Setup Script
# Run this script on your Ubuntu VM to set up the application
#############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo -e "\n${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}! $1${NC}"
}

print_info() {
    echo -e "${BLUE}→ $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root (no sudo)"
    exit 1
fi

print_header "NetPulse NMS - Ubuntu Setup"

# Step 1: Check Docker installation
print_info "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed!"
    print_info "Please install Docker first. Visit: https://docs.docker.com/engine/install/ubuntu/"
    exit 1
else
    print_success "Docker is installed ($(docker --version))"
fi

# Check Docker Compose
print_info "Checking Docker Compose..."
if ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed!"
    print_info "Please install Docker Compose plugin"
    exit 1
else
    print_success "Docker Compose is installed ($(docker compose version))"
fi

# Check if user can run docker without sudo
print_info "Checking Docker permissions..."
if ! docker ps &> /dev/null; then
    print_warning "Cannot run Docker without sudo"
    print_info "Adding user to docker group..."
    sudo usermod -aG docker $USER
    print_warning "Please logout and login again, then re-run this script"
    exit 0
else
    print_success "Docker permissions OK"
fi

# Step 2: Check for .env file
print_info "Checking environment configuration..."
if [ ! -f "server/.env" ]; then
    print_warning ".env file not found. Creating from example..."
    cp server/.env.example server/.env
    print_success "Created server/.env from example"
    print_warning "IMPORTANT: Edit server/.env and change:"
    print_warning "  - JWT_SECRET (use a strong random string)"
    print_warning "  - ADMIN_PASSWORD (use a strong password)"
    echo ""
    read -p "Press Enter to continue after editing .env file..."
else
    print_success ".env file exists"
fi

# Step 3: Check for required Docker images
print_info "Checking Docker images..."
REQUIRED_IMAGES=("postgres:16-alpine" "node:20-alpine" "nginx:alpine")
MISSING_IMAGES=()

for image in "${REQUIRED_IMAGES[@]}"; do
    if ! docker image inspect "$image" &> /dev/null; then
        print_warning "Image not found: $image"
        MISSING_IMAGES+=("$image")
    else
        print_success "Image found: $image"
    fi
done

if [ ${#MISSING_IMAGES[@]} -gt 0 ]; then
    print_warning "Some Docker images are missing"
    print_info "You need to either:"
    print_info "  1. Load images from tar files (if offline):"
    print_info "     docker load -i postgres-16-alpine.tar"
    print_info "     docker load -i node-20-alpine.tar"
    print_info "     docker load -i nginx-alpine.tar"
    print_info "  2. Pull images (if online):"
    print_info "     docker pull postgres:16-alpine"
    print_info "     docker pull node:20-alpine"
    print_info "     docker pull nginx:alpine"
    echo ""
    read -p "Have you loaded/pulled the images? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Please load Docker images first"
        exit 1
    fi
fi

# Step 4: Build application images
print_header "Building Application Images"
print_info "This may take 3-5 minutes..."

if docker compose build; then
    print_success "Application images built successfully"
else
    print_error "Failed to build images"
    exit 1
fi

# Step 5: Start services
print_header "Starting Services"

print_info "Starting Docker Compose services..."
if docker compose up -d; then
    print_success "Services started"
else
    print_error "Failed to start services"
    exit 1
fi

# Step 6: Wait for services to be healthy
print_info "Waiting for services to be healthy (this may take 30-60 seconds)..."
sleep 10

# Check postgres
print_info "Checking PostgreSQL..."
for i in {1..30}; do
    if docker compose exec -T postgres pg_isready -U nms -d nms &> /dev/null; then
        print_success "PostgreSQL is ready"
        break
    fi
    sleep 2
    if [ $i -eq 30 ]; then
        print_error "PostgreSQL failed to start"
        docker compose logs postgres
        exit 1
    fi
done

# Check API
print_info "Checking API..."
sleep 5
for i in {1..30}; do
    if curl -s http://localhost:4000/api/health &> /dev/null; then
        print_success "API is ready"
        break
    fi
    sleep 2
    if [ $i -eq 30 ]; then
        print_error "API failed to start"
        docker compose logs api
        exit 1
    fi
done

# Check Frontend
print_info "Checking Frontend..."
for i in {1..20}; do
    if curl -s http://localhost/ &> /dev/null; then
        print_success "Frontend is ready"
        break
    fi
    sleep 2
    if [ $i -eq 20 ]; then
        print_error "Frontend failed to start"
        docker compose logs nginx
        exit 1
    fi
done

# Step 7: Display status
print_header "Setup Complete!"

print_success "NetPulse NMS is running!"
echo ""
print_info "Access the application:"
echo -e "  ${GREEN}http://localhost${NC}"
echo ""
print_info "Default login credentials:"
echo -e "  Username: ${GREEN}admin${NC}"
echo -e "  Password: ${GREEN}(check your server/.env file)${NC}"
echo ""
print_info "Useful commands:"
echo "  View logs:        docker compose logs -f"
echo "  Stop services:    docker compose down"
echo "  Restart services: docker compose restart"
echo "  View status:      docker compose ps"
echo ""
print_info "Next steps:"
echo "  1. Open http://localhost in your browser"
echo "  2. Login with admin credentials"
echo "  3. Go to Devices page"
echo "  4. Upload your device CSV file"
echo "  5. Wait 30 seconds for monitoring to start"
echo "  6. Check Dashboard for real-time metrics!"
echo ""
print_success "Setup completed successfully! 🚀"
