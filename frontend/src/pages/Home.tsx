import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';

// Get API URL from environment or use default
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Interface for session data
interface SessionInfo {
  session_id: string;
  user_count: number;
}

const Home = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isQrExpanded, setIsQrExpanded] = useState(false);
  const [isQrHovered, setIsQrHovered] = useState(false);
  const [maxScale, setMaxScale] = useState(3);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [showActiveSessions, setShowActiveSessions] = useState(false);
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

  // Fetch active sessions when the showActiveSessions state changes
  useEffect(() => {
    if (showActiveSessions) {
      fetchActiveSessions();
    }
  }, [showActiveSessions]);

  const fetchActiveSessions = async () => {
    try {
      setIsLoadingSessions(true);
      setSessionsError(null);
      
      const response = await fetch(`${API_URL}/list-sessions`);
      const data = await response.json();
      
      if (response.ok) {
        setSessions(data.sessions || []);
      } else {
        setSessionsError(`Failed to fetch sessions. Server responded with: ${response.status}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setSessionsError(`An error occurred while fetching sessions: ${errorMessage}`);
    } finally {
      setIsLoadingSessions(false);
    }
  };

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
        // Generate URL for GitHub Pages with correct hash path
        const baseUrl = window.location.origin + '/traffic-light';
        const hashPath = `/#/${data.session_id}`;
        setGeneratedUrl(baseUrl + hashPath);
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

  const handleJoinSession = (sessionId?: string) => {
    if (sessionId) {
      navigate(`/${sessionId}`);
    } else if (generatedUrl) {
      // Extract just the session ID
      const extractedSessionId = generatedUrl.split('/').pop();
      if (extractedSessionId) {
        navigate(`/${extractedSessionId}`);
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

  const handleQrMouseEnter = () => {
    setIsQrHovered(true);
  };

  const handleQrMouseLeave = () => {
    setIsQrHovered(false);
  };

  const toggleActiveSessions = () => {
    setShowActiveSessions(!showActiveSessions);
  };

  // Get the current scale based on expanded/hovered state
  const getQrCodeScale = () => {
    if (isQrExpanded) return maxScale;
    if (isQrHovered) return 1.1;
    return 1;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="max-w-md w-full bg-gray-800 p-8 rounded-lg shadow-lg" ref={containerRef}>
        <h1 className="text-4xl font-bold text-center mb-8 text-green-400">Výukový Semafor</h1>
        <p className="text-gray-300 mb-8 text-center">
          Vytvoř, nasdílej a přizpůsob rychlost výuky zpětné vazbě!
        </p>
        
        {!generatedUrl ? (
          <div className="space-y-6">
            <button
              onClick={handleStartSession}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-70"
            >
              {isLoading ? 'Místnost se připravuje...' : 'Vytvořit Místnost'}
            </button>
            
            <div className="text-center">
              <div className="inline-flex items-center">
                <span className="border-t border-gray-700 w-16"></span>
                <span className="mx-4 text-gray-500 text-sm">nebo</span>
                <span className="border-t border-gray-700 w-16"></span>
              </div>
            </div>
            
            <button
              onClick={toggleActiveSessions}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-md transition"
            >
              {showActiveSessions ? 'Skrýt Otevřené Místnosti' : 'Připojit se k Otevřené Místnosti'}
            </button>
            
            {/* Active Sessions Section */}
            {showActiveSessions && (
              <div className="mt-4">
                <h3 className="text-xl font-semibold mb-3 text-white">Otevřené místnosti</h3>
                
                {isLoadingSessions ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                  </div>
                ) : sessions.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {sessions.map((session) => (
                      <div 
                        key={session.session_id}
                        className="bg-gray-700 rounded-md p-4 flex justify-between items-center hover:bg-gray-600 cursor-pointer transition"
                        onClick={() => handleJoinSession(session.session_id)}
                      >
                        <div>
                          <div className="font-mono text-xs text-gray-400 mb-1">{session.session_id}</div>
                          <div className="text-sm text-green-400">
                            {session.user_count} {session.user_count === 1 ? 'user' : 'users'} active
                          </div>
                        </div>
                        <div className="bg-green-900/40 rounded-full h-8 w-8 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-700 rounded-md p-4 text-center text-gray-400">
                    {sessionsError ? 
                      <p className="text-red-300 text-sm">{sessionsError}</p> : 
                      <p>Vypadá to, že nejsou žádné otevřené místnosti. Vytvoř si vlastní!</p>
                    }
                  </div>
                )}
                
                <div className="mt-4 flex justify-center">
                  <button 
                    onClick={fetchActiveSessions} 
                    className="text-gray-400 hover:text-white text-sm flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Obnovit
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Modern QR Code with hover and click animation - responsive scaling */}
            <div className="flex justify-center items-center">
              <div 
                className="bg-white p-4 rounded-lg transform transition-all duration-300 cursor-pointer hover:shadow-2xl will-change-transform"
                style={{ 
                  width: '160px',
                  height: '160px',
                  transformOrigin: 'center center',
                  perspective: '1000px',
                  zIndex: isQrExpanded ? 20 : 10,
                  transform: `scale(${getQrCodeScale()})`
                }}
                ref={qrCodeRef}
                onClick={toggleQrExpansion}
                onMouseEnter={handleQrMouseEnter}
                onMouseLeave={handleQrMouseLeave}
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
                <p className="text-sm text-gray-400">Sdílej URL:</p>
                <button 
                  onClick={copyToClipboard}
                  className="text-gray-400 hover:text-white text-sm flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  {copySuccess ? 'Zkopírováno!' : 'Zkopírovat'}
                </button>
              </div>
              <a 
                href={generatedUrl}
                className="text-green-400 font-mono text-sm break-all hover:text-green-300 transition-colors duration-200"
              >
                {generatedUrl}
              </a>
            </div>
            
            <button
              onClick={() => handleJoinSession()}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
            >
              Připojit se
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