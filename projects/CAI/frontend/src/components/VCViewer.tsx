import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export interface VerifiableCredential {
  credentialHash: string;
  issuer: string;
  subject: string;
  issuedAt: number;
  expiresAt: number;
  revoked: boolean;
  credentialType: string;
}

interface VCViewerProps {
  credential: VerifiableCredential;
  isValid: boolean;
}

export function VCViewer({ credential, isValid }: VCViewerProps) {
  const isExpired = Date.now() / 1000 > credential.expiresAt;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {credential.credentialType}
          </h3>
          <p className="mt-1 font-mono text-sm text-gray-500">
            {credential.credentialHash.slice(0, 10)}...
            {credential.credentialHash.slice(-8)}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {isValid && !isExpired && !credential.revoked ? (
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
              <CheckCircle className="mr-1 h-4 w-4" />
              Valid
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
              <XCircle className="mr-1 h-4 w-4" />
              Invalid
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Issuer:</span>
          <span className="font-mono text-gray-900">
            {credential.issuer.slice(0, 6)}...{credential.issuer.slice(-4)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subject:</span>
          <span className="font-mono text-gray-900">
            {credential.subject.slice(0, 6)}...{credential.subject.slice(-4)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Issued:</span>
          <span className="text-gray-900">
            {format(new Date(credential.issuedAt * 1000), 'PPpp')}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Expires:</span>
          <span className={isExpired ? 'text-error' : 'text-gray-900'}>
            <Clock className="mr-1 inline h-4 w-4" />
            {format(new Date(credential.expiresAt * 1000), 'PPpp')}
          </span>
        </div>
      </div>

      {credential.revoked && (
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800">
            ⚠️ This credential has been revoked
          </p>
        </div>
      )}
    </div>
  );
}
