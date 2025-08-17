# Frontend Scripts

This directory contains scripts for managing the React frontend application.

**Note:** Most scripts will pause at the end with "Press Enter to continue..." so you can read the output before the terminal closes.

## Directory Structure

```
reactagent-frontend/
├── scripts/          # All shell scripts
├── docs/            # Documentation files
├── config/          # Configuration files
├── src/             # Source code
├── public/          # Public assets
├── dist/            # Build output
└── package.json     # Project configuration
```

## Available Scripts

### Development

#### `scripts/setup.sh`
Sets up the frontend development environment.

**Usage:**
```bash
./scripts/setup.sh
```

**What it does:**
- Checks Node.js and npm installation
- Installs dependencies
- Creates `.env.local` file for local development
- Provides next steps and available commands
- **Pauses at the end** so you can read the output

#### `scripts/test-frontend.sh`
Starts the React development server.

**Usage:**
```bash
./scripts/test-frontend.sh
```

**What it does:**
- Checks if dependencies are installed
- Installs dependencies if needed
- Starts the development server
- Shows helpful information about URLs
- **Runs continuously** (no pause - this is a development server)

### Testing

#### `scripts/test-deploy.sh`
Tests the frontend build and deployment process.

**Usage:**
```bash
./scripts/test-deploy.sh
```

**What it does:**
- Tests build process for both staging and production
- Verifies build output contains expected files
- Checks HTML, CSS, and JavaScript files
- Ensures the build is ready for deployment
- **Pauses at the end** so you can read the results

### Deployment

#### `scripts/deploy.sh`
Builds and deploys the frontend to Google Cloud Storage.

**Usage:**
```bash
./scripts/deploy.sh staging     # Deploy to staging environment
./scripts/deploy.sh production  # Deploy to production environment
```

**What it does:**
- Installs dependencies with `npm ci`
- Builds the project for the specified environment
- Deploys to Google Cloud Storage bucket
- Sets appropriate cache headers for assets
- Provides deployment URLs
- **Pauses at the end** so you can read the results

### Debugging

#### `scripts/debug.sh`
Helps diagnose issues with the frontend setup.

**Usage:**
```bash
./scripts/debug.sh
```

**What it does:**
- Checks Node.js and npm versions
- Verifies package.json and dependencies
- Tests npm installation with verbose output
- **Pauses at the end** so you can read the results

## Environment Configuration

### Local Development
The frontend uses a `.env.local` file for local development configuration:

```env
VITE_API_BASE=http://localhost:8080
```

This file is automatically created by `scripts/setup.sh`.

### Build Modes
- **staging**: Uses staging API endpoints
- **production**: Uses production API endpoints

## Deployment URLs

After deployment, the frontend will be available at:

- **Staging**: `https://storage.googleapis.com/reactagent-frontend-staging-1755407769/index.html`
- **Production**: `https://storage.googleapis.com/reactagent-frontend-prod-1755407790/index.html`

## Prerequisites

- Node.js 18+ (recommended)
- npm
- Google Cloud CLI (`gcloud`)
- Authenticated with Google Cloud (`gcloud auth login`)

## Workflow

### First Time Setup
```bash
./scripts/setup.sh
```

### Daily Development
```bash
./scripts/test-frontend.sh
```

### Before Deployment
```bash
./scripts/test-deploy.sh
```

### Deploy to Staging
```bash
./scripts/deploy.sh staging
```

### Deploy to Production
```bash
./scripts/deploy.sh production
```

## Troubleshooting

### Build Issues
If you encounter build issues:
1. Run `./scripts/test-deploy.sh` to identify the problem
2. Check that all dependencies are installed: `npm install`
3. Clear build cache: `rm -rf dist node_modules/.vite`

### Deployment Issues
If deployment fails:
1. Ensure you're authenticated: `gcloud auth login`
2. Check your project: `gcloud config get-value project`
3. Verify bucket permissions: `gsutil ls gs://reactagent-frontend-staging-1755407769`

### CSS Issues
If Tailwind CSS isn't working:
1. Ensure Tailwind CSS v3 is installed: `npm list tailwindcss`
2. Check PostCSS configuration: `cat config/postcss.config.js`
3. Verify Tailwind config: `cat config/tailwind.config.js`

### Script Output Issues
If scripts close too quickly:
- All scripts now pause at the end with "Press Enter to continue..."
- The only exception is `scripts/test-frontend.sh` which runs the development server
- If you need to see output from a running script, you can run it in a terminal that stays open
