import React, { useState, useEffect } from 'react';
import './Tutorial.css';

interface TutorialStep {
  id: string;
  title: string;
  content: string;
}

interface TutorialProps {
  isVisible: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: '🏥 Welcome to the Physiological Monitor',
    content: 'This advanced simulation displays real-time physiological signals. You can monitor vital signs, adjust parameters, and observe how different body systems interact with each other.'
  },
  {
    id: 'human-body',
    title: '👤 Interactive Human Body',
    content: 'Click on different body parts to activate their corresponding physiological signals:\n\n💓 Heart → EKG (Electrocardiogram)\n🩸 Circulatory system → Blood pressure\n🧠 Brain → Intracranial pressure\n🌡️ Body → Temperature monitoring'
  },
  {
    id: 'signal-windows',
    title: '📊 Signal Windows',
    content: 'Each activated signal opens in its own monitoring window showing real-time waveforms. These windows can be dragged around the screen, resized for better viewing, and closed when not needed.'
  },
  {
    id: 'blood-pressure',
    title: '🩸 Blood Pressure Control',
    content: 'Adjust the mean arterial pressure (MAP) from 50-150 mmHg. Watch how changes affect heart rate, brain pressure, and overall cardiovascular dynamics.\n\nNormal range: 70-100 mmHg'
  },
  {
    id: 'heart-rate',
    title: '💓 Heart Rate Control',
    content: 'Control the heart rate from 20-200 BPM. This affects EKG timing, blood pressure frequency, body temperature, and breathing patterns.\n\nNormal range: 60-100 BPM'
  },
  {
    id: 'autoregulation',
    title: '🧠 Brain Autoregulation',
    content: 'Toggle between normal brain function and traumatic brain injury (TBI) simulation:\n\n🧠 Normal: Brain pressure stays stable despite blood pressure changes\n🚨 TBI Mode: Brain pressure follows blood pressure changes (impaired autoregulation)'
  },
  {
    id: 'signal-interactions',
    title: '🔄 Signal Interactions',
    content: 'Watch how different systems affect each other:\n\n• Higher heart rate → increased body temperature\n• Blood pressure changes → brain pressure response (if TBI mode)\n• Breathing patterns → subtle variations in all signals\n• All signals show realistic medical waveforms'
  },
  {
    id: 'medical-accuracy',
    title: '⚕️ Medical Accuracy',
    content: 'This simulation uses real physiological relationships:\n\n• EKG shows P-QRS-T waves\n• Blood pressure displays systolic/diastolic cycles\n• Brain pressure reflects intracranial dynamics\n• Temperature regulation matches cardiac output\n• Breathing creates realistic signal modulation'
  },
  {
    id: 'tips',
    title: '💡 Pro Tips',
    content: '• Try extreme values to see pathological conditions\n• Combine high blood pressure with TBI mode\n• Watch how fast heart rates affect temperature\n• Notice breathing effects on all pressure signals\n• Drag windows to create your preferred layout\n• This tool is perfect for medical education!'
  },
  {
    id: 'complete',
    title: '🎉 Tutorial Complete!',
    content: 'You\'re now ready to explore the physiological monitor. Experiment with different settings and observe how the human body\'s systems interact in real-time.\n\nDeveloped for medical education and training purposes.'
  }
];

const Tutorial: React.FC<TutorialProps> = ({ isVisible, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isVisible) {
      setCurrentStep(0);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const currentTutorialStep = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  return (
    <div className="tutorial-panel">
      <div className="tutorial-header">
        <div className="tutorial-title">
          <span className="tutorial-icon">🎓</span>
          Tutorial ({currentStep + 1}/{tutorialSteps.length})
        </div>
        <button 
          className="tutorial-close-btn"
          onClick={onClose}
          title="Close Tutorial"
        >
          ✖️
        </button>
      </div>
      
      <div className="tutorial-content">
        <div className="tutorial-step-header">
          <h3>{currentTutorialStep.title}</h3>
        </div>
        <div className="tutorial-step-content">
          {currentTutorialStep.content.split('\n').map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      </div>
      
      <div className="tutorial-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
          />
        </div>
        <div className="step-indicators">
          {tutorialSteps.map((step, index) => (
            <button
              key={step.id}
              className={`step-indicator ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
              onClick={() => handleStepClick(index)}
              title={step.title}
            >
              {index < currentStep ? '✓' : index + 1}
            </button>
          ))}
        </div>
      </div>
      
      <div className="tutorial-navigation">
        <button 
          className="tutorial-btn secondary-btn"
          onClick={handlePrevious}
          disabled={isFirstStep}
        >
          ⬅️ Previous
        </button>
        <div className="tutorial-step-counter">
          Step {currentStep + 1} of {tutorialSteps.length}
        </div>
        <button 
          className="tutorial-btn primary-btn"
          onClick={handleNext}
        >
          {isLastStep ? 'Start Monitoring' : 'Next ➡️'}
        </button>
      </div>
    </div>
  );
};

export default Tutorial; 