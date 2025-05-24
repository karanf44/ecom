'use client';

import React, { useState, useEffect } from 'react';
import { History, Plus } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { WalletCard, TransactionRow } from '@/components/wallet';
import { Button, Card, Modal, Input } from '@/components/ui';
import { Wallet, WalletTransaction, WalletTransactionsResponse } from '@/types';
import { formatCurrency } from '@/utils';
import apiService from '@/services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/context/authStore';

const WalletPage: React.FC = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [pagination, setPagination] = useState<WalletTransactionsResponse['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false);
  const [addFundsAmount, setAddFundsAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const authStoreSetWalletBalance = useAuthStore(state => state.setWalletBalance);

  // Fetch wallet data from API
  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        setLoading(true);
        
        // Fetch wallet and transactions in parallel
        const [walletResponse, transactionsData] = await Promise.all([
          apiService.getWallet(),
          apiService.getWalletTransactions()
        ]);
        
        setWallet(walletResponse);
        setTransactions(transactionsData.transactions);
        setPagination(transactionsData.pagination);
      } catch (error) {
        console.error('Failed to fetch wallet data:', error);
        toast.error('Failed to load wallet data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchWalletData();
  }, []);

  const handleAddFunds = () => {
    setIsAddFundsModalOpen(true);
  };

  const handleAddFundsSubmit = async () => {
    const amount = parseFloat(addFundsAmount);
    
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > 1000) {
      toast.error('Maximum amount per transaction is $1,000');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Add funds via API
      const newTransaction = await apiService.addFunds(amount);
      
      // Update wallet balance locally
      if (wallet) {
        const newBalance = wallet.balance + amount;
        const updatedWallet = {
          ...wallet,
          balance: newBalance,
          updated_at: new Date().toISOString(),
        };
        setWallet(updatedWallet);
        authStoreSetWalletBalance(newBalance);

        // Add new transaction to the list
        setTransactions(prevTransactions => [newTransaction, ...prevTransactions]);
      }

      setAddFundsAmount('');
      setIsAddFundsModalOpen(false);
      toast.success(`Successfully added ${formatCurrency(amount)} to your wallet!`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add funds';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewHistory = () => {
    // Scroll to transactions section
    const transactionsSection = document.getElementById('transactions');
    transactionsSection?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Wallet</h1>
            <p className="text-gray-600">
              Manage your wallet balance and view transaction history
            </p>
          </div>

          {/* Wallet Card */}
          <div className="mb-8">
            <WalletCard
              wallet={wallet}
              onAddFunds={handleAddFunds}
              onViewHistory={handleViewHistory}
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">Add Funds</h3>
                  <p className="text-sm text-gray-600">Top up your wallet balance</p>
                </div>
                <Button onClick={handleAddFunds} size="sm">
                  Add
                </Button>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <History className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">Transaction History</h3>
                  <p className="text-sm text-gray-600">View all your transactions</p>
                </div>
                <Button onClick={handleViewHistory} variant="outline" size="sm">
                  View
                </Button>
              </div>
            </Card>
          </div>

          {/* Transaction History */}
          <div id="transactions">
            <Card>
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {transactions.length} transactions found
                </p>
              </div>
              
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                  <p className="text-gray-600">Your transaction history will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Add Funds Modal */}
      <Modal
        isOpen={isAddFundsModalOpen}
        onClose={() => setIsAddFundsModalOpen(false)}
        title="Add Funds"
        size="sm"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount to Add
            </label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={addFundsAmount}
              onChange={setAddFundsAmount}
            />
            <p className="text-xs text-gray-500 mt-2">
              Minimum: $1.00 • Maximum: $1,000.00
            </p>
          </div>

          {addFundsAmount && parseFloat(addFundsAmount) > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                You're adding <strong>{formatCurrency(parseFloat(addFundsAmount))}</strong> to your wallet
              </p>
            </div>
          )}

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setIsAddFundsModalOpen(false)}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddFundsSubmit}
              disabled={!addFundsAmount || parseFloat(addFundsAmount) <= 0 || isProcessing}
              loading={isProcessing}
              className="flex-1"
            >
              {isProcessing ? 'Processing...' : 'Add Funds'}
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
};

export default WalletPage; 