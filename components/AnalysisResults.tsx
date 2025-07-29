import React from 'react';
import type { Analysis } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { LightbulbIcon, CheckCircleIcon, GenerateIcon } from './ui/icons';

interface AnalysisResultsProps {
  analysis: Analysis;
  onGeneratePlan: () => void;
  isLoading: boolean;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({ analysis, onGeneratePlan, isLoading }) => {
  const hasFindings = analysis.findings && analysis.findings.length > 0;

  return (
    <Card>
      <div className="p-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
            <CheckCircleIcon className="h-7 w-7 mr-3 text-green-400" />
            Analysis Complete
        </h2>
        
        {hasFindings ? (
          <>
            <p className="text-gray-400 mb-6">The AI has reviewed the PRD and found the following potential gaps, ambiguities, or missing edge cases.</p>
            <div className="space-y-4">
              {analysis.findings.map((finding, index) => (
                <div key={index} className="bg-black p-4 rounded-lg border border-gray-700">
                  <h3 className="font-semibold text-blue-300 flex items-center">
                    <LightbulbIcon className="h-5 w-5 mr-2" />
                    {finding.category} {finding.source_story_id && `(for ${finding.source_story_id})`}
                  </h3>
                  <p className="text-gray-300 mt-1 ml-7">{finding.description}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-gray-300 my-6">The AI reviewed the PRD and found no major gaps or ambiguities. The document appears to be well-defined.</p>
        )}
        
        <div className="mt-8 pt-6 border-t border-gray-700 flex justify-end">
          <Button onClick={onGeneratePlan} disabled={isLoading} size="lg">
             <GenerateIcon className="h-5 w-5 mr-2" />
             {isLoading ? 'Processing...' : 'Generate & Prioritize Plan'}
          </Button>
        </div>
      </div>
    </Card>
  );
};