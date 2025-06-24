import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, QrCode } from 'lucide-react';

const Navigation: React.FC = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Message Editor', icon: MessageSquare },
    { path: '/scanner', label: 'QR/Barcode Scanner', icon: QrCode }
  ];
  
  return (
    <nav className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex space-x-8">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center space-x-2 py-4 px-2 border-b-2 transition-colors duration-200 ${
                location.pathname === path
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;