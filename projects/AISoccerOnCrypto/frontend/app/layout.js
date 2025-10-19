'use client'

import { useEffect, useState } from 'react';
import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import { WagmiConfig } from 'wagmi'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider, configureChains } from 'wagmi';
import { config } from "./wagmiConfig";
import Header from './components/header/header'
import Header_mobile from './components/header/mobile/header'
import '@rainbow-me/rainbowkit/styles.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import './globals.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Box } from '@chakra-ui/react'

const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: 'var(--background)',
        color: 'var(--foreground)',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: '12px',
      },
      variants: {
        solid: {
          bg: 'var(--primary)',
          color: 'var(--foreground)',
          _hover: {
            bg: 'var(--secondary)',
          },
        },
      },
    },
    Modal: {
      baseStyle: {
        dialog: {
          bg: 'gray.50',
        },
      },
    },
  },
})

const queryClient = new QueryClient()
export default function RootLayout({ children }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 800);
    };

    // Initial check
    checkMobile();

    // Add resize listener
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <WagmiProvider config={config}> 
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider locale="en-US" coolMode
                    // showRecentTransactions={true}
                    theme={darkTheme({
                    accentColor: '#555555',
                    accentColorForeground: 'white',
                    })}>
                    <ChakraProvider theme={theme}>
                        <div className="tech-background"></div>
                        {
                          isMobile ? <Header_mobile /> : <Header />
                        }
                        <Box pt="80px">
                            {children}
                        </Box>
                    </ChakraProvider>
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  )
}
