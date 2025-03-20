import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';

// Get API URL from environment or use default
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const Home = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isQrExpanded, setIsQrExpanded] = useState(false);
  const [maxScale, setMaxScale] = useState(3);
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Calculate maximum scale based on screen size
  useEffect(() => {
    const calculateMaxScale = () => {
      if (containerRef.current && qrCodeRef.current) {
        // We only need the QR code width for the calculation
        const qrWidth = qrCodeRef.current.clientWidth;
        
        // Determine max scale (leaving some margin)
        const viewportWidth = window.innerWidth;
        const maxPossibleScale = Math.min(
          (viewportWidth * 0.85) / qrWidth,  // 85% of viewport width
          3  // Never exceed 3x (original value)
        );
        
        setMaxScale(maxPossibleScale);
      }
    };

    // Calculate on mount and window resize
    calculateMaxScale();
    window.addEventListener('resize', calculateMaxScale);
    
    return () => {
      window.removeEventListener('resize', calculateMaxScale);
    };
  }, []);

  // Add click-outside handler to deflate QR code
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isQrExpanded && qrCodeRef.current && !qrCodeRef.current.contains(event.target as Node)) {
        setIsQrExpanded(false);
      }
    };

    // Add event listener if QR code is expanded
    if (isQrExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isQrExpanded]);

  const handleStartSession = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Making API request to: ${API_URL}/create-session`);
      
      const response = await fetch(`${API_URL}/create-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Generate direct URL skipping the base path in hash navigation
        const baseUrl = window.location.origin;
        const hashPath = `${baseUrl}/#/traffic-light/${data.session_id}`;
        setGeneratedUrl(hashPath);
      } else {
        setError(`Failed to create a session. Server responded with: ${response.status} ${response.statusText}. Details: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`An error occurred: ${errorMessage}. API URL: ${API_URL}`);
      console.error('Error creating session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinSession = () => {
    if (generatedUrl) {
      // Extract just the session ID
      const sessionId = generatedUrl.split('/').pop();
      if (sessionId) {
        navigate(`/traffic-light/${sessionId}`);
      }
    }
  };

  const copyToClipboard = () => {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl)
        .then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        })
        .catch(err => {
          console.error('Could not copy URL: ', err);
        });
    }
  };

  const toggleQrExpansion = () => {
    setIsQrExpanded(!isQrExpanded);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="max-w-md w-full bg-gray-800 p-8 rounded-lg shadow-lg" ref={containerRef}>
        <h1 className="text-4xl font-bold text-center mb-8 text-green-400">Traffic Light</h1>
        <p className="text-gray-300 mb-8 text-center">
          Create a traffic light session and share the URL with others to see real-time selections.
        </p>
        
        {!generatedUrl ? (
          <button
            onClick={handleStartSession}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-70"
          >
            {isLoading ? 'Creating Session...' : 'Start New Session'}
          </button>
        ) : (
          <div className="space-y-6">
            {/* Modern QR Code with hover and click animation - responsive scaling */}
            <div className="flex justify-center items-center">
              <div 
                className={`bg-white p-4 rounded-lg transform transition-all duration-300 cursor-pointer hover:shadow-2xl will-change-transform ${isQrExpanded ? `scale-[${maxScale}]` : `hover:scale-[${maxScale}]`}`}
                style={{ 
                  width: '160px',
                  height: '160px',
                  transformOrigin: 'center center',
                  perspective: '1000px',
                  zIndex: isQrExpanded ? 20 : 10,
                  transform: isQrExpanded ? `scale(${maxScale})` : 'scale(1)'
                }}
                ref={qrCodeRef}
                onClick={toggleQrExpansion}
              >
                <QRCode
                  value={generatedUrl || ''}
                  size={140}
                  style={{ 
                    height: "auto", 
                    maxWidth: "100%", 
                    width: "100%"
                  }}
                  viewBox={`0 0 256 256`}
                />
              </div>
            </div>
            
            {/* URL Display */}
            <div className="bg-gray-700 p-4 rounded-md mt-8">
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm text-gray-400">Share this URL:</p>
                <button 
                  onClick={copyToClipboard}
                  className="text-gray-400 hover:text-white text-sm flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  {copySuccess ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-green-400 font-mono text-sm break-all">{generatedUrl}</p>
            </div>
            
            <button
              onClick={handleJoinSession}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
            >
              Join Session
            </button>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-900/40 border border-red-800 rounded-md">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home; 