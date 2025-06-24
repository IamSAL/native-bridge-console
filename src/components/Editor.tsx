import React, { useState, useEffect } from 'react';
import { MessagePayload, useMessages } from '../context/MessageContext';
import { closeModule, detectBridgeType, messageTemplates, BridgeType } from '../utils/bridgeUtils';
import JsonEditor from './JsonEditor';
import { Send, Info, AlertTriangle, CheckCircle, Copy, ArrowRight } from 'lucide-react';

const Editor: React.FC = () => {
  const [jsonValue, setJsonValue] = useState<string>('');
  const [messagePayload, setMessagePayload] = useState<MessagePayload>(messageTemplates[0].payload);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [bridgeType, setBridgeType] = useState<BridgeType>(BridgeType.NONE);
  const [showTemplates, setShowTemplates] = useState(false);
  
  const { addMessageToHistory } = useMessages();

  useEffect(() => {
    // Format the JSON with proper indentation
    setJsonValue(JSON.stringify(messagePayload, null, 2));
  }, [messagePayload]);

  useEffect(() => {
    setBridgeType(detectBridgeType());
  }, []);

  const handleSendMessage = () => {
    try {
      const payload = JSON.parse(jsonValue);
      
      const success = closeModule({
        message: 'CloseWebView',
        data: payload
      });
      
      setStatus(success ? 'success' : 'error');
      setError(success ? null : 'Failed to send message to native app');
      
      // Add to history
      addMessageToHistory(payload, success, bridgeType);
      
      // Reset status after a delay
      setTimeout(() => {
        setStatus('idle');
        setError(null);
      }, 3000);
      
    } catch (error) {
      console.log(error)
      setStatus('error');
      setError('Invalid JSON format');
      
      setTimeout(() => {
        setStatus('idle');
        setError(null);
      }, 3000);
    }
  };

  const handleTemplateSelect = (template: typeof messageTemplates[0]) => {
    setMessagePayload(template.payload);
    setShowTemplates(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonValue);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-300`}>
      <div className="p-4 border-b dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium">Message Editor</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors duration-200"
            >
              Templates
            </button>
            <button
              onClick={copyToClipboard}
              className="px-3 py-1.5 text-sm flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors duration-200"
            >
              <Copy className="h-4 w-4" />
              <span>Copy</span>
            </button>
          </div>
        </div>
        
        {/* Template Selector Dropdown */}
        {showTemplates && (
          <div className="mt-3 bg-white dark:bg-gray-700 shadow-lg rounded-md border dark:border-gray-600 absolute z-10">
            <ul className="py-1">
              {messageTemplates.map((template, index) => (
                <li key={index}>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors duration-150"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    {template.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Bridge Status Indicator */}
      <div className={`px-4 py-2 text-sm flex items-center ${
        bridgeType === BridgeType.NONE 
          ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' 
          : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
      }`}>
        {bridgeType === BridgeType.NONE ? (
          <>
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span>No native bridge detected. Messages will be logged to console.</span>
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            <span>Connected to {bridgeType}</span>
          </>
        )}
      </div>
      
      <div className="p-4">
        <JsonEditor value={jsonValue} onChange={setJsonValue} />
      </div>
      
      <div className="p-4 border-t dark:border-gray-700 flex items-center justify-between">
        <div className="text-sm">
          {status === 'success' && (
            <div className="text-green-500 flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              <span>Message sent successfully!</span>
            </div>
          )}
          {status === 'error' && (
            <div className="text-red-500 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" />
              <span>{error}</span>
            </div>
          )}
          {status === 'idle' && bridgeType !== BridgeType.NONE && (
            <div className="text-gray-500 dark:text-gray-400 flex items-center">
              <Info className="h-4 w-4 mr-1" />
              <span>Click send to transmit the message to the native app</span>
            </div>
          )}
        </div>
        
        <button
          onClick={handleSendMessage}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors duration-200"
        >
          <Send className="h-4 w-4" />
          <span>Send</span>
          <ArrowRight className="h-4 w-4 ml-1" />
        </button>
      </div>
    </div>
  );
};

export default Editor;