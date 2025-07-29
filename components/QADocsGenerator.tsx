import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { CopyIcon, DownloadIcon, CheckCircleIcon } from './ui/icons';

interface QADocsGeneratorProps {
  docs: string;
}

const MarkdownComponents: object = {
  h1: (props: any) => <h1 className="text-3xl font-bold mt-6 mb-4 pb-2 border-b border-gray-700 text-white" {...props} />,
  h2: (props: any) => <h2 className="text-2xl font-bold mt-5 mb-3 text-gray-200" {...props} />,
  h3: (props: any) => <h3 className="text-xl font-semibold mt-4 mb-2 text-gray-300" {...props} />,
  p: (props: any) => <p className="mb-4 text-gray-400 leading-relaxed" {...props} />,
  ul: (props: any) => <ul className="list-disc list-inside mb-4 pl-4 text-gray-400 space-y-1" {...props} />,
  ol: (props: any) => <ol className="list-decimal list-inside mb-4 pl-4 text-gray-400 space-y-1" {...props} />,
  li: (props: any) => <li className="mb-1" {...props} />,
  code: ({node, inline, className, children, ...props}: any) => {
    const match = /language-(\w+)/.exec(className || '');
    return !inline ? (
      <pre className="bg-black p-3 rounded-md my-4 overflow-x-auto border border-gray-700">
        <code className={`language-${match ? match[1] : 'text'}`} {...props}>{String(children).replace(/\n$/, '')}</code>
      </pre>
    ) : (
      <code className="bg-gray-700 text-red-300 rounded px-1.5 py-0.5 font-mono text-sm" {...props}>{children}</code>
    );
  },
  table: (props: any) => <div className="overflow-x-auto my-4 border border-gray-700 rounded-lg"><table className="min-w-full divide-y divide-gray-700" {...props} /></div>,
  thead: (props: any) => <thead className="bg-gray-800/50" {...props} />,
  th: (props: any) => <th className="px-4 py-3 text-left text-sm font-semibold text-white" {...props} />,
  tbody: (props: any) => <tbody className="divide-y divide-gray-800 bg-black/50" {...props} />,
  tr: (props: any) => <tr className="hover:bg-gray-900/50" {...props} />,
  td: (props:any) => <td className="px-4 py-3 text-sm text-gray-400 align-top" {...props} />,
  strong: (props: any) => <strong className="font-bold text-gray-200" {...props} />,
};

export const QADocsGenerator: React.FC<QADocsGeneratorProps> = ({ docs }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(docs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [docs]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([docs], { type: 'text/markdown;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'qa-documentation.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [docs]);

  return (
    <Card>
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Comprehensive QA Documentation</h2>
            <div className="flex gap-2 mt-3 sm:mt-0 flex-shrink-0">
              <Button onClick={handleCopy} variant="outline" size="md">
                  {copied ? <CheckCircleIcon className="h-5 w-5 mr-2"/> : <CopyIcon className="h-5 w-5 mr-2"/>}
                  {copied ? 'Copied!' : 'Copy Markdown'}
              </Button>
               <Button onClick={handleDownload} variant="outline" size="md">
                  <DownloadIcon className="h-5 w-5 mr-2"/>
                  Download (.md)
              </Button>
            </div>
        </div>
        <div className="prose prose-invert max-w-none prose-pre:bg-gray-800 prose-p:text-gray-300">
             <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={MarkdownComponents}
             >
                 {docs}
             </ReactMarkdown>
        </div>
      </div>
    </Card>
  );
};
