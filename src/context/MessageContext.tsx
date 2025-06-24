import React, { createContext, useContext, useState, ReactNode } from 'react';
import { nanoid } from 'nanoid';

export interface MessagePayload {
  userId?: number;
  mobileCardNo?: string;
  physicalCardNo?: string;
  paymentSuccess?: boolean;
  paymentResponse?: {
    code: string;
    description: string;
  };
  cardPar?: string;
  [key: string]: any;
}

export interface MessageHistoryItem {
  id: string;
  timestamp: Date;
  payload: MessagePayload;
  success: boolean;
  target?: string;
}

interface MessageContextType {
  messageHistory: MessageHistoryItem[];
  addMessageToHistory: (payload: MessagePayload, success: boolean, target?: string) => void;
  clearHistory: () => void;
  removeHistoryItem: (id: string) => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const useMessages = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessages must be used within a MessageProvider');
  }
  return context;
};

export const MessageProvider = ({ children }: { children: ReactNode }) => {
  const [messageHistory, setMessageHistory] = useState<MessageHistoryItem[]>([]);

  const addMessageToHistory = (payload: MessagePayload, success: boolean, target?: string) => {
    const newHistoryItem: MessageHistoryItem = {
      id: nanoid(),
      timestamp: new Date(),
      payload,
      success,
      target
    };
    
    setMessageHistory(prev => [newHistoryItem, ...prev]);
  };

  const clearHistory = () => {
    setMessageHistory([]);
  };

  const removeHistoryItem = (id: string) => {
    setMessageHistory(prev => prev.filter(item => item.id !== id));
  };

  return (
    <MessageContext.Provider value={{ 
      messageHistory, 
      addMessageToHistory, 
      clearHistory,
      removeHistoryItem
    }}>
      {children}
    </MessageContext.Provider>
  );
};