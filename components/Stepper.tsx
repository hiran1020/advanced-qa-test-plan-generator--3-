import React from 'react';
import { Step } from '../types';
import { CheckCircleIcon } from './ui/icons';

interface StepperProps {
  currentStep: Step;
}

const stepConfig = [
  { id: Step.PRD_INPUT, name: 'Input & Upload' },
  { id: Step.ANALYSIS_COMPLETE, name: 'Review Analysis' },
  { id: Step.ENHANCE_PRD, name: 'Enhance PRD' },
  { id: Step.GENERATING_PLAN, name: 'Generate Plan' },
  { id: Step.PLAN_GENERATED, name: 'View Test Plan' },
  { id: Step.QA_DOCS_GENERATED, name: 'QA Doc' },
];

export const Stepper: React.FC<StepperProps> = ({ currentStep }) => {
  let currentVisualStep = currentStep;
  
  if (currentStep === Step.PRIORITIZING_PLAN || currentStep === Step.GENERATING_TRACEABILITY) {
    currentVisualStep = Step.GENERATING_PLAN;
  }
  if (currentStep === Step.GENERATING_QA_DOCS) {
    currentVisualStep = Step.QA_DOCS_GENERATED;
  }
  
  const currentStepIndex = stepConfig.findIndex(s => s.id === currentVisualStep);
  const progressPercentage = currentStepIndex >= 0 ? (currentStepIndex / (stepConfig.length - 1)) * 100 : 0;

  return (
    <div role="navigation" aria-label="Progress" className="relative my-8">
      <div className="absolute left-0 top-1/2 w-full h-0.5 -translate-y-1/2 bg-gray-700">
        <div 
          className="h-full bg-blue-600 transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>

      <ol role="list" className="relative flex justify-between items-start">
        {stepConfig.map((step, stepIdx) => {
          const isCompleted = stepIdx < currentStepIndex;
          const isCurrent = currentStepIndex === stepIdx;
          
          return (
            <li key={step.name} className="flex-1 text-center last:text-right first:text-left">
              <div className="flex flex-col items-center">
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300 z-10 relative bg-gray-800 ${isCompleted ? 'bg-blue-600' : isCurrent ? 'border-2 border-blue-500' : 'border-2 border-gray-600'}`}> 
                  {isCompleted ? (
                    <CheckCircleIcon className="h-6 w-6 text-white" />
                  ) : (
                    <span className={`transition-colors duration-300 ${isCurrent ? 'text-blue-400 font-bold' : 'text-gray-500'}`}>{`0${stepIdx + 1}`}</span>
                  )}
                </div>
                <span className={`text-xs mt-2 font-semibold transition-colors duration-300 w-24 flex justify-center items-center ${isCompleted ? 'text-white' : isCurrent ? 'text-blue-300' : 'text-gray-400'}`}>{step.name}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
