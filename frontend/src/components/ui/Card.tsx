import React from 'react';
import { cn } from '@/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'bordered' | 'elevated';
  onClick?: () => void;
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const variantClasses = {
  default: 'bg-white border border-gray-200',
  bordered: 'bg-white border-2 border-gray-200',
  elevated: 'bg-white shadow-lg border border-gray-100',
};

interface CardComponent extends React.FC<CardProps> {
  Header: React.FC<{ children: React.ReactNode; className?: string }>;
  Title: React.FC<{ children: React.ReactNode; className?: string }>;
  Description: React.FC<{ children: React.ReactNode; className?: string }>;
  Content: React.FC<{ children: React.ReactNode; className?: string }>;
  Footer: React.FC<{ children: React.ReactNode; className?: string }>;
}

const Card: CardComponent = ({
  children,
  className,
  hover = true,
  padding = 'md',
  variant = 'default',
  onClick,
}) => {
  const baseClasses = 'rounded-lg transition-all duration-200';
  const hoverClasses = hover ? 'hover:shadow-md hover:scale-[1.02]' : '';
  const clickableClasses = onClick ? 'cursor-pointer' : '';
  
  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        paddingClasses[padding],
        hoverClasses,
        clickableClasses,
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// Sub-components for better composition
const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <div className={cn('mb-4', className)}>
    {children}
  </div>
);

const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <h3 className={cn('text-lg font-semibold text-gray-900', className)}>
    {children}
  </h3>
);

const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <p className={cn('text-sm text-gray-600', className)}>
    {children}
  </p>
);

const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <div className={cn(className)}>
    {children}
  </div>
);

const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <div className={cn('mt-4 pt-4 border-t border-gray-200', className)}>
    {children}
  </div>
);

// Attach sub-components
Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;
Card.Footer = CardFooter;

export default Card; 