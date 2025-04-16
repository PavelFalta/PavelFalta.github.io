import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import useWebSocket from '../hooks/useWebSocket';
import TrafficLightComponent from '../components/TrafficLightComponent';

type Light = 'red' | 'yellow' | 'green';

const TrafficLight = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [activeLight, setActiveLight] = useState<Light>('green');
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Ensure sessionId is defined
  const safeSessionId = sessionId || '';
  
  // Connect to WebSocket
  const { isConnected, data, error, sendMessage } = useWebSocket(safeSessionId);

  // Reset light selection when reconnecting
  useEffect(() => {
    if (isConnected) {
      setActiveLight('green'); // Reset to default
      sendMessage({
        type: 'select_light',
        light: 'green'
      });
    }
  }, [isConnected, sendMessage]);

  // Handle traffic light selection
  const handleLightSelect = (light: Light) => {
    if (light !== activeLight) {
      setActiveLight(light);
      sendMessage({
        type: 'select_light',
        light: light
      });
    }
  };

  // Copy current URL to clipboard
  const handleCopyUrl = () => {
    const baseUrl = window.location.origin + '/traffic-light';
    const hashPath = `/#/${sessionId}`;
    const fullUrl = baseUrl + hashPath;
    
    navigator.clipboard.writeText(fullUrl)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('Could not copy URL: ', err);
      });
  };

  if (!sessionId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-6 max-w-md">
          <h1 className="text-xl font-bold text-white mb-2">Invalid Session</h1>
          <p className="text-gray-300 mb-4">No session ID provided.</p>
          <Link to="/" className="inline-block bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition">
            Zpět
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-full overflow-x-hidden py-4">
      <div className="mb-6 w-full max-w-6xl flex justify-between items-center px-4">
        <Link to="/" className="inline-flex items-center text-gray-400 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Zpět
        </Link>
        
        <button
          onClick={handleCopyUrl}
          className="inline-flex items-center text-gray-400 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
          </svg>
          {copySuccess ? 'Zkopírováno!' : 'Zkopírovat'}
        </button>
      </div>

      <h1 className="text-3xl font-bold mb-2 text-center text-white">Výukový Semafor</h1>
      
      {/* Session ID - Shown at top on desktop, moved to bottom section on mobile */}
      <p className="text-gray-400 mb-6 text-center md:block hidden">
        Session ID: <span className="font-mono text-sm bg-gray-800 px-2 py-1 rounded">{sessionId}</span>
      </p>
      
      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-6 w-full max-w-md mx-4">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}
      
      {!isConnected && !error && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6 w-full max-w-md mx-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mr-3"></div>
          <p className="text-gray-300">Připojování k místnosti...</p>
        </div>
      )}
      
      {isConnected && data && (
        <TrafficLightComponent 
          data={data}
          activeLight={activeLight}
          onLightSelect={handleLightSelect}
          sessionId={sessionId}
        />
      )}
      
      {/* Session ID - Shown at bottom on mobile*/}
      <p className="mt-4 text-gray-400 md:hidden block">
        Session ID: <span className="font-mono text-xs bg-gray-800 px-2 py-1 rounded">{sessionId}</span>
      </p>
    </div>
  );
};

export default TrafficLight; 