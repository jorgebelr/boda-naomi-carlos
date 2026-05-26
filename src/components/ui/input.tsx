import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helperText, type = 'text', id, ...props }, ref) => {
    
    const generatedId = React.useId();
    const uniqueId = id || generatedId;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={uniqueId}
            className="text-xs font-semibold tracking-wider text-stone-500 uppercase ml-1"
          >
            {label}
          </label>
        )}
        <input
          id={uniqueId}
          ref={ref}
          type={type}
          className={`
            w-full px-4 py-3 text-sm bg-white border border-stone-200 rounded-2xl
            text-stone-900 placeholder:text-stone-400
            transition-all duration-200 ease-in-out
            focus:outline-none focus:border-stone-450 focus:ring-2 focus:ring-stone-100
            disabled:bg-stone-50 disabled:text-stone-400
            ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-50' : ''}
            ${className}
          `}
          {...props}
        />
        {error ? (
          <span className="text-xs text-red-500 ml-1">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-stone-400 ml-1">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
