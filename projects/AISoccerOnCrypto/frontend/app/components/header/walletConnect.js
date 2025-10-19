'use client';

import { Button, Tooltip } from '@chakra-ui/react';
import { injected } from '@wagmi/connectors';
import { connect, disconnect, getAccount } from '@wagmi/core';
import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react';
import { getEllipsisTxt } from 'utils/addressFormatter';
import { config } from 'wagmiConfig';

export default function WalletConnect() {
    const [address, setAddress] = useState('')
    const [connector, setConnector] = useState(null);
    const { address: account } = useAccount({config})

    useEffect(() => {
        const result = getAccount(config);
        if (result.isConnected) {
            setAddress(result.address);
            setConnector(result.connector);
        }
    }, [account]);

    const connectWallet = async () => {
        const result = await connect(config, { connector: injected() });
        setAddress(result.accounts[0]);
        setConnector(getAccount(config).connector);
    }

    const disconnectWallet = async () => {
        await disconnect(config, {connector});
        setAddress('');
    }

    return (
        <div>      
            <div style={{fontSize: '15px'}}>
                {
                    address != '' ?
                        <Tooltip label={address}>
                            <Button colorScheme='telegram' variant='outline' onClick={() => disconnectWallet()}>{getEllipsisTxt(address)}</Button>
                        </Tooltip>
                        :
                        <Button colorScheme='telegram' variant='solid' onClick={() => connectWallet()}>Connect Wallet</Button>
                }
                
            </div>
        </div>
    )
}
