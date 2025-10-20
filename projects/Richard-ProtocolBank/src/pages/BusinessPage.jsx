import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { Building2, FileText, Users, Upload, Download, Key, Shield } from 'lucide-react'

export default function BusinessPage() {
  const [selectedTab, setSelectedTab] = useState('overview')

  const accounts = [
    { id: 1, name: 'Operating Account', balance: 245600, currency: 'USD', type: 'Checking' },
    { id: 2, name: 'Payroll Account', balance: 89500, currency: 'USD', type: 'Checking' },
    { id: 3, name: 'EUR Operations', balance: 125000, currency: 'EUR', type: 'Checking' }
  ]

  const invoices = [
    { id: 'INV-2024-001', client: 'Acme Corp', amount: 45000, dueDate: '2024-11-15', status: 'pending', financeAvailable: true },
    { id: 'INV-2024-002', client: 'TechStart Inc', amount: 28500, dueDate: '2024-11-20', status: 'approved', financeAvailable: true },
    { id: 'INV-2024-003', client: 'Global Trading', amount: 67000, dueDate: '2024-11-25', status: 'pending', financeAvailable: false }
  ]

  const teamMembers = [
    { name: 'John Smith', role: 'Admin', permissions: 'Full Access', lastActive: '2 hours ago' },
    { name: 'Sarah Johnson', role: 'Finance Manager', permissions: 'Payments & Reports', lastActive: '5 hours ago' },
    { name: 'Mike Chen', role: 'Accountant', permissions: 'View Only', lastActive: 'Yesterday' }
  ]

  const apiKeys = [
    { name: 'Production API', key: 'pk_live_••••••••••••3x2K', created: '2024-01-15', lastUsed: '2 hours ago', status: 'active' },
    { name: 'Development API', key: 'pk_test_••••••••••••9mL4', created: '2024-02-01', lastUsed: '1 day ago', status: 'active' }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-normal text-gray-900 mb-2">Business Services</h2>
        <p className="text-sm text-gray-500">Enterprise-grade payment solutions for your business</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-8">
          {['overview', 'invoices', 'team', 'api'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`pb-4 text-sm font-medium capitalize transition-colors ${
                selectedTab === tab
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border border-gray-200">
              <CardContent className="p-6">
                <div className="text-sm text-gray-500 mb-1">Monthly Volume</div>
                <div className="text-2xl font-light text-gray-900">$1.2M</div>
                <div className="text-xs text-green-600 mt-1">↑ 32% vs last month</div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardContent className="p-6">
                <div className="text-sm text-gray-500 mb-1">Transactions</div>
                <div className="text-2xl font-light text-gray-900">2,847</div>
                <div className="text-xs text-green-600 mt-1">↑ 18% vs last month</div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardContent className="p-6">
                <div className="text-sm text-gray-500 mb-1">Active Invoices</div>
                <div className="text-2xl font-light text-gray-900">24</div>
                <div className="text-xs text-gray-500 mt-1">$342K total value</div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardContent className="p-6">
                <div className="text-sm text-gray-500 mb-1">Team Members</div>
                <div className="text-2xl font-light text-gray-900">12</div>
                <div className="text-xs text-gray-500 mt-1">3 admins, 9 users</div>
              </CardContent>
            </Card>
          </div>

          {/* Business Accounts */}
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-gray-700" />
                  <h3 className="text-lg font-medium text-gray-900">Business Accounts</h3>
                </div>
                <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                  Add Account
                </Button>
              </div>

              <div className="space-y-3">
                {accounts.map((account) => (
                  <div key={account.id} className="p-4 border border-gray-200 rounded-lg flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-900">{account.name}</div>
                      <div className="text-sm text-gray-500">{account.type} • {account.currency}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-medium text-gray-900">
                        {account.currency === 'USD' ? '$' : '€'}{account.balance.toLocaleString()}
                      </div>
                      <Button className="mt-2 bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm">
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Batch Payments */}
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Upload className="h-5 w-5 text-gray-700" />
                <h3 className="text-lg font-medium text-gray-900">Batch Payments</h3>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="text-sm text-gray-600 mb-2">
                  Upload CSV or Excel file for batch payments
                </div>
                <div className="text-xs text-gray-500 mb-4">
                  Supports payroll, vendor payments, and bulk transfers
                </div>
                <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              </div>

              <div className="mt-4 text-xs text-gray-500">
                <div className="flex items-center space-x-4">
                  <span>✓ Automatic validation</span>
                  <span>✓ Scheduled payments</span>
                  <span>✓ Approval workflows</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invoices Tab */}
      {selectedTab === 'invoices' && (
        <div className="space-y-6">
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-gray-700" />
                  <h3 className="text-lg font-medium text-gray-900">Invoice Management & Financing</h3>
                </div>
                <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                  Create Invoice
                </Button>
              </div>

              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium text-gray-900">{invoice.id}</div>
                        <div className="text-sm text-gray-500">{invoice.client}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-medium text-gray-900">${invoice.amount.toLocaleString()}</div>
                        <div className="text-sm text-gray-500">Due: {invoice.dueDate}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          invoice.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {invoice.status}
                        </span>
                        {invoice.financeAvailable && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                            Finance Available
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {invoice.financeAvailable && (
                          <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm">
                            Get Financing
                          </Button>
                        )}
                        <Button className="bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-900 mb-1">Invoice Financing</div>
                    <div className="text-sm text-blue-700">
                      Get up to 90% of your invoice value immediately. Rates from 0.5% per month.
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Tab */}
      {selectedTab === 'team' && (
        <div className="space-y-6">
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-gray-700" />
                  <h3 className="text-lg font-medium text-gray-900">Team Management</h3>
                </div>
                <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                  Invite Member
                </Button>
              </div>

              <div className="space-y-3">
                {teamMembers.map((member, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{member.name}</div>
                        <div className="text-sm text-gray-500">{member.role} • {member.permissions}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500 mb-2">Last active: {member.lastActive}</div>
                      <Button className="bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm">
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="h-5 w-5 text-gray-700" />
                <h3 className="text-lg font-medium text-gray-900">Permission Levels</h3>
              </div>

              <div className="space-y-3">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="font-medium text-gray-900 mb-2">Admin</div>
                  <div className="text-sm text-gray-500">Full access to all features, settings, and team management</div>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="font-medium text-gray-900 mb-2">Finance Manager</div>
                  <div className="text-sm text-gray-500">Can initiate payments, manage invoices, and view reports</div>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="font-medium text-gray-900 mb-2">View Only</div>
                  <div className="text-sm text-gray-500">Can view transactions and reports, cannot initiate payments</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* API Tab */}
      {selectedTab === 'api' && (
        <div className="space-y-6">
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Key className="h-5 w-5 text-gray-700" />
                  <h3 className="text-lg font-medium text-gray-900">API Keys</h3>
                </div>
                <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                  Generate New Key
                </Button>
              </div>

              <div className="space-y-3">
                {apiKeys.map((key, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium text-gray-900">{key.name}</div>
                        <div className="text-sm text-gray-500 font-mono">{key.key}</div>
                      </div>
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                        {key.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <div>Created: {key.created} • Last used: {key.lastUsed}</div>
                      <div className="flex space-x-2">
                        <Button className="bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm">
                          Rotate
                        </Button>
                        <Button className="bg-red-100 hover:bg-red-200 text-red-700 text-sm">
                          Revoke
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">API Documentation</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-900 mb-2">RESTful API Endpoints</div>
                  <div className="text-sm text-gray-600 mb-3">
                    Integrate Protocol Bank into your systems with our comprehensive API
                  </div>
                  <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                    <Download className="h-4 w-4 mr-2" />
                    View Documentation
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 border border-gray-200 rounded">
                    <div className="text-gray-500 mb-1">Payments API</div>
                    <div className="font-medium text-gray-900">Send & receive payments</div>
                  </div>
                  <div className="p-3 border border-gray-200 rounded">
                    <div className="text-gray-500 mb-1">Accounts API</div>
                    <div className="font-medium text-gray-900">Manage accounts & balances</div>
                  </div>
                  <div className="p-3 border border-gray-200 rounded">
                    <div className="text-gray-500 mb-1">Webhooks</div>
                    <div className="font-medium text-gray-900">Real-time notifications</div>
                  </div>
                  <div className="p-3 border border-gray-200 rounded">
                    <div className="text-gray-500 mb-1">Reports API</div>
                    <div className="font-medium text-gray-900">Transaction reports</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

