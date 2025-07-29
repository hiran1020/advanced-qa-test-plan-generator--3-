

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { WandIcon, UploadCloudIcon, FigmaIcon, FileIcon, TrashIcon, CheckCircleIcon, AlertTriangleIcon, ClipboardIcon, ClipboardCheckIcon } from './ui/icons';
import type { FileData, InputData } from '../types';
import { extractFramesFromVideo } from '../utils/videoProcessor';
import { Spinner } from './ui/Spinner';

interface PRDInputProps {
  onAnalyze: (inputs: InputData) => void;
  isLoading: boolean;
}

const examplePRD = `Title: User Login & Authentication

User Stories:
- US-101: As a user, I want to be able to log in with my email and password so that I can access my account.
- US-102: As a user, I want to see an error message if I enter an incorrect password, so I know what went wrong.

Acceptance Criteria:
- AC-1 (for US-101): Given a registered user, when they enter their correct email and password and click 'Login', then they are redirected to their dashboard.
- AC-2 (for US-102): Given a registered user, when they enter their correct email but an incorrect password, then an error message 'Invalid credentials' is displayed.`;

type Tab = 'prd' | 'files' | 'figma';

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export const PRDInput: React.FC<PRDInputProps> = ({ onAnalyze, isLoading }) => {
  const [activeTab, setActiveTab] = useState<Tab>('prd');
  const [prdText, setPrdText] = useState('');
  const [files, setFiles] = useState<FileData[]>([]);
  const [figmaUrl, setFigmaUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [pasted, setPasted] = useState(false);

  const isProcessingFiles = useMemo(() => files.some(f => f.isProcessing), [files]);

  const processFile = useCallback(async (file: File, tempId: string) => {
    try {
        if (file.type.startsWith('video/')) {
            const frames = await extractFramesFromVideo(file);
            setFiles(prev => prev.map(f => f.tempId === tempId ? { ...f, isProcessing: false, frames } : f));
        } else if (file.type.startsWith('image/')) {
            const dataUrl = await readFileAsDataURL(file);
            setFiles(prev => prev.map(f => f.tempId === tempId ? { ...f, isProcessing: false, dataUrl } : f));
        } else {
             throw new Error("Unsupported file type.");
        }
    } catch (error) {
        console.error('File processing error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to process file.';
        setFiles(prev => prev.map(f => f.tempId === tempId ? { ...f, isProcessing: false, error: errorMessage } : f));
    }
  }, []);
  
  const handleFiles = useCallback((incomingFiles: FileList | null) => {
    if (!incomingFiles) return;
    const newFiles: FileData[] = Array.from(incomingFiles)
      .filter(file => file.type.startsWith('image/') || file.type.startsWith('video/'))
      .map(file => {
          const tempId = `${file.name}-${Date.now()}`;
          return {
              tempId,
              name: file.name,
              type: file.type,
              size: file.size,
              dataUrl: '',
              isProcessing: true
          }
      });

    if (newFiles.length > 0) {
        setFiles(prev => [...prev, ...newFiles]);
        newFiles.forEach((newFile, i) => {
            processFile(incomingFiles[i], newFile.tempId);
        });
    }
  }, [processFile]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
        if (activeTab !== 'files') return;
        const items = event.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    const file = new File([blob], `pasted-image-${Date.now()}.png`, { type: blob.type });
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    handleFiles(dataTransfer.files);
                    setPasted(true);
                    setTimeout(() => setPasted(false), 2000);
                }
                break;
            }
        }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeTab, handleFiles]);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleRemoveFile = (tempId: string) => {
    setFiles(prev => prev.filter(f => f.tempId !== tempId));
  };

  const handleAnalyzeClick = () => {
    onAnalyze({ prdText, files, figmaUrl });
  };
  
  const loadExample = () => setPrdText(examplePRD);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'prd':
        return (
          <div className="p-6">
            <textarea
              className="w-full h-80 p-4 bg-black border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="Paste your Product Requirements Document (PRD) here..."
              value={prdText}
              onChange={(e) => setPrdText(e.target.value)}
            />
            <div className="mt-4 text-right">
                <Button variant="ghost" onClick={loadExample}>Load Example</Button>
            </div>
          </div>
        );
      case 'files':
        return (
          <div className="p-6">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors ${isDragging ? 'border-blue-500 bg-gray-900/20' : 'border-gray-600 hover:border-gray-500'}`}
            >
              <UploadCloudIcon className="h-12 w-12 text-gray-500" />
              <p className="mt-4 text-lg text-gray-400">Drag & drop images or videos here</p>
              <p className="text-sm text-gray-500">or</p>
              <input type="file" id="file-upload" className="sr-only" multiple onChange={handleFileSelect} accept="image/*,video/*" />
              <label htmlFor="file-upload" className="mt-2 text-blue-400 font-semibold cursor-pointer hover:underline">browse files</label>
              <div className="mt-4 text-sm text-gray-500 flex items-center">
                  {pasted ? <ClipboardCheckIcon className="h-5 w-5 mr-2 text-green-400" /> : <ClipboardIcon className="h-5 w-5 mr-2" />}
                  <span>You can also paste images from clipboard</span>
              </div>
            </div>
            {files.length > 0 && (
              <div className="mt-6 space-y-3">
                {files.map(file => (
                  <div key={file.tempId} className="flex items-center bg-black p-3 rounded-lg border border-gray-800">
                    <FileIcon className="h-6 w-6 text-gray-400 mr-3 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <div className="flex items-center ml-3">
                      {file.isProcessing && <Spinner className="h-5 w-5" />}
                      {!file.isProcessing && !file.error && <CheckCircleIcon className="h-5 w-5 text-green-400" />}
                      {file.error && <span title={file.error}><AlertTriangleIcon className="h-5 w-5 text-red-400" /></span>}
                      <button onClick={() => handleRemoveFile(file.tempId)} className="ml-3 text-gray-500 hover:text-red-400 transition-colors">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'figma':
        return (
            <div className="p-6 space-y-4">
                <p className="text-gray-400">Provide a link to your Figma design and upload screenshots for the AI to analyze the UI.</p>
                <div className="relative">
                    <FigmaIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                        type="text"
                        className="w-full pl-10 pr-4 py-2 bg-black border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        placeholder="https://figma.com/file/..."
                        value={figmaUrl}
                        onChange={(e) => setFigmaUrl(e.target.value)}
                    />
                </div>
                <p className="text-sm text-gray-500">Note: The AI cannot access Figma directly. Please also upload relevant screenshots in the "Files" tab.</p>
            </div>
        );
    }
  };
  
  const TabButton: React.FC<{ tabId: Tab; activeTab: Tab; onClick: (tab: Tab) => void; children: React.ReactNode; icon: React.ReactNode }> = ({ tabId, activeTab, onClick, children, icon }) => (
    <button
        onClick={() => onClick(tabId)}
        className={`${activeTab === tabId ? 'border-blue-400 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} flex items-center whitespace-nowrap py-3 px-3 border-b-2 font-medium text-sm transition-colors`}
    >
        {icon} {children}
    </button>
  );

  return (
    <Card>
        <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-2 sm:space-x-4 px-6" aria-label="Tabs">
                <TabButton tabId="prd" activeTab={activeTab} onClick={setActiveTab} icon={<FileIcon className="mr-2 h-5 w-5"/>}>PRD Text</TabButton>
                <TabButton tabId="files" activeTab={activeTab} onClick={setActiveTab} icon={<UploadCloudIcon className="mr-2 h-5 w-5"/>}>Upload Files</TabButton>
                <TabButton tabId="figma" activeTab={activeTab} onClick={setActiveTab} icon={<FigmaIcon className="mr-2 h-5 w-5"/>}>Figma</TabButton>
            </nav>
        </div>
        
        {renderTabContent()}

        <div className="p-6 bg-black rounded-b-[15px] border-t border-gray-700 flex justify-end">
            <Button 
              onClick={handleAnalyzeClick} 
              disabled={isLoading || isProcessingFiles} 
              size="lg"
            >
                <WandIcon className="h-5 w-5 mr-2" />
                {isLoading ? 'Analyzing...' : isProcessingFiles ? 'Processing Files...' : 'Analyze Inputs'}
            </Button>
        </div>
    </Card>
  );
};