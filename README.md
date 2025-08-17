# React Agent Frontend

A modern React TypeScript frontend for the AI Assistant application, built with Vite and Tailwind CSS.

## Quick Start

```bash
# Setup the project
./scripts/setup.sh

# Start development server
./scripts/test-frontend.sh

# Test build process
./scripts/test-deploy.sh

# Deploy to staging
./scripts/deploy.sh staging
```

## Project Structure

```
reactagent-frontend/
├── scripts/          # Shell scripts for development and deployment
│   ├── setup.sh      # Initial project setup
│   ├── test-frontend.sh  # Start development server
│   ├── test-deploy.sh    # Test build process
│   ├── deploy.sh         # Deploy to staging/production
│   └── debug.sh          # Debug environment issues
├── docs/            # Documentation
│   ├── README.md    # Detailed project documentation
│   └── SCRIPTS.md   # Script usage guide
├── config/          # TypeScript and ESLint configuration
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   └── eslint.config.js
├── src/             # Source code
├── public/          # Public assets
├── dist/            # Build output (generated)
├── vite.config.ts   # Vite configuration
├── tailwind.config.js # Tailwind CSS configuration
├── postcss.config.js # PostCSS configuration
├── tsconfig.json    # Main TypeScript configuration
├── cloudbuild.yaml  # Cloud Build configuration
├── package.json     # Project dependencies
└── README.md        # Quick start guide
```

## Available Scripts

- **`./scripts/setup.sh`** - Initial project setup
- **`./scripts/test-frontend.sh`** - Start development server
- **`./scripts/test-deploy.sh`** - Test build process
- **`./scripts/deploy.sh staging`** - Deploy to staging
- **`./scripts/deploy.sh production`** - Deploy to production
- **`./scripts/debug.sh`** - Debug environment issues

## Documentation

- **`docs/README.md`** - Detailed project documentation
- **`docs/SCRIPTS.md`** - Complete script usage guide

## Development

This project uses:
- **React 19** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Google Cloud Storage** for deployment

## Deployment

The frontend is deployed to Google Cloud Storage with separate staging and production environments:

- **Staging**: `https://storage.googleapis.com/reactagent-frontend-staging-1755407769/index.html`
- **Production**: `https://storage.googleapis.com/reactagent-frontend-prod-1755407790/index.html`

For detailed information, see `docs/SCRIPTS.md`.
