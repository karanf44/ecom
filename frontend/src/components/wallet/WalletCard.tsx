import React from 'react';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { Wallet as WalletType } from '@/types';
import { formatCurrency } from '@/utils';

interface WalletCardProps {
  wallet: WalletType | null;
  onAddFunds?: () => void;
  onViewHistory?: () => void;
  className?: string;
}

const WalletCard: React.FC<WalletCardProps> = ({
  wallet,
  onAddFunds,
  onViewHistory,
  className
}) => {
  const balance = wallet?.balance || 0;

  return (
    <Card className={`p-6 bg-gradient-to-br from-blue-600 to-purple-700 text-white ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Wallet Balance</h3>
            <p className="text-blue-100 text-sm">Available funds</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="text-3xl font-bold mb-1">
          {formatCurrency(balance)}
        </div>
        <p className="text-blue-100 text-sm">
          {balance > 0 ? 'Ready to spend' : 'Add funds to get started'}
        </p>
      </div>

      <div className="flex space-x-3">
        {onAddFunds && (
          <Button
            onClick={onAddFunds}
            variant="outline"
            className="flex-1 bg-white bg-opacity-20 border-white border-opacity-30 text-white hover:bg-opacity-30"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Funds
          </Button>
        )}
        
        {onViewHistory && (
          <Button
            onClick={onViewHistory}
            variant="outline"
            className="flex-1 bg-white bg-opacity-20 border-white border-opacity-30 text-white hover:bg-opacity-30"
          >
            <ArrowUpRight className="w-4 h-4 mr-2" />
            History
          </Button>
        )}
      </div>
    </Card>
  );
};

export default WalletCard; 