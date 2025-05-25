'use client';

import React, { useState, useEffect } from 'react';
import { History, Plus } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { WalletCard, TransactionRow } from '@/components/wallet';
import { Button, Card, Modal, Input } from '@/components/ui';
import { Wallet, WalletTransaction/*, WalletTransactionsResponse*/ } from '@/types';
import { formatCurrency } from '@/utils';
import apiService from '@/services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/context/authStore';
import content from '@/content/walletPage.json'; // Import the JSON data

const WalletPage: React.FC = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  // const [pagination, setPagination] = useState<WalletTransactionsResponse['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false);
  const [addFundsAmount, setAddFundsAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const authStoreSetWalletBalance = useAuthStore(state => state.setWalletBalance);

  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        setLoading(true);
        const [walletResponse, transactionsData] = await Promise.all([
          apiService.getWallet(),
          apiService.getWalletTransactions()
        ]);
        setWallet(walletResponse);
        setTransactions(transactionsData.transactions);
        // setPagination(transactionsData.pagination);
      } catch (error) {
        console.error('Failed to fetch wallet data:', error);
        toast.error(content.toasts.loadError);
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
      toast.error(content.toasts.invalidAmount);
      return;
    }
    if (amount > 1000) { // This numeric value could also be in JSON if it needs to be configurable
      toast.error(content.toasts.maxAmountExceeded);
      return;
    }
    setIsProcessing(true);
    try {
      const newTransaction = await apiService.addFunds(amount);
      if (wallet) {
        const newBalance = wallet.balance + amount;
        const updatedWallet = {
          ...wallet,
          balance: newBalance,
          updated_at: new Date().toISOString(),
        };
        setWallet(updatedWallet);
        authStoreSetWalletBalance(newBalance);
        setTransactions(prevTransactions => [newTransaction, ...prevTransactions]);
      }
      setAddFundsAmount('');
      setIsAddFundsModalOpen(false);
      toast.success(`${content.toasts.addFundsSuccessPrefix}${formatCurrency(amount)}${content.toasts.addFundsSuccessSuffix}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : content.toasts.addFundsError;
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewHistory = () => {
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{content.pageHeader.heading}</h1>
            <p className="text-gray-600">{content.pageHeader.subheading}</p>
          </div>

          <div className="mb-8">
            {/* WalletCard will be updated separately to use content.walletCard */}
            <WalletCard
              wallet={wallet}
              onAddFunds={handleAddFunds}
              onViewHistory={handleViewHistory}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{content.quickActions.addFunds.title}</h3>
                  <p className="text-sm text-gray-600">{content.quickActions.addFunds.description}</p>
                </div>
                <Button onClick={handleAddFunds} size="sm">
                  {content.quickActions.addFunds.button}
                </Button>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <History className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{content.quickActions.history.title}</h3>
                  <p className="text-sm text-gray-600">{content.quickActions.history.description}</p>
                </div>
                <Button onClick={handleViewHistory} variant="outline" size="sm">
                  {content.quickActions.history.button}
                </Button>
              </div>
            </Card>
          </div>

          <div id="transactions">
            <Card>
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{content.transactions.heading}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {transactions.length}{content.transactions.countSuffix}
                </p>
              </div>
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{content.transactions.emptyState.heading}</h3>
                  <p className="text-gray-600">{content.transactions.emptyState.subheading}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    // TransactionRow will be updated separately to use content.transactions.referencePrefix
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

      <Modal
        isOpen={isAddFundsModalOpen}
        onClose={() => setIsAddFundsModalOpen(false)}
        title={content.addFundsModal.title}
        size="sm"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {content.addFundsModal.amountLabel}
            </label>
            <Input
              type="number"
              placeholder={content.addFundsModal.amountPlaceholder}
              value={addFundsAmount}
              onChange={setAddFundsAmount}
            />
            <p className="text-xs text-gray-500 mt-2">
              {content.addFundsModal.helpText}
            </p>
          </div>

          {addFundsAmount && parseFloat(addFundsAmount) > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                {content.addFundsModal.confirmationPrefix}<strong>{formatCurrency(parseFloat(addFundsAmount))}</strong>{content.addFundsModal.confirmationSuffix}
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
              {content.addFundsModal.cancelButton}
            </Button>
            <Button
              onClick={handleAddFundsSubmit}
              disabled={!addFundsAmount || parseFloat(addFundsAmount) <= 0 || isProcessing}
              loading={isProcessing}
              className="flex-1"
            >
              {isProcessing ? content.actionButton.processing : content.addFundsModal.submitButton}
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
};

export default WalletPage; 