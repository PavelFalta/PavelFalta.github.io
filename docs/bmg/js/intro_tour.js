/**
 * Intro.js tour functionality for the BMG tool
 */

// Tour configuration and steps
const introTour = {
  // Track if the tour has been shown before
  hasSeenTour: function() {
    return localStorage.getItem('bmg_has_seen_tour') === 'true';
  },
  
  // Mark tour as seen
  markTourAsSeen: function() {
    localStorage.setItem('bmg_has_seen_tour', 'true');
  },
  
  // Reset tour (for testing)
  resetTour: function() {
    localStorage.removeItem('bmg_has_seen_tour');
  },
  
  // Start the tour
  startTour: function() {
    if (typeof introJs === 'undefined') {
      console.error('introJs is not defined. Make sure you included the library.');
      return;
    }
    
    const tour = introJs();
    
    // Configure tour options
    tour.setOptions({
      steps: [
        {
          intro: '<h5>Welcome to the Business Model Generator</h5><p>Let\'s take a quick tour of the features available to you.</p>'
        },
        {
          element: document.querySelector('.sbmc-container'),
          intro: '<h5>Business Model Canvas</h5><p>This is your canvas where you\'ll build your business model.</p>',
          position: 'right'
        },
        {
          element: document.querySelector('.sbmc-card:first-child'),
          intro: '<h5>Canvas Sections</h5><p>Click on any section to explore questions and enter your ideas.</p>',
          position: 'right'
        },
        {
          element: document.querySelector('#currentIndustryDisplay'),
          intro: '<h5>Industry Selection</h5><p>You can change your industry at any time by clicking here.</p>',
          position: 'bottom'
        },
        {
          element: document.querySelector('.chat-section'),
          intro: '<h5>AI Assistant</h5><p>Ask questions or get help with your business model here.</p>',
          position: 'left'
        },
        {
          element: document.querySelector('.sbmc-card .card-questions-container'),
          intro: '<h5>Guiding Questions</h5><p>Each section contains industry-specific questions to help you develop your ideas.</p>',
          position: 'right'
        },
        {
          element: document.querySelector('#toggleFullscreenBtn'),
          intro: '<h5>Fullscreen Mode</h5><p>Work on your canvas in distraction-free fullscreen mode.</p>',
          position: 'bottom'
        },
        {
          element: document.querySelector('#printBtn'),
          intro: '<h5>Print or Export to PDF</h5><p>Print your canvas or save it as a PDF using the print dialog. Choose "Save as PDF" in the destination dropdown to export as PDF, or select a printer to print directly.</p>',
          position: 'bottom'
        },
        {
          element: document.querySelector('#helpBtn'),
          intro: '<h5>Tutorial</h5><p>You can restart this tour anytime from the help menu.</p>',
          position: 'bottom'
        },
        {
          intro: '<h5>You\'re All Set!</h5><p>Now you\'re ready to create your business model.</p>'
        }
      ],
      showBullets: true,
      showProgress: false,
      overlayOpacity: 0.7,
      scrollToElement: true,
      exitOnOverlayClick: false,
      disableInteraction: true,
      doneLabel: 'Got it!',
      nextLabel: 'Next →',
      prevLabel: '← Back'
    });
    
    // Style the tour to match brand colors
    const tourCSS = document.createElement('style');
    tourCSS.innerHTML = `
      .introjs-tooltip {
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        font-family: 'Inter', sans-serif;
      }
      
      .introjs-helperLayer {
        box-shadow: 0 0 0 1000px rgba(0, 0, 0, .5);
        border-radius: 6px;
      }
      
      .introjs-tooltiptext h5 {
        color: #146c43;
        margin-bottom: 8px;
        font-weight: 600;
      }
      
      .introjs-tooltiptext p {
        color: #495057;
      }
      
      .introjs-button {
        text-shadow: none;
        font-weight: 500;
        border-radius: 4px;
        padding: 6px 15px;
      }
      
      .introjs-nextbutton {
        background-color: #198754;
        color: white;
        border: none;
      }
      
      .introjs-nextbutton:hover, .introjs-nextbutton:focus {
        background-color: #157347;
        color: white;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      }
      
      .introjs-prevbutton {
        border-color: #ced4da;
      }
      
      .introjs-bullets ul li a.active {
        background: #198754;
      }
      
      .introjs-bullets ul li a {
        background: #d8d8d8;
      }
    `;
    document.head.appendChild(tourCSS);
    
    // Handle tour events
    tour.onbeforechange(function(targetElement) {
      // Special handling for specific elements that might not be visible yet
      if (targetElement && targetElement.classList.contains('card-questions-container')) {
        // If a card isn't already open, open the first one
        if (!document.querySelector('.sbmc-card.expanded')) {
          const firstCard = document.querySelector('.sbmc-card');
          if (firstCard && typeof triggerCardClick === 'function') {
            triggerCardClick(firstCard);
          }
        }
      }
    });
    
    tour.oncomplete(function() {
      introTour.markTourAsSeen();
    });
    
    tour.onexit(function() {
      introTour.markTourAsSeen();
    });
    
    // Start the tour
    tour.start();
  },
  
  // Function to trigger after industry selection
  initAfterIndustrySelection: function() {
    // Wait for BMC to fully load before starting tour
    setTimeout(() => {
      if (!this.hasSeenTour()) {
        this.startTour();
      }
    }, 1000);
  }
};

// Helper function to trigger a click on a card for the tour
function triggerCardClick(cardElement) {
  if (!cardElement) return;
  
  // Simulate a click event
  const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window
  });
  
  cardElement.dispatchEvent(clickEvent);
}

// Export the tour object for use in other files
window.introTour = introTour; 