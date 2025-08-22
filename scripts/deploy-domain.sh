#!/bin/bash

# Domain Deployment Script for agentagentai.com
# This script deploys updates to the domain-specific bucket

set -e  # Exit on any error

# Configuration
PROJECT_ID="1030652029012"
DOMAIN_BUCKET="www.agentagentai.com"
BUCKET_URL="gs://${DOMAIN_BUCKET}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Domain Deployment Script for agentagentai.com${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if we're authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}You are not authenticated with gcloud. Please run:${NC}"
    echo "gcloud auth login"
    exit 1
fi

# Set the project
echo -e "${BLUE}Setting project to: ${PROJECT_ID}${NC}"
gcloud config set project $PROJECT_ID

# Check if bucket exists
if ! gsutil ls $BUCKET_URL >/dev/null 2>&1; then
    echo -e "${RED}Error: Bucket ${DOMAIN_BUCKET} does not exist.${NC}"
    echo "Please run the setup script first: ./scripts/setup-domain-bucket.sh"
    exit 1
fi

echo -e "${BLUE}Deploying to domain bucket: ${DOMAIN_BUCKET}${NC}"
echo ""

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
call npm ci

# Build the project
echo -e "${YELLOW}Building for production...${NC}"
call npm run build -- --mode=production

# Deploy to Cloud Storage
echo -e "${YELLOW}Deploying to Cloud Storage...${NC}"
call gsutil -m rsync -r -d dist $BUCKET_URL

# Set cache headers for assets
echo -e "${YELLOW}Setting cache headers...${NC}"
call gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" "${BUCKET_URL}/assets/**"
call gsutil -m setmeta -h "Cache-Control:no-cache" "${BUCKET_URL}/index.html"

echo ""
echo -e "${GREEN}✅ Successfully deployed to domain bucket!${NC}"
echo ""
echo -e "${BLUE}🔗 URLs:${NC}"
echo "Direct GCS URL: https://storage.googleapis.com/${DOMAIN_BUCKET}/index.html"
echo "Domain URL: https://www.agentagentai.com"
echo ""
echo -e "${YELLOW}Note: Changes may take a few minutes to propagate.${NC}"
echo ""
