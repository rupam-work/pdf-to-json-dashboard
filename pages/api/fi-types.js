// FI Type information endpoint
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const FI_PATTERNS = {
    deposit: {
      keywords: ['savings account', 'current account', 'bank statement', 'account summary', 'deposit account', 'ifsc', 'branch', 'cheque'],
      banks: ['sbi', 'hdfc', 'icici', 'axis', 'kotak', 'pnb', 'bank of baroda', 'canara', 'union bank', 'bank'],
      priority: 1
    },
    mutualFund: {
      keywords: ['mutual fund', 'folio', 'nav', 'units', 'scheme', 'amc', 'fund house', 'systematic', 'redemption', 'switch'],
      amcs: ['hdfc mutual', 'icici prudential', 'sbi mutual', 'axis mutual', 'kotak mutual', 'aditya birla', 'nippon', 'franklin'],
      priority: 2
    },
    equity: {
      keywords: ['demat', 'shares', 'equity', 'stock', 'securities', 'depository', 'cdsl', 'nsdl', 'isin', 'trading'],
      brokers: ['zerodha', 'upstox', 'groww', 'angel', 'icici direct', 'hdfc securities', 'kotak securities'],
      priority: 3
    },
    etf: {
      keywords: ['etf', 'exchange traded fund', 'index fund', 'nifty', 'sensex', 'gold etf', 'liquid etf'],
      priority: 4
    }
  };

  res.status(200).json({
    types: ['deposit', 'mutualFund', 'equity', 'etf'],
    patterns: FI_PATTERNS,
    version: '2.0.0'
  });
}
