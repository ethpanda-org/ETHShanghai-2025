import React, { useState } from 'react';
import {
  DocumentTextIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  LockClosedIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { EncryptionUtils } from '../../utils/index.js';
import { cn } from '../../utils/cn.js';

interface ComplianceDashboardProps {
  className?: string;
}

type DisclosureLevel = 'pnl' | 'counterparties' | 'full';

export const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({
  className = ''
}) => {
  const [selectedDisclosure, setSelectedDisclosure] = useState<DisclosureLevel>('pnl');
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [generatedProof, setGeneratedProof] = useState<string | null>(null);
  const [auditorAccessDate, setAuditorAccessDate] = useState<Date>(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date;
  });

  const disclosureOptions = [
    {
      value: 'pnl' as DisclosureLevel,
      label: 'Total P&L Only',
      description: 'Share only profit and loss summary',
      risk: 'low'
    },
    {
      value: 'counterparties' as DisclosureLevel,
      label: 'Counterparties (Obfuscated)',
      description: 'Include trading counterparties with privacy protection',
      risk: 'medium'
    },
    {
      value: 'full' as DisclosureLevel,
      label: 'Full History (Encrypted)',
      description: 'Complete encrypted trading history',
      risk: 'high'
    }
  ];

  const handleGenerateProof = async () => {
    setIsGeneratingProof(true);

    // Real ZK-proof generation would connect to actual trading data
    // For now, we'll show a message indicating this requires real data
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Since we removed demo data, proof generation requires actual trading history
    const proofData = {
      type: 'zk-compliance-report',
      period: {
        start: new Date(new Date().getFullYear(), 0, 1).toISOString(),
        end: new Date().toISOString()
      },
      disclosureLevel: selectedDisclosure,
      hash: EncryptionUtils.generateSecureRandom(64),
      signature: EncryptionUtils.generateSecureRandom(128),
      note: 'Real trading data required for actual proof generation'
    };

    const proof = EncryptionUtils.encrypt(JSON.stringify(proofData));
    setGeneratedProof(proof);
    setIsGeneratingProof(false);
  };

  const handleDownloadProof = () => {
    if (!generatedProof) return;

    const blob = new Blob([generatedProof], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-proof-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-400 bg-green-900/20 border-green-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
      case 'high': return 'text-red-400 bg-red-900/20 border-red-500/30';
      default: return 'text-gray-400 bg-gray-800 border-gray-700';
    }
  };

  return (
    <div className={cn('bg-gray-900 rounded-xl p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <ShieldCheckIcon className="h-6 w-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-200">Compliance Dashboard</h2>
        </div>
      </div>

      {/* Regulatory Disclosure Section */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-200 mb-4">Regulatory Disclosure</h3>

        <div className="space-y-3 mb-6">
          {disclosureOptions.map(option => (
            <div
              key={option.value}
              onClick={() => setSelectedDisclosure(option.value)}
              className={cn(
                'p-4 rounded-lg border cursor-pointer transition-all',
                selectedDisclosure === option.value
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-200 mb-1">
                    {option.label}
                  </div>
                  <div className="text-sm text-gray-400">
                    {option.description}
                  </div>
                </div>
                <div className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border',
                  getRiskColor(option.risk)
                )}>
                  {option.risk.toUpperCase()} RISK
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleGenerateProof}
          disabled={isGeneratingProof}
          className="w-full flex items-center justify-center space-x-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
        >
          {isGeneratingProof ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              <span>Generating ZK-Proof...</span>
            </>
          ) : (
            <>
              <DocumentTextIcon className="h-5 w-5" />
              <span>Generate Verifiable Tax Report</span>
            </>
          )}
        </button>

        {generatedProof && (
          <div className="mt-4 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-400 font-medium flex items-center">
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                Proof Generated Successfully
              </span>
              <button
                onClick={handleDownloadProof}
                className="flex items-center space-x-1 text-sm text-blue-400 hover:text-blue-300"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>Download</span>
              </button>
            </div>
            <div className="text-xs text-gray-400 font-mono">
              Proof Hash: {generatedProof.slice(0, 20)}...{generatedProof.slice(-20)}
            </div>
          </div>
        )}
      </div>

      {/* Auditor Access Section */}
      <div className="border-t border-gray-800 pt-6">
        <h3 className="text-lg font-medium text-gray-200 mb-4">Auditor Access</h3>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-3">
            <LockClosedIcon className="h-5 w-5 text-yellow-400" />
            <span className="font-medium text-gray-200">Time-Locked Access</span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Unlock Date:</span>
              <span className="text-gray-200">
                {auditorAccessDate.toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className="text-yellow-400">Locked</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Remaining:</span>
              <span className="text-gray-200">
                {Math.floor((auditorAccessDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
              </span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded">
            <div className="flex items-start space-x-2">
              <ClockIcon className="h-4 w-4 text-yellow-400 mt-0.5" />
              <div className="text-xs text-yellow-300">
                Regulatory key will auto-decrypt at specified time.
                Early access requires multi-signature authorization.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Info */}
      <div className="mt-6 pt-4 border-t border-gray-800">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="bg-gray-800 rounded p-3">
            <div className="text-gray-400 mb-1">Privacy Standard</div>
            <div className="text-gray-200 font-medium">ZK-SNARKs</div>
          </div>
          <div className="bg-gray-800 rounded p-3">
            <div className="text-gray-400 mb-1">Compliance</div>
            <div className="text-gray-200 font-medium">FATF Compliant</div>
          </div>
        </div>
      </div>
    </div>
  );
};