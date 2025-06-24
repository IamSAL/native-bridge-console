import React from 'react';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const JsonEditor: React.FC<JsonEditorProps> = ({ value, onChange }) => {
  return (
    <div className="relative min-h-[300px]">
      <textarea
        className="w-full h-full min-h-[300px] p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y transition-all"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        placeholder="Enter JSON payload here..."
      />
    </div>
  );
};

export default JsonEditor;