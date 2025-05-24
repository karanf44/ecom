import React from 'react';
import { ArrowUpRight, ArrowDownLeft, ShoppingCart, Plus } from 'lucide-react';
import { WalletTransaction } from '@/types';
import { formatCurrency, formatDateTime } from '@/utils';

interface TransactionRowProps {
  transaction: WalletTransaction;
  className?: string;
}

const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  className
}) => {
  const isCredit = transaction.type.toLowerCase() === 'credit';
  
  const getIcon = () => {
    if (isCredit) {
      return transaction.description.toLowerCase().includes('fund') ? Plus : ArrowDownLeft;
    }
    return transaction.description.toLowerCase().includes('purchase') ? ShoppingCart : ArrowUpRight;
  };

  const Icon = getIcon();

  const getIconColor = () => {
    if (isCredit) return 'text-green-600 bg-green-100';
    return 'text-red-600 bg-red-100';
  };

  const getAmountColor = () => {
    return isCredit ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${className}`}>
      <div className="flex items-center space-x-4">
        {/* Transaction Icon */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getIconColor()}`}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Transaction Details */}
        <div className="flex-1">
          <div className="font-medium text-gray-900">
            {transaction.description}
          </div>
          <div className="text-sm text-gray-600">
            {formatDateTime(transaction.created_at)}
          </div>
          {transaction.reference_id && (
            <div className="text-xs text-gray-500 mt-1">
              Ref: {transaction.reference_id}
            </div>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className={`text-right ${getAmountColor()}`}>
        <div className="font-semibold">
          {formatCurrency(isCredit ? transaction.amount : -transaction.amount)}
        </div>
        <div className="text-xs text-gray-500 uppercase">
          {transaction.type}
        </div>
      </div>
    </div>
  );
};

export default TransactionRow; 