
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

export default function App() {
  const [step, setStep] = useState<Step>(Step.PRD_INPUT);
  const [inputData, setInputData] = useState<InputData | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [testCases, setTestCases] = useState<TestCase[] | null>(null);
  const [gherkin, setGherkin] = useState<string | null>(null);
  const [traceabilityMatrix, setTraceabilityMatrix] = useState<TraceabilityMatrix | null>(null);
  const [qaDocs, setQaDocs] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

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
          <AnalysisResults 
            analysis={analysis} 
            onGeneratePlan={handleGenerateFullPlan} 
            isLoading={isLoading}
          />
        ) : null;
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
