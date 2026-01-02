
import React from 'react';

interface StepperProps {
  steps: string[];
  currentStep: number;
  onStepClick: (stepIndex: number) => void;
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep, onStepClick }) => {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li key={step} className={`relative ${stepIdx !== steps.length - 1 ? 'flex-1' : ''}`}>
            {stepIdx < currentStep ? (
              // Completed step
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-primary" />
                </div>
                <button
                  onClick={() => onStepClick(stepIdx)}
                  className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary hover:bg-primary-hover"
                >
                  <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
                  </svg>
                  <span className="absolute -bottom-7 text-xs font-semibold text-primary">{step}</span>
                </button>
              </>
            ) : stepIdx === currentStep ? (
              // Current step
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-border" />
                </div>
                <button
                  onClick={() => onStepClick(stepIdx)}
                  className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-surface"
                  aria-current="step"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
                  <span className="absolute -bottom-7 text-xs font-semibold text-primary">{step}</span>
                </button>
              </>
            ) : (
              // Upcoming step
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-border" />
                </div>
                <button
                  onClick={() => onStepClick(stepIdx)}
                  className="group relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-surface hover:border-text-muted"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-transparent group-hover:bg-text-muted" aria-hidden="true" />
                  <span className="absolute -bottom-7 text-xs font-medium text-text-muted group-hover:text-text-secondary">{step}</span>
                </button>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
