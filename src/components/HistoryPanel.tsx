import React, { useState } from 'react';
import { MessageHistoryItem, useMessages } from '../context/MessageContext';
import { formatDistanceToNow } from '../utils/dateUtils';
import { Copy, Trash2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

const HistoryPanel: React.FC = () => {
  const { messageHistory, clearHistory, removeHistoryItem } = useMessages();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  
  const toggleExpand = (id: string) => {
    setExpandedItem(expandedItem === id ? null : id);
  };
  
  const copyToClipboard = (payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-300">
      <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-medium">Message History</h2>
        {messageHistory.length > 0 && (
          <button
            onClick={clearHistory}
            className="px-3 py-1.5 text-sm flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors duration-200"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Clear</span>
          </button>
        )}
      </div>
      
      <div className="max-h-[600px] overflow-y-auto">
        {messageHistory.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p>No messages have been sent yet</p>
          </div>
        ) : (
          <ul className="divide-y dark:divide-gray-700">
            {messageHistory.map((item) => (
              <HistoryItem 
                key={item.id} 
                item={item} 
                expanded={expandedItem === item.id}
                onToggleExpand={() => toggleExpand(item.id)}
                onCopy={() => copyToClipboard(item.payload)}
                onRemove={() => removeHistoryItem(item.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

interface HistoryItemProps {
  item: MessageHistoryItem;
  expanded: boolean;
  onToggleExpand: () => void;
  onCopy: () => void;
  onRemove: () => void;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ 
  item, 
  expanded, 
  onToggleExpand, 
  onCopy, 
  onRemove 
}) => {
  return (
    <li className="transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-750">
      <div className="px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div 
              className={`w-2 h-2 rounded-full ${
                item.success ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <button 
              onClick={onToggleExpand}
              className="text-sm font-medium flex items-center"
            >
              <span>Message {expanded ? '' : `(${Object.keys(item.payload).length} fields)`}</span>
              {expanded ? (
                <ChevronUp className="h-4 w-4 ml-1" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-1" />
              )}
            </button>
          </div>
          
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(item.timestamp)}
            </span>
            
            <button
              onClick={onCopy}
              className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              aria-label="Copy to clipboard"
            >
              <Copy className="h-4 w-4" />
            </button>
            
            <button
              onClick={onRemove}
              className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              aria-label="Remove from history"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {expanded && (
          <div className="mt-2 bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <div className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(item.payload, null, 2)}
            </div>
            {item.target && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Sent to: {item.target}
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
};

export default HistoryPanel;