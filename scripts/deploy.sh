#!/bin/bash

# Frontend Deployment Script
# This script builds and deploys the frontend to Google Cloud Storage

set -e  # Exit on any error

# Configuration
PROJECT_ID="1030652029012"
REGION="us-central1"
STAGING_BUCKET="gs://reactagent-frontend-staging-1755407769"
PRODUCTION_BUCKET="gs://reactagent-frontend-prod-1755407790"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Frontend Deployment Script${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed. Please install it first.${NC}"
    echo ""
    echo "Press Enter to continue..."
    read
    exit 1
fi

# Check if we're authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}You are not authenticated with gcloud. Please run:${NC}"
    echo "gcloud auth login"
    echo ""
    echo "Press Enter to continue..."
    read
    exit 1
fi

# Set the project
echo -e "${BLUE}Setting project to: ${PROJECT_ID}${NC}"
gcloud config set project $PROJECT_ID

# Function to deploy to a specific environment
deploy_to_environment() {
    local environment=$1
    local bucket=$2
    
    echo -e "${BLUE}Deploying to ${environment}...${NC}"
    echo -e "Bucket: ${bucket}"
    echo ""
    
    # Install dependencies
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm ci
    
    # Build the project
    echo -e "${YELLOW}Building for ${environment}...${NC}"
    npm run build -- --mode=${environment}
    
    # Deploy to Cloud Storage
    echo -e "${YELLOW}Deploying to Cloud Storage...${NC}"
    gsutil -m rsync -r -d dist $bucket
    
    # Set cache headers for assets
    echo -e "${YELLOW}Setting cache headers...${NC}"
    gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" "${bucket}/assets/**"
    gsutil -m setmeta -h "Cache-Control:no-cache" "${bucket}/index.html"
    
    echo -e "${GREEN}✅ Successfully deployed to ${environment}!${NC}"
    echo ""
}

# Main deployment logic
if [ "$1" = "staging" ]; then
    deploy_to_environment "staging" $STAGING_BUCKET
    echo -e "${GREEN}Frontend deployed to staging!${NC}"
    echo -e "URL: https://storage.googleapis.com/reactagent-frontend-staging-1755407769/index.html"
    
elif [ "$1" = "production" ]; then
    echo -e "${YELLOW}Are you sure you want to deploy to production? (y/N)${NC}"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        deploy_to_environment "production" $PRODUCTION_BUCKET
        echo -e "${GREEN}Frontend deployed to production!${NC}"
        echo -e "URL: https://storage.googleapis.com/reactagent-frontend-prod-1755407790/index.html"
    else
        echo -e "${YELLOW}Deployment cancelled.${NC}"
        echo ""
        echo "Press Enter to continue..."
        read
        exit 0
    fi
    
else
    echo -e "${RED}Usage: $0 {staging|production}${NC}"
    echo ""
    echo "Examples:"
    echo "  $0 staging    - Deploy to staging environment"
    echo "  $0 production - Deploy to production environment"
    echo ""
    echo "Press Enter to continue..."
    read
    exit 1
fi

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo "Press Enter to continue..."
read
