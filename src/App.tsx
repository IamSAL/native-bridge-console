import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useTheme } from './hooks/useTheme';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Editor from './components/Editor';
import HistoryPanel from './components/HistoryPanel';
import ScannerPage from './components/ScannerPage';
import UrlNavigator from './components/UrlNavigator';
import ErrorBoundary from './components/ErrorBoundary';
import { MessageProvider } from './context/MessageContext';

function App() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <ErrorBoundary>
      <MessageProvider>
        <Router>
          <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
            <Header toggleTheme={toggleTheme} currentTheme={theme} />
            <Navigation />
            <main className="container mx-auto px-4 py-6">
              <Routes>
                <Route path="/" element={
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <Editor />
                    </div>
                    <div className="lg:col-span-1">
                      <HistoryPanel />
                    </div>
                  </div>
                } />
                <Route path="/scanner" element={<ScannerPage />} />
                <Route path="/url-navigator" element={<UrlNavigator />} />
              </Routes>
            </main>
          </div>
        </Router>
      </MessageProvider>
    </ErrorBoundary>
  );
}

export default App;