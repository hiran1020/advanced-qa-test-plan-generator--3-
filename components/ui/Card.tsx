import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-gray-700 rounded-2xl p-[1px] shadow-2xl shadow-black/20 transition-shadow duration-300 hover:shadow-blue-500/20 ${className}`}>
      <div className="bg-black rounded-[15px] h-full w-full">
        {children}
      </div>
    </div>
  );
};