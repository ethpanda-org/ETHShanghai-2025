Write-Host "Web Wallet Startup Script" -ForegroundColor Cyan
Write-Host "Starting script execution..."

# Check if Node.js is installed
Write-Host "Checking for Node.js installation..."
try {
    $nodeVersion = node -v
    Write-Host "Node.js version: $nodeVersion"
} catch {
    Write-Host "Error: Node.js is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Please install Node.js version 14 or higher before running this script."
    Write-Host "You can download it from https://nodejs.org/"
    pause
    exit 1
}

# Check if npm is installed
Write-Host "Checking for npm installation..."
try {
    $npmVersion = npm -v
    Write-Host "npm version: $npmVersion"
} catch {
    Write-Host "Error: npm is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "npm usually comes with Node.js installation. Please ensure your Node.js installation is complete."
    pause
    exit 1
}

# Install dependencies
Write-Host ""  
Write-Host "Installing dependencies..."
Write-Host "Running: npm install"
Write-Host "Please wait, this might take a few minutes..."

try {
    npm install
    Write-Host ""  
    Write-Host "Dependencies installed successfully!" -ForegroundColor Green
    
    # Start development server
    Write-Host ""  
    Write-Host "Starting development server..."
    Write-Host "Running: npm run dev"
    npm run dev
} catch {
    Write-Host ""  
    Write-Host "Failed to install dependencies or start server!" -ForegroundColor Red
    Write-Host "Please check your network connection or npm configuration and try again."
    pause
    exit 1
}