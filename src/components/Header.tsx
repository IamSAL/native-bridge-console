import React from 'react';
import { Moon, Sun, Smartphone } from 'lucide-react';

interface HeaderProps {
  toggleTheme: () => void;
  currentTheme: 'light' | 'dark';
}

const Header: React.FC<HeaderProps> = ({ toggleTheme, currentTheme }) => {
  return (
    <header className={`py-4 px-6 ${currentTheme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Smartphone className="h-6 w-6 text-blue-500" />
          <h1 className="text-xl font-semibold">Native Bridge Console</h1>
        </div>
        
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-full ${
            currentTheme === 'dark' 
              ? 'bg-gray-700 hover:bg-gray-600' 
              : 'bg-gray-100 hover:bg-gray-200'
          } transition-colors duration-200`}
          aria-label={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`}
        >
          {currentTheme === 'light' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;