import React, { useState, useCallback } from 'react';
import { TestCase } from '../types';
import { ChevronDownIcon, LightbulbIcon, EditIcon, SaveIcon, XIcon, CopyIcon, CheckCircleIcon } from './ui/icons';
import { Button } from './ui/Button';

interface TestCaseCardProps {
  testCase: TestCase;
  onUpdate: (updatedCase: TestCase) => void;
}

const Tag: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
    {children}
  </span>
);

const getRiskColor = (risk: string) => {
    switch (risk?.toLowerCase()) {
        case 'high': return 'bg-red-500/20 text-red-300';
        case 'medium': return 'bg-yellow-500/20 text-yellow-300';
        case 'low': return 'bg-green-500/20 text-green-300';
        default: return 'bg-gray-500/20 text-gray-300';
    }
}

const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
        case 'automated': return 'bg-blue-500/20 text-blue-300';
        case 'manual': return 'bg-purple-500/20 text-purple-300';
        case 'ui/ux': return 'bg-pink-500/20 text-pink-300';
        case 'accessibility': return 'bg-indigo-500/20 text-indigo-300';
        default: return 'bg-gray-500/20 text-gray-300';
    }
}

const getPriorityColor = (priority: string) => {
    switch (priority?.toUpperCase()) {
        case 'P0': return 'bg-fuchsia-500/30 text-fuchsia-300 border border-fuchsia-500/50';
        case 'P1': return 'bg-red-500/30 text-red-300 border border-red-500/50';
        case 'P2': return 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50';
        case 'P3': return 'bg-sky-500/30 text-sky-300 border border-sky-500/50';
        default: return 'bg-gray-500/20 text-gray-300';
    }
}

const EditableField: React.FC<{label: string, value: string, onChange: (value: string) => void, isEditing: boolean, multiline?: boolean}> = 
({label, value, onChange, isEditing, multiline = false}) => {
  if(isEditing) {
    const commonProps = {
      className: "w-full p-2 bg-black border border-gray-600 rounded-md text-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition text-sm",
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value)
    };
    return (
       <div>
        <h4 className="font-semibold text-gray-300 mb-1 text-sm">{label}</h4>
        {multiline ? <textarea {...commonProps} rows={4} /> : <input type="text" {...commonProps} />}
       </div>
    );
  }
  return (
    <div>
        <h4 className="font-semibold text-gray-300 mb-1">{label}</h4>
        {label === "Test Steps" ? (
             <ol className="list-decimal list-inside text-gray-400 space-y-1">
                {value.split('→').map((step, i) => (
                    <li key={i}>{step.trim()}</li>
                ))}
              </ol>
        ) : <p className="text-gray-400 whitespace-pre-wrap">{value}</p> }
    </div>
  )
}

export const TestCaseCard: React.FC<TestCaseCardProps> = ({ testCase, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCase, setEditedCase] = useState(testCase);
  const [copied, setCopied] = useState(false);

  const handleEditToggle = () => {
    if (isEditing) { // If canceling edit
      setEditedCase(testCase);
    }
    setIsEditing(!isEditing);
    if (!isEditing && !isExpanded) {
      setIsExpanded(true);
    }
  };

  const handleSave = () => {
    onUpdate(editedCase);
    setIsEditing(false);
  };
  
  const handleUpdateField = (field: keyof TestCase, value: string) => {
    setEditedCase(prev => ({...prev, [field]: value}));
  };
  
  const handleCopy = useCallback(() => {
    const textToCopy = `
Test Case ID: ${testCase.id}
Priority: ${testCase.priority} (${testCase.priority_reasoning})
Summary: ${testCase.summary}
Type: ${testCase.type}
Risk: ${testCase.risk}
Story ID: ${testCase.storyId}
Preconditions: ${testCase.preconditions}
Test Steps:
${testCase.steps.split('→').map((s, i) => `${i + 1}. ${s.trim()}`).join('\n')}
Expected Result: ${testCase.expectedResult}
    `.trim();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [testCase]);

  return (
    <div className="bg-black border border-gray-700/80 rounded-lg transition-all duration-300">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center flex-1 min-w-0">
            <Tag className={`${getPriorityColor(testCase.priority)} mr-4`}>{testCase.priority}</Tag>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-400">{testCase.id} <span className="text-gray-500">|</span> {testCase.storyId}</p>
                 {isEditing ? (
                    <input 
                      type="text" 
                      value={editedCase.summary} 
                      onChange={(e) => handleUpdateField('summary', e.target.value)}
                      className="w-full bg-black border border-gray-600 rounded-md text-white font-medium focus:ring-1 focus:ring-blue-500 p-1 text-md"
                    />
                 ) : (
                    <p className="text-md font-medium text-white truncate">{testCase.summary}</p>
                 )}
            </div>
        </div>
        <div className="flex items-center space-x-3 ml-4">
          <Tag className={`${getTypeColor(testCase.type)} hidden sm:inline-block`}>{testCase.type}</Tag>
          <Tag className={`${getRiskColor(testCase.risk)} hidden md:inline-block`}>{testCase.risk}</Tag>
          <ChevronDownIcon className={`h-6 w-6 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t border-gray-700/80 p-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            
            <div className="md:col-span-2 bg-blue-900/20 p-3 rounded-md border border-blue-500/20">
              <h4 className="font-semibold text-blue-300 mb-1 flex items-center">
                <LightbulbIcon className="h-4 w-4 mr-2" /> Priority Reasoning
              </h4>
              <p className="text-gray-300 italic">{testCase.priority_reasoning}</p>
            </div>

            <EditableField label="Preconditions" value={editedCase.preconditions} onChange={(v) => handleUpdateField('preconditions', v)} isEditing={isEditing} />
            <EditableField label="Expected Result" value={editedCase.expectedResult} onChange={(v) => handleUpdateField('expectedResult', v)} isEditing={isEditing} />
            <div className="md:col-span-2">
                <EditableField label="Test Steps" value={editedCase.steps} onChange={(v) => handleUpdateField('steps', v)} isEditing={isEditing} multiline />
            </div>
          </div>
           <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-700/50">
                <Button onClick={handleCopy} variant="ghost" size="sm">
                   {copied ? <CheckCircleIcon className="h-4 w-4 mr-1.5" /> : <CopyIcon className="h-4 w-4 mr-1.5" />}
                   {copied ? 'Copied' : 'Copy'}
                </Button>
                {isEditing ? (
                    <>
                        <Button onClick={handleEditToggle} variant="secondary" size="sm">
                            <XIcon className="h-4 w-4 mr-1.5"/> Cancel
                        </Button>
                        <Button onClick={handleSave} size="sm">
                            <SaveIcon className="h-4 w-4 mr-1.5"/> Save
                        </Button>
                    </>
                ) : (
                    <Button onClick={handleEditToggle} variant="secondary" size="sm">
                        <EditIcon className="h-4 w-4 mr-1.5"/> Edit
                    </Button>
                )}
            </div>
        </div>
      )}
    </div>
  );
};