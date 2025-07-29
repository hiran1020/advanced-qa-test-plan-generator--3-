import React, { useState } from 'react';
import { Button } from './ui/Button';
import { CopyIcon, CheckCircleIcon } from './ui/icons';

interface GherkinDisplayProps {
  text: string;
}

const HighlightedLine: React.FC<{ line: string }> = ({ line }) => {
    const highlighted = line
        .replace(/^(Feature:|Scenario:|Scenario Outline:|Examples:|Background:)/, '<span class="text-purple-400 font-bold">$1</span>')
        .replace(/^(Given|When|Then|And|But) /, '<span class="text-blue-400 font-semibold">$1</span> ');

    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
};

export const GherkinDisplay: React.FC<GherkinDisplayProps> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2"
        onClick={handleCopy}
      >
        {copied ? <CheckCircleIcon className="h-4 w-4 mr-1.5" /> : <CopyIcon className="h-4 w-4 mr-1.5" />}
        {copied ? 'Copied!' : 'Copy'}
      </Button>
      <pre className="bg-black p-4 rounded-lg text-sm whitespace-pre-wrap font-mono language-gherkin overflow-x-auto border border-gray-700">
        <code>
          {text.split('\n').map((line, index) => (
            <React.Fragment key={index}>
              <HighlightedLine line={line} />
              <br />
            </React.Fragment>
          ))}
        </code>
      </pre>
    </div>
  );
};
