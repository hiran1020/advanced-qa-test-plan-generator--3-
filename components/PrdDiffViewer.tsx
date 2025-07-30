import React from 'react';
import { diffLines, Change } from 'diff';

interface PrdDiffViewerProps {
  original: string;
  enhanced: string;
}

function getLineClass(change: Change): string {
  if (change.added) return 'bg-green-900/40 text-green-300';
  if (change.removed) return 'bg-red-900/40 text-red-300 line-through';
  return 'bg-black/0 text-gray-300';
}

export const PrdDiffViewer: React.FC<PrdDiffViewerProps> = ({ original, enhanced }) => {
  const diff: Change[] = diffLines(original, enhanced);

  return (
    <div className="rounded-lg border border-gray-700 bg-black/80 p-4 overflow-x-auto text-sm font-mono">
      {diff.map((part: Change, idx: number) => (
        <div key={idx} className={getLineClass(part)}>
          {part.value.split('\n').map((line: string, i: number) => (
            line.length > 0 ? <div key={i}>{line}</div> : null
          ))}
        </div>
      ))}
    </div>
  );
};
