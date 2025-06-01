import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  
  const tutorialSteps = [
    {
      title: "Welcome to ThoughtSpace!",
      content: "Embark on a journey through your ideas. This magical canvas is where your thoughts come to life and connect in ways you never imagined.",
      image: "✨"
    },
    {
      title: "Create Sparks of Inspiration",
      content: "Right-click anywhere on the canvas to summon a new thought. Type your idea and watch it materialize in your constellation of tasks.",
      image: "✏️"
    },
    {
      title: "Weave Your Web of Ideas",
      content: "Freely move your thoughts across the canvas. Position related ideas closer together to reveal hidden connections.",
      image: "👆"
    },
    {
      title: "Form Constellations",
      content: "When related thoughts drift close together, they'll naturally form a vibrant constellation. The colorful glow shows which thoughts belong to the same category.",
      image: "🌌"
    },
    {
      title: "Name Your Stars",
      content: "Double-click on a category to give it a name that resonates with your vision. Choose colors that inspire the right energy for each constellation.",
      image: "🎨"
    },
    {
      title: "Illuminate Your Cosmos",
      content: "Click the star button at the top of your screen to illuminate all your thoughts at once, making it easier to read and interact with your entire stellar map.",
      image: "⭐"
    },
    {
      title: "Complete Your Quests",
      content: "When a thought becomes reality, mark it complete! Completed tasks transform into mysterious black holes, forever part of your universe.",
      image: "✅"
    },
    {
      title: "Banish Unwanted Thoughts",
      content: "To remove a thought, either drag it to the cosmic trash bin at the bottom of your screen, or right-click and select delete (confirm with a second click).",
      image: "🗑️"
    },
    {
      title: "Your Universe Awaits!",
      content: "You're ready to explore ThoughtSpace! Create, connect, and conquer your ideas in this cosmic canvas of possibility.",
      image: "🚀"
    }
  ];

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.4, 
        ease: "easeOut" 
      }
    },
    exit: { 
      opacity: 0, 
      y: 50, 
      transition: { 
        duration: 0.3, 
        ease: "easeIn" 
      }
    }
  };

  const currentTutorial = tutorialSteps[currentStep];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Tutorial Card - Only the card captures pointer events */}
          <motion.div 
            className="absolute bottom-5 md:bottom-32 right-5 md:right-10 z-50 pointer-events-auto w-[calc(100%-2.5rem)] max-w-md"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="bg-gray-900 border border-blue-500 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              {/* Close button */}
              <button 
                className="absolute top-3 right-3 text-gray-400 hover:text-white z-10 h-8 w-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors duration-200"
                onClick={onClose}
                aria-label="Close tutorial"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 md:p-4 text-white shadow-[0_0_10px_rgba(59,130,246,0.7)]">
                <h2 className="text-lg md:text-xl font-bold">{currentTutorial.title}</h2>
              </div>
              
              {/* Content */}
              <div className="p-4 md:p-6 bg-gray-900 text-gray-100">
                <div className="flex flex-col items-center mb-4 md:mb-6">
                  <div className="text-5xl md:text-6xl mb-3 md:mb-4">{currentTutorial.image}</div>
                  <p className="text-sm md:text-base text-center">
                    {currentTutorial.content}
                  </p>
                </div>
                
                {/* Progress indicator */}
                <div className="flex justify-center mb-4 md:mb-6 overflow-x-auto py-2">
                  {tutorialSteps.map((_, index) => (
                    <div 
                      key={index} 
                      className={`h-1.5 md:h-2 w-6 md:w-8 mx-0.5 md:mx-1 rounded-full transition-all duration-300 ${
                        index === currentStep 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-[0_0_8px_rgba(59,130,246,0.7)]' 
                          : 'bg-gray-700'
                      }`}
                    />
                  ))}
                </div>
                
                {/* Navigation buttons */}
                <div className="flex justify-between">
                  <button
                    className={`px-3 md:px-5 py-1.5 md:py-2 text-sm md:text-base rounded-md transition-all duration-200 ${
                      currentStep === 0 
                        ? 'text-gray-500 cursor-not-allowed' 
                        : 'text-white bg-gray-800 hover:bg-gray-700 hover:shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                    }`}
                    onClick={prevStep}
                    disabled={currentStep === 0}
                  >
                    Back
                  </button>
                  <button
                    className="px-3 md:px-5 py-1.5 md:py-2 text-sm md:text-base bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-md hover:brightness-110 shadow-[0_0_10px_rgba(59,130,246,0.4)] hover:shadow-[0_0_15px_rgba(59,130,246,0.6)] transition-all duration-200"
                    onClick={nextStep}
                  >
                    {currentStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Tutorial;