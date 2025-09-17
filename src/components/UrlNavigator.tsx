import React, { useState } from 'react';
import { ExternalLink, Globe, ArrowRight } from 'lucide-react';

const UrlNavigator: React.FC = () => {
  const [url, setUrl] = useState('');
  const [isValidUrl, setIsValidUrl] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const validateUrl = (inputUrl: string): boolean => {
    try {
      // Add protocol if missing
      const urlToTest = inputUrl.startsWith('http://') || inputUrl.startsWith('https://') 
        ? inputUrl 
        : `https://${inputUrl}`;
      
      new URL(urlToTest);
      return true;
    } catch {
      return false;
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    
    if (value.trim() === '') {
      setIsValidUrl(true);
    } else {
      setIsValidUrl(validateUrl(value));
    }
  };

  const handleNavigate = () => {
    if (!url.trim() || !isValidUrl) return;
    
    setIsLoading(true);
    
    // Add protocol if missing
    const urlToNavigate = url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `https://${url}`;
    
  window.location.href=urlToNavigate?.toString()
    
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNavigate();
    }
  };

  const quickLinks = [
    { label: 'Google', url: 'https://google.com' },
    { label: 'GitHub', url: 'https://github.com' },
    { label: 'Stack Overflow', url: 'https://stackoverflow.com' },
    { label: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
  ];

  const handleQuickLink = (quickUrl: string) => {
    setUrl(quickUrl);
    setIsValidUrl(true);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Globe className="h-8 w-8 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            URL Navigator
          </h1>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="url-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter a valid URL:
            </label>
            <div className="flex space-x-2">
              <div className="flex-1">
                <input
                  id="url-input"
                  type="text"
                  value={url}
                  onChange={handleUrlChange}
                  onKeyPress={handleKeyPress}
                  placeholder="example.com or https://example.com"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    !isValidUrl 
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {!isValidUrl && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Please enter a valid URL
                  </p>
                )}
              </div>
              <button
                onClick={handleNavigate}
                disabled={!url.trim() || !isValidUrl || isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors duration-200"
              >
                {isLoading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <span>Go</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="border-t pt-4 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Quick Links
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {quickLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => handleQuickLink(link.url)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors duration-200"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>{link.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="h-2 w-2 bg-blue-500 rounded-full mt-2"></div>
              </div>
              <div>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> URLs will open in a new tab. If no protocol is specified, HTTPS will be used by default.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UrlNavigator;
