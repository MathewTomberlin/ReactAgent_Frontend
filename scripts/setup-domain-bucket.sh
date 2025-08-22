#!/bin/bash

# Domain Bucket Setup Script for agentagentai.com
# This script creates a new GCS bucket with the exact domain name for Cloudflare CNAME

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

echo -e "${BLUE}🌐 Domain Bucket Setup Script for agentagentai.com${NC}"
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

echo -e "${BLUE}Creating bucket: ${DOMAIN_BUCKET}${NC}"
echo ""

# Create the bucket with the exact domain name
echo -e "${YELLOW}Step 1: Creating GCS bucket with domain name...${NC}"
gsutil mb -p $PROJECT_ID -c STANDARD -l US $BUCKET_URL

# Enable uniform bucket-level access
echo -e "${YELLOW}Step 2: Enabling uniform bucket-level access...${NC}"
gsutil uniformbucketlevelaccess set on $BUCKET_URL

# Make the bucket public by granting allUsers Storage Object Viewer permission
echo -e "${YELLOW}Step 3: Making bucket public (allUsers: Storage Object Viewer)...${NC}"
gsutil iam ch allUsers:objectViewer $BUCKET_URL

# Set the main page suffix to index.html
echo -e "${YELLOW}Step 4: Setting main page suffix to index.html...${NC}"
gsutil web set -m index.html $BUCKET_URL

# Set CORS policy for web access
echo -e "${YELLOW}Step 5: Setting CORS policy...${NC}"
cat > cors.json << EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF
gsutil cors set cors.json $BUCKET_URL
rm cors.json

# Build and upload the React app
echo -e "${YELLOW}Step 6: Building and uploading React app...${NC}"
npm ci
npm run build -- --mode=production

# Upload the build to the bucket
echo -e "${YELLOW}Step 7: Uploading build files to bucket...${NC}"
gsutil -m rsync -r -d dist $BUCKET_URL

# Set cache headers for assets
echo -e "${YELLOW}Step 8: Setting cache headers...${NC}"
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" "${BUCKET_URL}/assets/**"
gsutil -m setmeta -h "Cache-Control:no-cache" "${BUCKET_URL}/index.html"

echo ""
echo -e "${GREEN}✅ Domain bucket setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps for Cloudflare Configuration:${NC}"
echo ""
echo "1. Log into your Cloudflare dashboard"
echo "2. Add your domain: agentagentai.com"
echo "3. Update your domain's nameservers at GoDaddy to point to Cloudflare"
echo "4. In Cloudflare DNS settings, create a CNAME record:"
echo "   - Name: www"
echo "   - Target: c.storage.googleapis.com"
echo "   - Proxy status: Proxied (orange cloud)"
echo "5. In Cloudflare SSL/TLS settings:"
echo "   - Set SSL/TLS mode to 'Full'"
echo "   - Enable 'Always Use HTTPS'"
echo ""
echo -e "${BLUE}🔗 Test URLs:${NC}"
echo "Direct GCS URL: https://storage.googleapis.com/${DOMAIN_BUCKET}/index.html"
echo "Domain URL (after DNS propagation): https://www.agentagentai.com"
echo ""
echo -e "${YELLOW}Note: DNS changes may take up to 48 hours to propagate globally.${NC}"
echo ""
pause
