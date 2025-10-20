import { useState, useCallback, useEffect } from 'react';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import AppEth from '@ledgerhq/hw-app-eth';

interface HardwareWalletState {
  isConnected: boolean;
  device: any | null;
  error: string | null;
  isConnecting: boolean;
}

export const useHardwareWallet = () => {
  const [state, setState] = useState<HardwareWalletState>({
    isConnected: false,
    device: null,
    error: null,
    isConnecting: false
  });

  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Check if WebHID is supported
      if (!navigator.hid) {
        throw new Error('WebHID is not supported in this browser. Please use Chrome or Edge.');
      }

      // Connect to Ledger device
      const transport = await TransportWebHID.create();
      const appEth = new AppEth(transport);

      // Get device info
      const { version } = await appEth.getVersion();

      setState({
        isConnected: true,
        device: { transport, app: appEth, version },
        error: null,
        isConnecting: false
      });

      return { transport, app: appEth, version };

    } catch (error: any) {
      setState({
        isConnected: false,
        device: null,
        error: error.message || 'Failed to connect to hardware wallet',
        isConnecting: false
      });
      throw error;
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (state.device?.transport) {
      await state.device.transport.close();
    }

    setState({
      isConnected: false,
      device: null,
      error: null,
      isConnecting: false
    });
  }, [state.device]);

  const getAddress = useCallback(async (path: string = "44'/60'/0'/0/0", display: boolean = false) => {
    if (!state.device?.app) {
      throw new Error('Hardware wallet not connected');
    }

    try {
      const result = await state.device.app.getAddress(path, display);
      return result;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get address');
    }
  }, [state.device]);

  const signTransaction = useCallback(async (path: string, rawTx: string) => {
    if (!state.device?.app) {
      throw new Error('Hardware wallet not connected');
    }

    try {
      const signature = await state.device.app.signTransaction(path, rawTx);
      return signature;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign transaction');
    }
  }, [state.device]);

  const signMessage = useCallback(async (path: string, message: string) => {
    if (!state.device?.app) {
      throw new Error('Hardware wallet not connected');
    }

    try {
      const signature = await state.device.app.signPersonalMessage(path, message);
      return signature;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign message');
    }
  }, [state.device]);

  // Auto-disconnect on unmount
  useEffect(() => {
    return () => {
      if (state.device?.transport) {
        state.device.transport.close();
      }
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    getAddress,
    signTransaction,
    signMessage
  };
};