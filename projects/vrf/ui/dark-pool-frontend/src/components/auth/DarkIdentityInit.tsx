import React, { useState, useEffect } from 'react';
import { KeyIcon, ShieldCheckIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useWallet } from '../../hooks/useWallet.js';
import { EncryptionUtils } from '../../utils/index.js';
import { cn } from '../../utils/cn.js';

interface DarkIdentityInitProps {
  onIdentityCreated?: (identity: { anonymousId: string; publicKey: string }) => void;
  onAuth?: (identity: { anonymousId: string; publicKey: string }) => void;
  className?: string;
}

export const DarkIdentityInit: React.FC<DarkIdentityInitProps> = ({
  onIdentityCreated,
  onAuth,
  className = ''
}) => {
  const { wallet, signMessage } = useWallet();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [identity, setIdentity] = useState<{ anonymousId: string; publicKey: string } | null>(null);

  const steps = [
    { icon: KeyIcon, label: 'Generate Keys' },
    { icon: ShieldCheckIcon, label: 'Sign Message' },
    { icon: SparklesIcon, label: 'Create Identity' }
  ];

  useEffect(() => {
    if (wallet && !identity) {
      generateIdentity();
    }
  }, [wallet]);

  const generateIdentity = async () => {
    if (!wallet) return;

    setIsGenerating(true);
    setCurrentStep(0);

    try {
      // Step 1: Generate keys
      setCurrentStep(0);
      await new Promise(resolve => setTimeout(resolve, 1500));

      const privateKey = EncryptionUtils.generateSecureRandom(32);
      const publicKey = EncryptionUtils.hash(privateKey);

      // Step 2: Sign authentication message
      setCurrentStep(1);
      const message = `Create anonymous identity for ${wallet.address}`;
      const signature = await signMessage(message);
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 3: Create anonymous identity
      setCurrentStep(2);
      const anonymousId = EncryptionUtils.hash(wallet.address + signature + publicKey);
      await new Promise(resolve => setTimeout(resolve, 1500));

      const newIdentity = { anonymousId, publicKey };
      setIdentity(newIdentity);

      // Store encrypted identity data
      EncryptionUtils.encryptAndStore('identity', newIdentity);

      onIdentityCreated?.(newIdentity);
      onAuth?.(newIdentity);

    } catch (error: any) {
      console.error('Failed to generate identity:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderStep = (index: number) => {
    const StepIcon = steps[index].icon;
    const isActive = currentStep === index && isGenerating;
    const isCompleted = index < currentStep || (identity && !isGenerating);

    return (
      <div
        key={index}
        className={cn(
          'flex items-center space-x-3 p-3 rounded-lg transition-all',
          isActive && 'bg-blue-900/50 border border-blue-500',
          isCompleted && 'bg-green-900/50 border border-green-500',
          !isActive && !isCompleted && 'bg-gray-800 border border-gray-700'
        )}
      >
        <div className="relative">
          <StepIcon
            className={cn(
              'h-6 w-6',
              isActive && 'text-blue-400 animate-pulse',
              isCompleted && 'text-green-400',
              !isActive && !isCompleted && 'text-gray-500'
            )}
          />
          {isCompleted && (
            <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-400 rounded-full" />
          )}
        </div>
        <div>
          <div className={cn(
            'font-medium',
            isActive && 'text-blue-300',
            isCompleted && 'text-green-300',
            !isActive && !isCompleted && 'text-gray-400'
          )}>
            {steps[index].label}
          </div>
          {isActive && (
            <div className="text-xs text-gray-400 mt-1">
              Processing...
            </div>
          )}
          {isCompleted && (
            <div className="text-xs text-green-400 mt-1">
              Complete
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!wallet) {
    return (
      <div className={cn('bg-gray-900 rounded-xl p-6', className)}>
        <div className="text-center">
          <ShieldCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-200 mb-2">
            Connect Your Wallet
          </h3>
          <p className="text-gray-400 text-sm">
            Connect your wallet to create an anonymous trading identity
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-gray-900 rounded-xl p-6', className)}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-2">
          Dark Identity Initialization
        </h3>
        <p className="text-gray-400 text-sm">
          Creating your anonymous trading identity with zero-knowledge privacy
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {steps.map((_, index) => renderStep(index))}
      </div>

      {identity && (
        <div className="mt-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <ShieldCheckIcon className="h-5 w-5 text-green-400" />
            <span className="text-green-400 font-medium">Identity Created</span>
          </div>
          <div className="text-sm text-gray-400 space-y-1">
            <div>
              Anonymous ID: <span className="font-mono text-xs">{identity.anonymousId.slice(0, 10)}...</span>
            </div>
            <div>
              Public Key: <span className="font-mono text-xs">{identity.publicKey.slice(0, 10)}...</span>
            </div>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="mt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
          <div className="text-center text-sm text-gray-400 mt-3">
            Securing your identity...
          </div>
        </div>
      )}
    </div>
  );
};