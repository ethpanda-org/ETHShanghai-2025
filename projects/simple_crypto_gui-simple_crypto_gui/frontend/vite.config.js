import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import fs from 'fs'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'; // Import plugin

// Define function to get page chunk configuration
const getPageChunks = () => {

  // 'wallet-page': ['src/pages/WalletPage.jsx'],
  // 'welcome-page': ['src/pages/WelcomePage.jsx'],
  // 'settings-page': ['src/pages/SettingsPage.jsx'],
  // 'unlock-wallet-page': ['src/pages/UnlockWalletPage.jsx'],
  // 'browser-not-supported-page': ['src/pages/BrowserNotSupportedPage.jsx']

  const pageDir = path.resolve(__dirname, 'src/pages');
  const pageChunks = {};
  
  // Read all files in the pages directory
  const files = fs.readdirSync(pageDir);
  
  // Iterate through all files, filter out .jsx files and exclude css directory
  files.forEach(file => {
    // Check if it's a .jsx file and not a directory
    const isJsxFile = file.endsWith('.jsx');
    const isDirectory = fs.statSync(path.join(pageDir, file)).isDirectory();
    
    if (isJsxFile && !isDirectory) {
      // Convert camelCase to kebab-case for chunk name
      // Example: WalletPage.jsx -> wallet-page
      const chunkName = file
        .replace('.jsx', '')
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .toLowerCase();
      
      // Add to chunk configuration
      pageChunks[chunkName] = [`src/pages/${file}`];
    }
  });
  
  return pageChunks;
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
    visualizer({
      open: true, // Automatically open report after packaging
      gzipSize: true, // Show size after gzip compression
      brotliSize: true, // Show size after brotli compression
      filename: 'stats.html' // Report file name (default in dist directory)
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'viem': ['viem'],
          'antd': ['antd'],
          'crypto': ['@scure/btc-signer', '@scure/base', '@scure/bip39', 'crypto-js'],
          'react': ['react', 'react-dom', 'react-router-dom'],
          'qr': ['react-qr-barcode-scanner', 'qrcode.react'],
          // Package each page separately for individual preloading
          ...getPageChunks()
        },
        // Configure output file name format
        entryFileNames: '[name].[hash].js',
        chunkFileNames: '[name].[hash].js',
        assetFileNames: '[name].[hash].[ext]'
      },
      // Configure module resolution options
      plugins: [
        // Custom plugin for preloading
        {
          name: 'preload-individual-pages',
          generateBundle(options, bundle) {
            console.log('Starting to preload page components...');
            
            // Get entry files
            const entryChunks = Object.values(bundle).filter(
              chunk => chunk.type === 'chunk' && chunk.isEntry
            );
            
            console.log('Number of entry files found:', entryChunks.length);
            
            // Define page chunk names that need preloading, get from getPageChunks function
            const pageChunkNames = Object.keys(getPageChunks());
            console.log('Page chunks to preload:', pageChunkNames);
            
            // Find all page chunks
            const pageChunks = {};
            Object.keys(bundle).forEach(bundleKey => {
              const chunkItem = bundle[bundleKey];
              if (chunkItem.type === 'chunk' && pageChunkNames.includes(chunkItem.name)) {
                pageChunks[bundleKey] = chunkItem;
              }
            });
            
            console.log('Number of page chunks found:', Object.keys(pageChunks).length);
            // console.log('Detailed page chunks found:', pageChunks);
            
            entryChunks.forEach(chunk => {
              console.log('Processing entry file:', chunk.fileName);
              console.log('Entry file original import list:', chunk.imports);
              
              // Add preloading for all page chunks to the entry file
              if (!chunk.imports) chunk.imports = [];
              if (!chunk.importedBindings) chunk.importedBindings = {};
              
              // Add each page chunk to the import list
              let addedCount = 0;
              Object.entries(pageChunks).forEach(([bundleKey, chunkItem]) => {
                if (!chunk.imports.includes(bundleKey)) {
                  chunk.imports.push(bundleKey);
                  chunk.importedBindings[bundleKey] = [];
                  console.log('Adding preload:', bundleKey, 'type:', chunkItem.name);
                  addedCount++;
                } else {
                  console.log('Preload already exists:', bundleKey);
                }
              });
              
              console.log('Added', addedCount, 'preload links to entry file');
              console.log('Updated import list for entry file:', chunk.imports);
            });
          }
        }
      ]
    }
  }
})
