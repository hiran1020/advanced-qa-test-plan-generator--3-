import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { TestCase, TraceabilityMatrix } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { GherkinIcon, TableIcon, DownloadIcon, SortAscIcon, TraceabilityIcon } from './ui/icons';
import { TestCaseCard } from './TestCaseCard';
import { GherkinDisplay } from './GherkinDisplay';
import { TraceabilityMatrixDisplay } from './TraceabilityMatrixDisplay';

interface TestPlanDisplayProps {
  testCases: TestCase[];
  gherkin: string;
  traceabilityMatrix: TraceabilityMatrix;
}

type Tab = 'interactive' | 'gherkin' | 'traceability';
type SortOrder = 'default' | 'priority';

const convertToCSV = (testCases: TestCase[]): string => {
    if (testCases.length === 0) return '';
    const headers: (keyof TestCase)[] = ['id', 'priority', 'priority_reasoning', 'summary', 'type', 'risk', 'storyId', 'preconditions', 'steps', 'expectedResult'];
    const headerRow = headers.join(',');

    const rows = testCases.map(tc => {
        return headers.map(header => {
            const value = tc[header] || '';
            const escapedValue = `"${String(value).replace(/"/g, '""')}"`;
            return escapedValue;
        }).join(',');
    });
    return [headerRow, ...rows].join('\n');
};

export const TestPlanDisplay: React.FC<TestPlanDisplayProps> = ({ 
  testCases, 
  gherkin, 
  traceabilityMatrix,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('interactive');
  const [sortOrder, setSortOrder] = useState<SortOrder>('default');
  const [editableTestCases, setEditableTestCases] = useState(testCases);

  useEffect(() => {
    setEditableTestCases(testCases);
  }, [testCases]);

  const handleUpdateTestCase = (updatedCase: TestCase) => {
    setEditableTestCases(prevCases => 
      prevCases.map(tc => tc.id === updatedCase.id ? updatedCase : tc)
    );
  };

  const sortedTestCases = useMemo(() => {
    const sorted = [...editableTestCases];
    if (sortOrder === 'priority') {
      sorted.sort((a, b) => {
        const priorityA = parseInt(a.priority.replace('P', ''), 10);
        const priorityB = parseInt(b.priority.replace('P', ''), 10);
        return priorityA - priorityB;
      });
    }
    // 'default' sort is by ID, which is the initial order.
    return sorted;
  }, [editableTestCases, sortOrder]);
  
  const handleExport = useCallback(() => {
    const csvData = convertToCSV(sortedTestCases);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'qa-test-plan.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [sortedTestCases]);
  
  const TabButton: React.FC<{ tabId: Tab; children: React.ReactNode; }> = ({ tabId, children }) => (
    <button
        onClick={() => setActiveTab(tabId)}
        className={`${activeTab === tabId ? 'border-blue-400 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} flex items-center whitespace-nowrap py-3 px-3 border-b-2 font-medium text-sm transition-colors`}
    >
        {children}
    </button>
  );

  return (
    <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Test Plan & Artifacts</h2>
            <Button onClick={handleExport} variant="outline" size="md" className="mt-2 sm:mt-0">
                <DownloadIcon className="h-5 w-5 mr-2"/>
                Export Test Cases (CSV)
            </Button>
        </div>
        <Card>
            <div className="p-2 sm:p-4">
                <div className="border-b border-gray-700">
                    <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto" aria-label="Tabs">
                        <TabButton tabId="interactive">
                           <TableIcon className="mr-2 h-5 w-5"/> Test Cases ({testCases.length})
                        </TabButton>
                        <TabButton tabId="gherkin">
                            <GherkinIcon className="mr-2 h-5 w-5"/> Gherkin Scenarios
                        </TabButton>
                         <TabButton tabId="traceability">
                            <TraceabilityIcon className="mr-2 h-5 w-5"/> Traceability
                        </TabButton>
                    </nav>
                </div>

                <div className="mt-4">
                    {activeTab === 'interactive' && (
                      <>
                        <div className="flex justify-end items-center mb-4 px-1">
                            <span className="text-sm text-gray-400 mr-3">Sort by:</span>
                            <div className="flex rounded-md shadow-sm bg-black">
                                <Button onClick={() => setSortOrder('default')} variant={sortOrder === 'default' ? 'secondary' : 'ghost'} size="sm" className="rounded-r-none">Default</Button>
                                <Button onClick={() => setSortOrder('priority')} variant={sortOrder === 'priority' ? 'secondary' : 'ghost'} size="sm" className="rounded-l-none -ml-px"><SortAscIcon className="h-4 w-4 mr-1.5" />Priority</Button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {sortedTestCases.map((tc, index) => (
                                <TestCaseCard 
                                  key={tc.id || index} 
                                  testCase={tc}
                                  onUpdate={handleUpdateTestCase} 
                                />
                            ))}
                        </div>
                      </>
                    )}
                    {activeTab === 'gherkin' && (
                        <div className="overflow-x-auto max-w-full">
                            <GherkinDisplay text={gherkin} />
                        </div>
                    )}
                    {activeTab === 'traceability' && (
                        <div className="overflow-x-auto max-w-full">
                            <TraceabilityMatrixDisplay matrix={traceabilityMatrix} />
                        </div>
                    )}
                </div>
            </div>
        </Card>
    </div>
  );
};