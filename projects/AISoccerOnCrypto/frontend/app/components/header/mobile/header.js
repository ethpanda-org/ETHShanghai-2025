'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link'
import Image from 'next/image'
import styles from './page.module.css'
import globalStyles from '../../../globals.css'
import { usePathname } from 'next/navigation';
import { connect, disconnect } from '@wagmi/core'
import { injected } from '@wagmi/connectors'
import { config } from '@/wagmiConfig';
import { useChainId, useAccount } from 'wagmi';
import navItems from '../navItems.json';
import { 
  HStack, 
  Box,
  VStack,
  Divider,
  Button
} from '@chakra-ui/react';

export default function Header() {
  let pathname = usePathname();
  const [openMenu, setOpenMenu] = useState(false)
  const chainId = useChainId({config})
  const { address, connector, isConnected } = useAccount({config});
  // const [logo, setLogo] = useState();

  // useEffect(() => {
  //   Object.keys(chainOptions).forEach(chainName => {
  //     if (chainOptions[chainName].chainId == chainId) {
  //       setLogo(chainOptions[chainName].logo);
  //     }
  //   })
  // }, [])

  const disconnectWallet = async () => {
    await disconnect(config, {
      connector, 
    })
  }

  const connectWallet = async () => {
    const result = await connect(config, { connector: injected() })
    console.log(result)
  }

  const getEllipsisTxt = (str, n = 6) => {
    if (str) {
      return `${str.slice(0, n)}...${str.slice(str.length - n)}`;
    }
    return '';
};

  return (
    <div className={`${styles['section_1']} flex-col align-center`}>
      <div className={`${styles['block_9']}`}>
        <div className={`flex-row align-center`}>
          <Box className={styles.creepsterRegular}>Burn Pump</Box>
        </div >     

        {
          openMenu ? 
            <Image
              className={`${styles['menu_close']}`}
              src={
                require('./menu_close.png')
              }

              onClick={() => setOpenMenu(false)}
            />
            :
            <Image
              className={`${styles['menu_open']}`}
              src={
                require('./menu_open.png')
              }
              onClick={() => setOpenMenu(true)}
            />
        }
      </div>
      {
        openMenu &&
        <div className={`${styles['menu_mobile']} flex-col align-start`}>
          {
            navItems.map(navItem => 
              <VStack className={`align-start`}>
                <Box className={`${styles[pathname.includes(navItem.name) ? ('selected_mobile') : ('mobile')]}`} onClick={() => setOpenMenu(false)}>
                  <Link href={`${navItem.path}`} rel="noopener noreferrer">   
                    {navItem.name}
                  </Link>
                </Box>
                <Divider />
              </VStack>
              
            )
          }

          {
            isConnected ? 
              <VStack>
                <HStack>
                  {/* <Image
                    className={`${styles['image_wallet']}`}
                    src={logo}
                  /> */}
                  <Box className={`${styles['address_btn_text']}`}>{getEllipsisTxt(address)}</Box>
                  <Image
                    className={`${styles['image_wallet']}`}
                    src={
                      require('./exit.png')
                    }

                    onClick={() => disconnectWallet()}
                  />
                </HStack>
              </VStack>              
              :
              <VStack>
                <Button className={`${styles['web3-btn-semi-transparent']}`} onClick={() => connectWallet()}>
                  Connect Wallet
                </Button>
              </VStack>  
          }
        </div>
      }
    </div>
  )
}
