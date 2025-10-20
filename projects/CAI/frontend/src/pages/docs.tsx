import { Navbar } from '@/components/Navbar';

export default function Docs() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">Developer Docs</h1>
        <p className="mt-4 text-gray-600">
          This section provides a high-level overview of the CAI × ERC-8004 framework.
        </p>

        <section className="mt-8 space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="text-xl font-semibold text-gray-900">API Endpoints</h2>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>
                <code className="rounded bg-gray-100 px-2 py-1">POST /api/vc/mandate</code>{' '}
                — Create Mandate VC
              </li>
              <li>
                <code className="rounded bg-gray-100 px-2 py-1">POST /api/vc/cart</code> — Create
                Cart VC
              </li>
              <li>
                <code className="rounded bg-gray-100 px-2 py-1">
                  GET /api/vc/verify/:vcHash
                </code>{' '}
                — Verify VC
              </li>
              <li>
                <code className="rounded bg-gray-100 px-2 py-1">POST /api/ahin/transaction</code>{' '}
                — Queue AHIN transaction
              </li>
              <li>
                <code className="rounded bg-gray-100 px-2 py-1">POST /api/audit/bundle</code>{' '}
                — Generate audit bundle
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="text-xl font-semibold text-gray-900">Getting Started</h2>
            <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-gray-600">
              <li>Copy <code className="rounded bg-gray-100 px-2 py-1">.env.example</code> to <code className="rounded bg-gray-100 px-2 py-1">.env.local</code>.</li>
              <li>Fill in RPC endpoint, WalletConnect project ID, and contract addresses.</li>
              <li>Install dependencies with <code className="rounded bg-gray-100 px-2 py-1">npm install</code>.</li>
              <li>Run the development server using <code className="rounded bg-gray-100 px-2 py-1">npm run dev</code>.</li>
            </ol>
          </div>
        </section>
      </main>
    </div>
  );
}
