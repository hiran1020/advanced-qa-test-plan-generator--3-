import React from 'react';
import { WandIcon } from './ui/icons';

export const Header: React.FC = () => {
  return (
    <header className="bg-black/30 backdrop-blur-lg border-b border-gray-700/50 sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <WandIcon className="h-8 w-8 text-blue-400" />
            <h1 className="text-xl sm:text-2xl font-bold ml-3 tracking-tight text-gray-100">
              QA Test-Plan Generator
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
};