
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { PRDInput } from './components/PRDInput';
import { AnalysisResults } from './components/AnalysisResults';
import { TestPlanDisplay } from './components/TestPlanDisplay';
import { Spinner } from './components/ui/Spinner';
import { analyzeInputs, generateFullTestPlan, generateQaDocumentation } from './services/geminiService';
import type { Analysis, TestCase, InputData, TraceabilityMatrix } from './types';
import { Step } from './types';
import { Stepper } from './components/Stepper';
import { Button } from './components/ui/Button';
import { AlertTriangleIcon, RestartIcon, FileIcon } from './components/ui/icons';
import { Modal } from './components/ui/Modal';
import { QADocsGenerator } from './components/QADocsGenerator';
import { PrdDiffViewer } from './components/PrdDiffViewer';
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
// Collapsible diff section for PRD comparison
const PrdDiffSection: React.FC<{ original: string; enhanced: string }> = ({ original, enhanced }) => {
  const [showDiff, setShowDiff] = useState(false);
  return (
    <div className="mt-8">
      <div className="flex flex-col items-center">
        <Button onClick={() => setShowDiff((v) => !v)} variant="primary" size="lg" className="mb-4">
          {showDiff ? 'Hide PRD Comparison' : 'Compare PRD'}
        </Button>
        {showDiff && (
          <div className="w-full">
            <h3 className="text-xl font-bold text-white mb-2 text-center">Input PRD vs Enhanced PRD</h3>
            <PrdDiffViewer original={original} enhanced={enhanced} />
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [step, setStep] = useState<Step>(Step.PRD_INPUT);
  const [inputData, setInputData] = useState<InputData | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [testCases, setTestCases] = useState<TestCase[] | null>(null);
  const [gherkin, setGherkin] = useState<string | null>(null);
  const [traceabilityMatrix, setTraceabilityMatrix] = useState<TraceabilityMatrix | null>(null);
  const [qaDocs, setQaDocs] = useState<string | null>(null);
  const [enhancedPrd, setEnhancedPrd] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  // Enhanced PRD logic: send a prompt to AI to enhance and fill gaps in the PRD
  const enhancePrdWithMissingItems = async (
    inputData: InputData,
    findings: Array<{ category: string; description: string; source_story_id?: string }> = []
  ): Promise<string> => {
    const prdText = inputData?.prdText || '';
    let prompt = `You are a senior QA and product analyst. Enhance the following PRD by improving clarity, completeness, and structure. Add any missing areas based on these findings, and rewrite the PRD to be more actionable and readable for QA and development teams.\n\n`;
    prompt += `PRD:\n${prdText}\n\n`;
    if (findings && findings.length > 0) {
      prompt += `Missing or weak areas identified by analysis:\n`;
      findings.forEach((f) => {
        prompt += `- ${f.category}: ${f.description}${f.source_story_id ? ` (Story: ${f.source_story_id})` : ''}\n`;
      });
    }
    prompt += `\nPlease provide the enhanced PRD only, do not include commentary or notes.`;
    // Call Gemini API for actual enhancement
    const enhanced = await generateQaDocumentation({ prdText: prompt, files: [], figmaUrl: '' });
    return enhanced;
  };

  const handleEnhancePrd = useCallback(async () => {
    if (!inputData) {
      setError('Input data is missing.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setProgressMessage('Enhancing PRD...');
    setStep(Step.ENHANCE_PRD);

    try {
      const result = await enhancePrdWithMissingItems(inputData, analysis?.findings);
      setEnhancedPrd(result);
      setStep(Step.ENHANCE_PRD);
    } catch (e) {
      setError('Failed to enhance PRD.');
      setStep(Step.ANALYSIS_COMPLETE);
    } finally {
      setIsLoading(false);
      setProgressMessage('');
    }
  }, [inputData, analysis]);

  const handleAnalyze = useCallback(async (currentInputData: InputData) => {
    if (!currentInputData.prdText?.trim() && currentInputData.files.length === 0 && !currentInputData.figmaUrl?.trim()) {
      setError('At least one input (PRD, File, or Figma URL) is required.');
      return;
    }
    setInputData(currentInputData);
    setIsLoading(true);
    setProgressMessage('Analyzing inputs...');
    setError(null);
    setAnalysis(null);
    setTestCases(null);
    setGherkin(null);
    setTraceabilityMatrix(null);
    setQaDocs(null);

    try {
      const result = await analyzeInputs(currentInputData);
      setAnalysis(result);
      setStep(Step.ANALYSIS_COMPLETE);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred during analysis.');
      setStep(Step.PRD_INPUT);
    } finally {
      setIsLoading(false);
      setProgressMessage('');
    }
  }, []);

  const handleGenerateFullPlan = useCallback(async () => {
    if (!inputData) {
      setError('Input data is missing. Please go back to the first step.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setTestCases(null);
    setGherkin(null);
    setTraceabilityMatrix(null);
    
    try {
      const { 
        testCases: resultCases, 
        gherkin: resultGherkin, 
        traceabilityMatrix: resultMatrix,
      } = await generateFullTestPlan(
        inputData, 
        analysis?.findings,
        (progress, currentStep) => {
          setProgressMessage(progress);
          setStep(currentStep);
        }
      );
      setTestCases(resultCases);
      setGherkin(resultGherkin);
      setTraceabilityMatrix(resultMatrix);
      setStep(Step.PLAN_GENERATED);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred during test plan generation.');
      setStep(Step.ANALYSIS_COMPLETE); // Revert to previous step on error
    } finally {
      setIsLoading(false);
      setProgressMessage('');
    }
  }, [inputData, analysis]);

  const handleGenerateQaDocs = useCallback(async () => {
    if (!inputData) {
      setError('Input data is missing.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setQaDocs(null);
    setProgressMessage('Generating comprehensive QA documentation...');
    setStep(Step.GENERATING_QA_DOCS);

    try {
      const result = await generateQaDocumentation(inputData);
      setQaDocs(result);
      setStep(Step.QA_DOCS_GENERATED);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred during QA documentation generation.');
      setStep(Step.PLAN_GENERATED); // Revert to previous step on error
    } finally {
      setIsLoading(false);
      setProgressMessage('');
    }
  }, [inputData]);

  const handleReset = () => {
    setStep(Step.PRD_INPUT);
    setInputData(null);
    setAnalysis(null);
    setTestCases(null);
    setGherkin(null);
    setTraceabilityMatrix(null);
    setQaDocs(null);
    setError(null);
    setIsLoading(false);
    setIsResetModalOpen(false);
  };
  
  const renderLoadingState = (message: string) => (
    <div className="flex flex-col items-center justify-center p-8 bg-black/60 backdrop-blur-sm rounded-2xl shadow-2xl">
      <Spinner />
      <p className="mt-4 text-lg text-blue-300">{message}</p>
    </div>
  );

  const renderStepContent = () => {
    if (isLoading && (step === Step.PRD_INPUT || step === Step.ANALYSIS_COMPLETE || step === Step.PLAN_GENERATED)) {
        return renderLoadingState(progressMessage || 'Processing...');
    }

    switch (step) {
      case Step.PRD_INPUT:
        return <PRDInput onAnalyze={handleAnalyze} isLoading={isLoading} />;
      case Step.ANALYSIS_COMPLETE:
        return analysis ? (
          <>
            <AnalysisResults 
              analysis={analysis} 
              onGeneratePlan={handleGenerateFullPlan} 
              isLoading={isLoading}
            />
            <div className="mt-6 flex justify-center">
              <Button onClick={handleEnhancePrd} size="lg">
                Enhance PRD
              </Button>
            </div>
          </>
        ) : null;
      case Step.ENHANCE_PRD:
        return enhancedPrd ? (
          <div className="max-w-3xl mx-auto bg-black rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4">Enhanced PRD</h2>
            <div className="whitespace-pre-wrap text-gray-200 mb-4" style={{ fontFamily: 'inherit', fontSize: '1rem', lineHeight: '1.6' }}>
              {(() => {
                // Detect and render Test Case Matrix table as HTML table
                const lines = enhancedPrd.split('\n');
                const tableStartIdx = lines.findIndex(line => line.trim().startsWith('Test Case Matrix'));
                const tableHeaderIdx = lines.findIndex(line => line.trim().startsWith('| Test ID'));
                const tableDividerIdx = lines.findIndex(line => line.trim().startsWith('| :'));
                const tableEndIdx = (() => {
                  let idx = tableDividerIdx + 1;
                  while (idx < lines.length && lines[idx].trim().startsWith('|')) idx++;
                  return idx;
                })();
                let rendered = [];
                // Render lines before table
                for (let i = 0; i < tableStartIdx; i++) {
                  const line = lines[i];
                  if (line.startsWith('# ')) {
                    rendered.push(<div key={i} className="text-2xl font-bold text-blue-200 mt-6 mb-2">{line.replace('# ', '')}</div>);
                  } else if (line.startsWith('## ')) {
                    rendered.push(<div key={i} className="text-xl font-semibold text-blue-100 mt-4 mb-2">{line.replace('## ', '')}</div>);
                  } else if (line.startsWith('### ')) {
                    rendered.push(<div key={i} className="text-lg font-semibold text-blue-100 mt-2 mb-1">{line.replace('### ', '')}</div>);
                  } else if (/^[-*•] /.test(line)) {
                    rendered.push(<div key={i} className="pl-4 mb-1">• {line.replace(/^[-*•] /, '')}</div>);
                  } else if (/^(Given|When|Then|And)\b/.test(line.trim())) {
                    rendered.push(<div key={i} className="pl-8 mb-1 text-green-200">- {line.trim()}</div>);
                  } else if (line.trim().length === 0) {
                    rendered.push(<br key={i} />);
                  } else {
                    rendered.push(<div key={i} className="mb-1">{line}</div>);
                  }
                }
                // Render table if found
                if (tableHeaderIdx !== -1 && tableDividerIdx !== -1 && tableEndIdx > tableDividerIdx) {
                  const headerCells = lines[tableHeaderIdx].split('|').map(cell => cell.trim()).filter(Boolean);
                  const rows = [];
                  for (let i = tableDividerIdx + 1; i < tableEndIdx; i++) {
                    const rowCells = lines[i].split('|').map(cell => cell.trim()).filter(Boolean);
                    if (rowCells.length === headerCells.length) {
                      rows.push(rowCells);
                    }
                  }
                  rendered.push(
                    <div key="test-case-matrix" className="overflow-x-auto my-6">
                      <table className="min-w-full border border-gray-700 bg-gray-900 text-gray-100 rounded-lg">
                        <thead>
                          <tr>
                            {headerCells.map((cell, idx) => (
                              <th key={idx} className="px-3 py-2 border-b border-gray-700 font-bold text-left bg-gray-800">{cell}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, rIdx) => (
                            <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="px-3 py-2 border-b border-gray-700 align-top whitespace-pre-wrap">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                }
                // Render lines after table
                for (let i = tableEndIdx; i < lines.length; i++) {
                  const line = lines[i];
                  if (line.startsWith('# ')) {
                    rendered.push(<div key={i} className="text-2xl font-bold text-blue-200 mt-6 mb-2">{line.replace('# ', '')}</div>);
                  } else if (line.startsWith('## ')) {
                    rendered.push(<div key={i} className="text-xl font-semibold text-blue-100 mt-4 mb-2">{line.replace('## ', '')}</div>);
                  } else if (line.startsWith('### ')) {
                    rendered.push(<div key={i} className="text-lg font-semibold text-blue-100 mt-2 mb-1">{line.replace('### ', '')}</div>);
                  } else if (/^[-*•] /.test(line)) {
                    rendered.push(<div key={i} className="pl-4 mb-1">• {line.replace(/^[-*•] /, '')}</div>);
                  } else if (/^(Given|When|Then|And)\b/.test(line.trim())) {
                    rendered.push(<div key={i} className="pl-8 mb-1 text-green-200">- {line.trim()}</div>);
                  } else if (line.trim().length === 0) {
                    rendered.push(<br key={i} />);
                  } else {
                    rendered.push(<div key={i} className="mb-1">{line}</div>);
                  }
                }
                return rendered;
              })()}
            </div>
            {inputData && (
              <PrdDiffSection original={inputData.prdText || ''} enhanced={enhancedPrd} />
            )}
            <div className="flex gap-4 mb-4 mt-4">
              <Button
                onClick={() => navigator.clipboard.writeText(enhancedPrd)}
                variant="outline"
              >
                Copy PRD
              </Button>
              <Button
                onClick={async () => {
                  // DOCX download
                  const lines = enhancedPrd.split('\n');
                  let paragraphs: Paragraph[] = [];
                  let lastBullet: Paragraph | null = null;
                  lines.forEach(line => {
                    // Headings
                    if (line.startsWith('# ')) {
                      paragraphs.push(new Paragraph({ text: line.replace('# ', ''), heading: HeadingLevel.TITLE }));
                      lastBullet = null;
                    } else if (line.startsWith('## ')) {
                      paragraphs.push(new Paragraph({ text: line.replace('## ', ''), heading: HeadingLevel.HEADING_1 }));
                      lastBullet = null;
                    } else if (line.startsWith('### ')) {
                      paragraphs.push(new Paragraph({ text: line.replace('### ', ''), heading: HeadingLevel.HEADING_2 }));
                      lastBullet = null;
                    } else if (/^[-*•] /.test(line)) {
                      // Main bullet
                      paragraphs.push(new Paragraph({ text: line.replace(/^[-*•] /, ''), bullet: { level: 0 } }));
                      lastBullet = null;
                    } else if (/^(\s*\*\*|\s*)?(Given|When|Then|And)\b/.test(line)) {
                      // Sub-bullet for Given/When/Then/And
                      const clean = line.replace(/^(\s*\*\*|\s*)/, '').replace(/\*\*/g, '').trim();
                      paragraphs.push(new Paragraph({ text: clean, bullet: { level: 1 } }));
                      lastBullet = null;
                    } else if (line.trim().length === 0) {
                      paragraphs.push(new Paragraph(''));
                      lastBullet = null;
                    } else {
                      // Remove bold and other markdown
                      const clean = line.replace(/\*\*/g, '').replace(/\*/g, '').replace(/•/g, '').trim();
                      paragraphs.push(new Paragraph(clean));
                      lastBullet = null;
                    }
                  });
                  const doc = new Document({ sections: [{ children: paragraphs }] });
                  const buffer = await Packer.toBlob(doc);
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(buffer);
                  link.setAttribute('download', 'enhanced-prd.docx');
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                variant="outline"
              >
                Download as DOCX
              </Button>
              <Button
                onClick={async () => {
                  // PDF download with pagination and formatting
                  const pdfDoc = await PDFDocument.create();
                  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                  const fontSize = 12;
                  const margin = 40;
                  const lineHeight = fontSize + 4;
                  const pageWidth = 595.28; // A4 width in points
                  const pageHeight = 841.89; // A4 height in points
                  let page = pdfDoc.addPage([pageWidth, pageHeight]);
                  let y = pageHeight - margin;
                  const lines = enhancedPrd.split('\n');
                  function drawLine(text: string, style: { size?: number; lineHeight?: number } = {}) {
                    if (y < margin + lineHeight) {
                      page = pdfDoc.addPage([pageWidth, pageHeight]);
                      y = pageHeight - margin;
                    }
                    page.drawText(text, {
                      x: margin,
                      y,
                      size: style.size || fontSize,
                      font,
                      color: rgb(0, 0, 0),
                      ...style
                    });
                    y -= style.lineHeight || lineHeight;
                  }
                  lines.forEach(line => {
                    if (line.startsWith('# ')) {
                      drawLine(line.replace('# ', ''), { size: 24, lineHeight: 32 });
                    } else if (line.startsWith('## ')) {
                      drawLine(line.replace('## ', ''), { size: 18, lineHeight: 28 });
                    } else if (line.startsWith('### ')) {
                      drawLine(line.replace('### ', ''), { size: 14, lineHeight: 22 });
                    } else if (/^[-*•] /.test(line)) {
                      drawLine('• ' + line.replace(/^[-*•] /, ''), {});
                    } else if (/^(\s*\*\*|\s*)?(Given|When|Then|And)\b/.test(line)) {
                      const clean = line.replace(/^(\s*\*\*|\s*)/, '').replace(/\*\*/g, '').trim();
                      drawLine('    - ' + clean, {});
                    } else if (line.trim().length === 0) {
                      y -= lineHeight;
                    } else {
                      const clean = line.replace(/\*\*/g, '').replace(/\*/g, '').replace(/•/g, '').trim();
                      drawLine(clean, {});
                    }
                  });
                  const pdfBytes = await pdfDoc.save();
                  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.setAttribute('download', 'enhanced-prd.pdf');
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                variant="outline"
              >
                Download as PDF
              </Button>
              <Button
                onClick={() => setStep(Step.GENERATING_PLAN)}
                size="lg"
              >
                Continue to Generate Plan
              </Button>
            </div>
          </div>
        ) : renderLoadingState(progressMessage || 'Enhancing PRD...');
      case Step.GENERATING_PLAN:
      case Step.PRIORITIZING_PLAN:
      case Step.GENERATING_TRACEABILITY:
         return renderLoadingState(progressMessage || "Processing...");
      case Step.PLAN_GENERATED:
        return testCases && gherkin && traceabilityMatrix ? (
          <>
            <TestPlanDisplay 
              testCases={testCases} 
              gherkin={gherkin} 
              traceabilityMatrix={traceabilityMatrix}
            />
            <div className="mt-8 flex justify-center gap-4">
               <Button onClick={() => setIsResetModalOpen(true)} variant="secondary" size="lg">
                <RestartIcon className="h-5 w-5 mr-2" />
                Start Over
              </Button>
              <Button onClick={handleGenerateQaDocs} size="lg">
                <FileIcon className="h-5 w-5 mr-2" />
                Generate QA Documentation
              </Button>
            </div>
          </>
        ) : null;
      case Step.GENERATING_QA_DOCS:
        return renderLoadingState(progressMessage || "Generating QA Documentation...");
      case Step.QA_DOCS_GENERATED:
        return qaDocs ? (
          <>
            <QADocsGenerator docs={qaDocs} />
            {inputData && enhancedPrd && (
              <PrdDiffSection original={inputData.prdText || ''} enhanced={enhancedPrd} />
            )}
            <div className="mt-8 text-center">
              <Button onClick={() => setIsResetModalOpen(true)} variant="secondary" size="lg">
                <RestartIcon className="h-5 w-5 mr-2" />
                Start Over
              </Button>
            </div>
          </>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-6 animate-fade-in" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {step === Step.PRD_INPUT && !isLoading && (
            <div className="text-center mb-10 animate-fade-in">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Generate QA Plans from PRDs, Designs & Videos</h2>
              <p className="mt-3 max-w-2xl mx-auto text-lg text-gray-400">
                Provide a PRD, upload designs, or link to Figma. Our AI analyzes everything to find gaps, generate a plan, and prioritize tests.
              </p>
            </div>
          )}
          
          <Stepper currentStep={step} />

          <div key={step} className="animate-fade-in mt-6">
            {renderStepContent()}
          </div>
        </div>
      </main>
       <Modal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          title="Confirm Start Over"
        >
          <div className="text-center">
              <AlertTriangleIcon className="mx-auto mb-4 h-12 w-12 text-yellow-400" />
              <p className="mb-5 text-lg font-normal text-gray-400">
                  Are you sure you want to start over? All generated data will be lost.
              </p>
          </div>
          <div className="flex justify-center gap-4">
              <Button onClick={() => setIsResetModalOpen(false)} variant="secondary">
                  Cancel
              </Button>
              <Button onClick={handleReset} className="bg-red-600 hover:bg-red-700 focus:ring-red-500">
                  Yes, I'm sure
              </Button>
          </div>
      </Modal>
    </div>
  );
}
