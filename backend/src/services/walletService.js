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
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .offset(offset)
        .select(['transaction_id as id', 'type as transaction_type', 'amount', 'description', 'timestamp as created_at']);

      const totalTransactions = await db('wallet_transactions')
        .where('wallet_id', wallet.wallet_id)
        .count('transaction_id as count')
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
      
      await trx('wallets')
        .where('wallet_id', wallet.wallet_id)
        .increment('balance', amount);

      const [insertedTransaction] = await trx('wallet_transactions')
        .insert({
          wallet_id: wallet.wallet_id,
          user_id: userId,
          type: 'CREDIT',
          amount: amount,
          description: description,
          timestamp: db.fn.now()
        })
        .returning(['transaction_id', 'wallet_id', 'type', 'amount', 'description', 'timestamp']);

      await trx.commit();

      if (!insertedTransaction || !insertedTransaction.transaction_id) {
        console.error('Failed to insert or retrieve transaction_id for addFunds', insertedTransaction);
        throw new Error('Transaction creation failed or transaction_id missing.');
      }

      return {
        id: insertedTransaction.transaction_id,
        wallet_id: insertedTransaction.wallet_id,
        type: insertedTransaction.type.toLowerCase(),
        amount: parseFloat(insertedTransaction.amount),
        description: insertedTransaction.description,
        created_at: insertedTransaction.timestamp.toISOString(),
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
      
      if (wallet.balance < amount) {
        throw new Error('Insufficient wallet balance');
      }

      await trx('wallets')
        .where('wallet_id', wallet.wallet_id)
        .decrement('balance', amount);

      const [insertedTransaction] = await trx('wallet_transactions')
        .insert({
          wallet_id: wallet.wallet_id,
          user_id: userId,
          type: 'DEBIT',
          amount: amount,
          description: description,
          timestamp: db.fn.now()
        })
        .returning(['transaction_id', 'wallet_id', 'type', 'amount', 'description', 'timestamp']);
        
      await trx.commit();
      
      if (!insertedTransaction || !insertedTransaction.transaction_id) {
        console.error('Failed to insert or retrieve transaction_id for deductFunds', insertedTransaction);
        throw new Error('Transaction creation failed or transaction_id missing.');
      }

      return {
        id: insertedTransaction.transaction_id,
        wallet_id: insertedTransaction.wallet_id,
        type: insertedTransaction.type.toLowerCase(),
        amount: parseFloat(insertedTransaction.amount),
        description: insertedTransaction.description,
        created_at: insertedTransaction.timestamp.toISOString(),
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
      if (wallet && typeof wallet.balance !== 'undefined' && wallet.balance !== null) {
        const balance = parseFloat(wallet.balance);
        if (isNaN(balance)) {
          console.error(`Failed to parse wallet balance for user ${userId}. Original balance:`, wallet.balance);
          throw new Error('Invalid wallet balance format encountered internally.');
        }
        return balance;
      }
      // If wallet or wallet.balance is null/undefined
      console.error(`Wallet or balance not found for user ${userId}. Wallet object:`, wallet);
      throw new Error('Wallet balance could not be determined.');
    } catch (error) {
      // Log the error with more context if it's not one we threw above
      if (!(error.message.includes('Invalid wallet balance format') || error.message.includes('Wallet balance could not be determined'))) {
        console.error(`Unexpected error fetching balance for user ${userId}:`, error);
      }
      throw error; // Re-throw
    }
  }
}

module.exports = new WalletService(); 