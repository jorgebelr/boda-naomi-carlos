import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'glass';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  ...props
}) => {
  
  const variants = {
    default: 'bg-white border border-stone-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]',
    flat: 'bg-stone-50 border border-stone-150',
    glass: 'bg-white/70 backdrop-blur-md border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.03)]',
  };

  return (
    <div
      className={`
        rounded-3xl p-6 transition-all duration-300
        ${variants[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};
