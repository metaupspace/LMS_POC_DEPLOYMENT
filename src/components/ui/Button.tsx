'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isBlock?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-main text-white hover:bg-primary-hover active:brightness-90 disabled:bg-text-disabled disabled:text-white',
  secondary:
    'bg-transparent text-text-primary border border-border-light hover:bg-surface-background active:bg-border-light disabled:text-text-disabled disabled:border-text-disabled',
  danger:
    'bg-error text-white hover:brightness-90 active:brightness-80 disabled:bg-text-disabled disabled:text-white',
  ghost:
    'bg-transparent text-text-secondary hover:bg-surface-background active:bg-border-light disabled:text-text-disabled',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-md py-xs text-body-md gap-xs',
  md: 'h-10 px-lg py-sm text-button gap-sm',
  lg: 'h-12 px-xl py-md text-button gap-sm',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      isBlock = false,
      leftIcon,
      rightIcon,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`
          inline-flex items-center justify-center rounded-sm font-semibold
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${isBlock ? 'w-full' : ''}
          ${disabled || isLoading ? 'cursor-not-allowed' : ''}
          ${className}
        `}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
