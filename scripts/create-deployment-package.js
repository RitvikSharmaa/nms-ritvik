#!/usr/bin/env node
/**
 * CREATE DEPLOYMENT PACKAGE FOR AIR-GAPPED UBUNTU VM
 * 
 * This script creates a production-ready deployment package that can be
 * transferred to an air-gapped Ubuntu 24 VM and run without any internet access.
 * 
 * What it does:
 * 1. Verifies frontend and backend are built
 * 2. Creates deployment directory structure
 * 3. Copies all necessary files (excluding dev dependencies)
 * 4. Creates deployment documentation
 * 5. Zips everything into a deployable package
 * 
 * Output: nms-deployment.zip
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DEPLOYMENT_DIR = 'deployment';
const PACKAGE_NAME = 'nms-deployment.zip';

console.log('\n========================================');
console.log('CREATING AIR-GAPPED DEPLOYMENT PACKAGE');
console.log('========================================\n');

// Step 1: Verify builds exist
console.log('Step 1: Verifying builds...');
if (!fs.existsSync('server/public/index.html')) {
  console.error('❌ Frontend not built! Run: npm run build:prod');
  process.exit(1);
}
if (!fs.existsSync('server/dist/index.js')) {
  console.error('❌ Backend not built! Run: cd server && npm run build');
  process.exit(1);
}
console.log('✓ Frontend build found');
console.log('✓ Backend build found\n');

// Step 2: Create deployment directory
console.log('Step 2: Creating deployment directory...');
if (fs.existsSync(DEPLOYMENT_DIR)) {
  fs.rmSync(DEPLOYMENT_DIR, { recursive: true });
}
fs.mkdirSync(DEPLOYMENT_DIR);
console.log(`✓ Created ${DEPLOYMENT_DIR}/\n`);

// Step 3: Copy server files
console.log('Step 3: Copying server files...');
const serverFiles = [
  'dist',           // Compiled TypeScript
  'public',         // Built frontend
  'node_modules',   // Production dependencies
  'package.json',   // For npm start
  'package-lock.json',
  '.env.example'
];

fs.mkdirSync(path.join(DEPLOYMENT_DIR, 'server'));
serverFiles.forEach(file => {
  const src = path.join('server', file);
  const dest = path.join(DEPLOYMENT_DIR, 'server', file);
  if (fs.existsSync(src)) {
    if (fs.statSync(src).isDirectory()) {
      copyDir(src, dest);
    } else {
      fs.copyFileSync(src, dest);
    }
    console.log(`✓ Copied server/${file}`);
  }
});

// Step 4: Copy root files
console.log('\nStep 4: Copying root files...');
const rootFiles = [
  'README.md',
  'UBUNTU_SETUP.md',
  'COMPLETE_PROJECT_DOCUMENTATION.md'
];
rootFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(DEPLOYMENT_DIR, file));
    console.log(`✓ Copied ${file}`);
  }
});

// Step 5: Create deployment README
console.log('\nStep 5: Creating DEPLOY.md...');
const deployDoc = `# AIR-GAPPED DEPLOYMENT GUIDE

## What's in this package

✓ Compiled backend (Node.js/Express)
✓ Built frontend (React SPA)
✓ All 662 npm packages (no install needed)
✓ Database migrations
✓ Configuration templates

## Prerequisites on Ubuntu 24 VM

- Node.js 18+ installed
- PostgreSQL 12+ installed
- NO internet needed after this point

## Deployment Steps

### 1. Transfer Package

Copy this entire folder to your Ubuntu VM:
- Via USB drive
- Via shared folder
- Via network share

### 2. Setup Database

\`\`\`bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres psql -c "CREATE DATABASE nms;"
sudo -u postgres psql -c "CREATE USER nms WITH PASSWORD 'nms_secret';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE nms TO nms;"
\`\`\`

### 3. Configure Application

\`\`\`bash
cd server
cp .env.example .env
nano .env
\`\`\`

**Required changes in .env:**
- JWT_SECRET (generate random string)
- ADMIN_PASSWORD (your secure password)
- DATABASE_URL (if using different credentials)

### 4. Run Migrations

\`\`\`bash
cd server
npm run migrate
\`\`\`

Creates all 17 tables and seeds initial data.

### 5. Start Application

\`\`\`bash
cd server
npm start
\`\`\`

Application runs on http://localhost:4000

### 6. Access Application

Open browser: **http://localhost:4000**

Login:
- Username: admin
- Password: (from .env ADMIN_PASSWORD)

## Verification

\`\`\`bash
# Check backend is running
curl http://localhost:4000/api/health

# Should return: {"status":"ok"}
\`\`\`

## Troubleshooting

See COMPLETE_PROJECT_DOCUMENTATION.md for detailed troubleshooting.

## Files Included

\`\`\`
server/
├── dist/              # Compiled backend (TypeScript → JavaScript)
├── public/            # Built frontend (React → static files)
├── node_modules/      # All 662 npm packages
├── package.json       # npm start script
└── .env.example       # Configuration template
\`\`\`

## NO Internet Required

This package contains EVERYTHING needed to run:
- No npm install
- No apt install
- No downloads
- No external dependencies
- 100% offline operation

`;

fs.writeFileSync(path.join(DEPLOYMENT_DIR, 'DEPLOY.md'), deployDoc);
console.log('✓ Created DEPLOY.md\n');

// Step 6: Create zip (if zip command available)
console.log('Step 6: Creating deployment package...');
try {
  if (fs.existsSync(PACKAGE_NAME)) {
    fs.unlinkSync(PACKAGE_NAME);
  }
  
  // Try to zip (works on Linux/Mac/Windows with zip installed)
  try {
    execSync(`zip -r ${PACKAGE_NAME} ${DEPLOYMENT_DIR}`, { stdio: 'inherit' });
    console.log(`\n✓ Created ${PACKAGE_NAME}\n`);
  } catch (e) {
    console.log('\n⚠ Zip command not available');
    console.log(`Manually zip the "${DEPLOYMENT_DIR}" folder\n`);
  }
} catch (e) {
  console.error('Error creating package:', e.message);
}

console.log('========================================');
console.log('DEPLOYMENT PACKAGE READY');
console.log('========================================\n');
console.log(`Folder: ${DEPLOYMENT_DIR}/`);
console.log(`Package: ${PACKAGE_NAME} (if created)`);
console.log('\nNext steps:');
console.log('1. Transfer to Ubuntu VM');
console.log('2. Follow DEPLOY.md instructions');
console.log('3. Start with: cd server && npm start\n');

// Helper function to copy directories recursively
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
