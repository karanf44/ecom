const walletService = require('../services/walletService');

// Get wallet details and balance
const getWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const wallet = await walletService.getWalletByUserId(userId);
    const balance = wallet.balance;

    res.status(200).json({
      success: true,
      data: {
        walletId: wallet.wallet_id,
        balance: parseFloat(balance),
        createdAt: wallet.created_at,
        updatedAt: wallet.updated_at
      }
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch wallet details'
    });
  }
};

// Get wallet transaction history
const getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await walletService.getTransactionHistory(userId, limit, offset);

    // Format transactions for response
    const formattedTransactions = result.transactions.map(transaction => ({
      id: transaction.id,
      type: transaction.transaction_type,
      amount: parseFloat(transaction.amount),
      description: transaction.description,
      createdAt: transaction.created_at
    }));

    res.status(200).json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: result.pagination
      }
    });
  } catch (error) {
    console.error('Get transaction history error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch transaction history'
    });
  }
};

// Add funds to wallet (for testing - no real payment)
const addFunds = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, description } = req.body;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    if (amount > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum amount limit is $10,000'
      });
    }

    const result = await walletService.addFunds(
      userId, 
      parseFloat(amount), 
      description || 'Funds added to wallet'
    );

    res.status(201).json({
      success: true,
      message: 'Funds added successfully and transaction created',
      data: result
    });
  } catch (error) {
    console.error('Add funds error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add funds'
    });
  }
};

// Check wallet balance
const checkBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const balance = await walletService.getBalance(userId);

    res.status(200).json({
      success: true,
      data: {
        balance: parseFloat(balance)
      }
    });
  } catch (error) {
    console.error('Check balance error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check balance'
    });
  }
};

// Check if user has sufficient balance for a purchase
const checkSufficientBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.query;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    const hasSufficientBalance = await walletService.hasSufficientBalance(userId, parseFloat(amount));
    const currentBalance = await walletService.getBalance(userId);

    res.status(200).json({
      success: true,
      data: {
        hasSufficientBalance,
        currentBalance: parseFloat(currentBalance),
        requestedAmount: parseFloat(amount)
      }
    });
  } catch (error) {
    console.error('Check sufficient balance error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check balance'
    });
  }
};

module.exports = {
  getWallet,
  getTransactionHistory,
  addFunds,
  checkBalance,
  checkSufficientBalance
}; 