'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

interface PaymentQRCodeProps {
  orderId: string;
  amount: string;
  paymentUrl: string;
  merchantAddress?: string;
}

export default function PaymentQRCode({ orderId, amount, paymentUrl, merchantAddress }: PaymentQRCodeProps) {
  const [qrMode, setQrMode] = useState<'web' | 'solana'>('web');

  // Generate Solana Pay deep link (for future compatibility)
  const solanaPayLink = merchantAddress
    ? `solana:${merchantAddress}?amount=${amount}&label=AetherPay&message=${encodeURIComponent(`Order: ${orderId}`)}&memo=${orderId}`
    : paymentUrl;

  const currentQRData = qrMode === 'web' ? paymentUrl : solanaPayLink;

  const downloadQR = () => {
    const svg = document.getElementById('payment-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `payment-qr-${orderId}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 border-2 border-blue-200">
      <h3 className="text-2xl font-bold text-center mb-6 text-gray-900">
        📱 Scan to Pay
      </h3>

      {/* QR Code Mode Selector */}
      <div className="flex gap-2 mb-6 bg-white rounded-lg p-1">
        <button
          onClick={() => setQrMode('web')}
          className={`flex-1 py-2 px-4 rounded-md font-semibold transition-colors ${
            qrMode === 'web'
              ? 'bg-blue-600 text-white'
              : 'bg-transparent text-gray-600 hover:bg-gray-100'
          }`}
        >
          🌐 Web Link
        </button>
        <button
          onClick={() => setQrMode('solana')}
          className={`flex-1 py-2 px-4 rounded-md font-semibold transition-colors ${
            qrMode === 'solana'
              ? 'bg-purple-600 text-white'
              : 'bg-transparent text-gray-600 hover:bg-gray-100'
          }`}
        >
          ⚡ Solana Pay
        </button>
      </div>

      {/* QR Code Display */}
      <div className="bg-white rounded-xl p-8 mb-6 flex justify-center">
        <QRCodeSVG
          id="payment-qr-code"
          value={currentQRData}
          size={280}
          level="H"
          includeMargin={true}
          imageSettings={{
            src: "/aetherpay-logo.svg", // Add your logo here
            height: 40,
            width: 40,
            excavate: true,
          }}
        />
      </div>

      {/* Order Info */}
      <div className="bg-white rounded-lg p-4 mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Order ID:</span>
          <span className="font-mono font-semibold">{orderId.slice(0, 20)}...</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Amount:</span>
          <span className="font-bold text-blue-600">{amount}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={downloadQR}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          💾 Download QR Code
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(currentQRData)}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 rounded-lg transition-colors"
        >
          📋 Copy Payment Link
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm text-blue-900">
          <div className="font-bold mb-2">📖 How to use:</div>
          {qrMode === 'web' ? (
            <ul className="space-y-1 text-xs text-blue-800">
              <li>✓ Customer scans QR code with phone camera</li>
              <li>✓ Opens payment page in browser</li>
              <li>✓ Connects wallet & completes payment</li>
            </ul>
          ) : (
            <ul className="space-y-1 text-xs text-purple-800 bg-purple-50 rounded p-2">
              <li>✓ Customer scans with Solana wallet app</li>
              <li>✓ Payment details auto-filled</li>
              <li>✓ One-tap to complete transaction</li>
              <li className="text-amber-700 font-semibold">⚠️ Requires Solana Pay compatible wallet</li>
            </ul>
          )}
        </div>
      </div>

      {/* Share Options */}
      <div className="mt-4 pt-4 border-t border-blue-200">
        <div className="text-xs text-center text-gray-600 mb-3">Share via:</div>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Pay here: ${paymentUrl}`)}`, '_blank')}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            WhatsApp
          </button>
          <button
            onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(paymentUrl)}&text=Payment%20Link`, '_blank')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Telegram
          </button>
          <button
            onClick={() => window.open(`mailto:?subject=Payment%20Request&body=Please%20complete%20payment:%20${paymentUrl}`, '_blank')}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Email
          </button>
        </div>
      </div>
    </div>
  );
}
