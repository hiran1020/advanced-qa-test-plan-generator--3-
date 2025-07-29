import React from 'react';
import type { TraceabilityMatrix } from '../types';

interface TraceabilityMatrixDisplayProps {
  matrix: TraceabilityMatrix;
}

export const TraceabilityMatrixDisplay: React.FC<TraceabilityMatrixDisplayProps> = ({ matrix }) => {
  if (!matrix || !matrix.matrix || matrix.matrix.length === 0) {
    return <div className="p-6 text-center text-gray-500">No traceability data available.</div>;
  }

  return (
    <div className="p-2 sm:p-4">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800/50">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">
                Requirement / User Story ID
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                Covering Test Case IDs
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {matrix.matrix.map((entry) => (
              <tr key={entry.story_id} className="hover:bg-gray-800/40 transition-colors">
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-300 sm:pl-6">
                  {entry.story_id}
                </td>
                <td className="whitespace-normal px-3 py-4 text-sm text-gray-400">
                  <div className="flex flex-wrap gap-2">
                    {entry.test_case_ids.map(tcId => (
                       <span key={tcId} className="inline-block rounded bg-blue-900/50 px-2 py-1 text-xs font-mono text-blue-300">
                         {tcId}
                       </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};