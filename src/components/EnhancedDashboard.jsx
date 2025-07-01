import React from 'react';
import { TrendingUp, TrendingDown, User, Calendar, Phone, Mail, MapPin, Building, CreditCard, Target, IndianRupee, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const EnhancedDashboard = ({ data }) => {
  if (!data || !data.data || !data.data[0]) {
    return null;
  }

  const portfolioData = data.data[0];
  const profile = portfolioData.Profile.Holders.Holder[0];
  const summary = portfolioData.Summary;
  const holdings = summary.Investment.Holdings.Holding;
  const transactions = portfolioData.Transactions.Transaction;

  const totalInvested = parseFloat(summary.costValue);
  const currentValue = parseFloat(summary.currentValue);
  const totalReturns = currentValue - totalInvested;
  const returnPercentage = ((totalReturns / totalInvested) * 100);
  const isProfit = totalReturns >= 0;

  const getSchemeTypeColor = (schemeType) => {
    const colors = {
      'GROWTH/EQUITY ORIENTED SCHEMES': 'bg-blue-100 text-blue-800',
      'GROWTH/TAX SAVING SCHEMES': 'bg-green-100 text-green-800',
      'GROWTH/ETF': 'bg-purple-100 text-purple-800',
      'GROWTH/INDEX FUND': 'bg-orange-100 text-orange-800',
    };
    return colors[schemeType] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mutual Fund Portfolio</h1>
              <p className="text-gray-600 mt-1">Generated from screenshot analysis</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Last Updated</div>
              <div className="text-lg font-semibold">{formatDate(new Date().toISOString())}</div>
            </div>
          </div>
        </div>

        {/* Profile Summary */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-500">Account Holder</div>
                <div className="font-medium">{profile.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div className="font-medium">{profile.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-500">Mobile</div>
                <div className="font-medium">{profile.mobile}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-500">Date of Birth</div>
                <div className="font-medium">{formatDate(profile.dob)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-500">PAN</div>
                <div className="font-medium">{profile.pan}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-500">KYC Status</div>
                <div className="font-medium text-green-600">{profile.kycCompliance}</div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <div className="text-sm text-gray-500">Address</div>
              <div className="font-medium">{profile.address}</div>
            </div>
          </div>
        </div>

        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Total Invested</div>
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalInvested)}</div>
              </div>
              <IndianRupee className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Current Value</div>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(currentValue)}</div>
              </div>
              <Target className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Total Returns</div>
                <div className={`text-2xl font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(totalReturns))}
                </div>
              </div>
              {isProfit ? (
                <ArrowUpRight className="w-8 h-8 text-green-500" />
              ) : (
                <ArrowDownRight className="w-8 h-8 text-red-500" />
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Return %</div>
                <div className={`text-2xl font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                  {isProfit ? '+' : ''}{returnPercentage.toFixed(2)}%
                </div>
              </div>
              {isProfit ? (
                <TrendingUp className="w-8 h-8 text-green-500" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-500" />
              )}
            </div>
          </div>
        </div>

        {/* Holdings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Portfolio Holdings</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Scheme Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">AMC</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Units</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">NAV</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Current Value</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding, index) => {
                  const currentValue = parseFloat(holding.closingUnits) * parseFloat(holding.nav);
                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium text-gray-900">{holding.isinDescription}</div>
                          <div className="text-sm text-gray-500">Folio: {holding.folioNo}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-600">{holding.amc}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSchemeTypeColor(holding.schemeTypes)}`}>
                          {holding.schemeCategory || holding.schemeTypes.split('/')[1]}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-medium">{parseFloat(holding.closingUnits).toFixed(3)}</td>
                      <td className="py-4 px-4 text-right">{formatCurrency(parseFloat(holding.nav))}</td>
                      <td className="py-4 px-4 text-right font-medium text-green-600">
                        {formatCurrency(currentValue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Transactions</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Scheme</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">NAV</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Units</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 10).map((transaction, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4 text-gray-600">{formatDate(transaction.transactionDate)}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.type === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-600">{transaction.schemeCode}</td>
                    <td className="py-4 px-4 text-right font-medium">{formatCurrency(parseFloat(transaction.amount))}</td>
                    <td className="py-4 px-4 text-right">{formatCurrency(parseFloat(transaction.nav))}</td>
                    <td className="py-4 px-4 text-right">{parseFloat(transaction.units).toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {transactions.length > 10 && (
            <div className="mt-4 text-center">
              <button className="text-blue-600 hover:text-blue-800 font-medium">
                View All {transactions.length} Transactions
              </button>
            </div>
          )}
        </div>

        {/* Account Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Account Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-500 mb-2">Account Information</div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Account Type:</span>
                  <span className="font-medium">{portfolioData.fiType.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Account Number:</span>
                  <span className="font-medium">{portfolioData.maskedAccountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Registrar:</span>
                  <span className="font-medium">{portfolioData.bank}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-2">Portfolio Summary</div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Holdings:</span>
                  <span className="font-medium">{holdings.length} schemes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction Period:</span>
                  <span className="font-medium">
                    {formatDate(portfolioData.Transactions.startDate)} to {formatDate(portfolioData.Transactions.endDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Transactions:</span>
                  <span className="font-medium">{transactions.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboard;