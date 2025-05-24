const db = require('../config/knex');

class WalletService {
  // Get wallet details and balance by user ID
  async getWalletByUserId(userId) {
    try {
      const wallet = await db('wallets')
        .join('users', 'wallets.wallet_id', 'users.wallet_id')
        .where('users.id', userId)
        .select(['wallets.wallet_id', 'wallets.balance', 'wallets.created_at', 'wallets.updated_at'])
        .first();

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      return wallet;
    } catch (error) {
      console.error('Error fetching wallet:', error);
      throw error;
    }
  }

  // Get wallet transaction history
  async getTransactionHistory(userId, limit = 50, offset = 0) {
    try {
      const wallet = await this.getWalletByUserId(userId);
      
      const transactions = await db('wallet_transactions')
        .where('wallet_id', wallet.wallet_id)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .select(['id', 'transaction_type', 'amount', 'description', 'created_at']);

      const totalTransactions = await db('wallet_transactions')
        .where('wallet_id', wallet.wallet_id)
        .count('id as count')
        .first();

      return {
        transactions,
        pagination: {
          currentPage: Math.floor(offset / limit) + 1,
          totalPages: Math.ceil(totalTransactions.count / limit),
          totalCount: parseInt(totalTransactions.count),
          hasNextPage: offset + limit < totalTransactions.count,
          hasPrevPage: offset > 0
        }
      };
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  }

  // Add funds to wallet (for testing purposes - no real payment)
  async addFunds(userId, amount, description = 'Funds added') {
    const trx = await db.transaction();
    
    try {
      const wallet = await this.getWalletByUserId(userId);
      
      // Update wallet balance
      const updatedWallet = await trx('wallets')
        .where('wallet_id', wallet.wallet_id)
        .increment('balance', amount)
        .returning(['wallet_id', 'balance', 'updated_at']);

      // Create transaction record
      await trx('wallet_transactions').insert({
        wallet_id: wallet.wallet_id,
        transaction_type: 'credit',
        amount: amount,
        description: description
      });

      await trx.commit();

      return {
        walletId: updatedWallet[0].wallet_id,
        newBalance: updatedWallet[0].balance,
        transactionAmount: amount,
        transactionType: 'credit'
      };
    } catch (error) {
      await trx.rollback();
      console.error('Error adding funds:', error);
      throw error;
    }
  }

  // Deduct funds from wallet (for purchases)
  async deductFunds(userId, amount, description = 'Purchase') {
    const trx = await db.transaction();
    
    try {
      const wallet = await this.getWalletByUserId(userId);
      
      // Check if sufficient balance
      if (wallet.balance < amount) {
        throw new Error('Insufficient wallet balance');
      }

      // Update wallet balance
      const updatedWallet = await trx('wallets')
        .where('wallet_id', wallet.wallet_id)
        .decrement('balance', amount)
        .returning(['wallet_id', 'balance', 'updated_at']);

      // Create transaction record
      await trx('wallet_transactions').insert({
        wallet_id: wallet.wallet_id,
        transaction_type: 'debit',
        amount: amount,
        description: description
      });

      await trx.commit();

      return {
        walletId: updatedWallet[0].wallet_id,
        newBalance: updatedWallet[0].balance,
        transactionAmount: amount,
        transactionType: 'debit'
      };
    } catch (error) {
      await trx.rollback();
      console.error('Error deducting funds:', error);
      throw error;
    }
  }

  // Check if user has sufficient balance
  async hasSufficientBalance(userId, amount) {
    try {
      const wallet = await this.getWalletByUserId(userId);
      return wallet.balance >= amount;
    } catch (error) {
      console.error('Error checking balance:', error);
      return false;
    }
  }

  // Get wallet balance only
  async getBalance(userId) {
    try {
      const wallet = await this.getWalletByUserId(userId);
      return wallet.balance;
    } catch (error) {
      console.error('Error fetching balance:', error);
      throw error;
    }
  }
}

module.exports = new WalletService(); 