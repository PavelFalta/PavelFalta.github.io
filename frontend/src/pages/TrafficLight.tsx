import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import useWebSocket from '../hooks/useWebSocket';
import TrafficLightComponent from '../components/TrafficLightComponent';
import QRCode from 'react-qr-code';

type Light = 'red' | 'yellow' | 'green';

const TrafficLight = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [activeLight, setActiveLight] = useState<Light>('green'); // Default to green
  const [copySuccess, setCopySuccess] = useState(false);
  const [showQR, setShowQR] = useState(false);
  
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
      
      // Send message to server about light change
      sendMessage({
        type: 'select_light',
        light: light
      });
    }
  };

  // Generate shareable URL
  const getShareableUrl = () => {
    const baseUrl = window.location.origin + '/traffic-light';
    const hashPath = `/#/${sessionId}`;
    return baseUrl + hashPath;
  };

  // Copy current URL to clipboard
  const handleCopyUrl = () => {
    const url = getShareableUrl();
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('Could not copy URL: ', err);
      });
  };

  // Toggle QR code display
  const toggleQR = () => {
    setShowQR(!showQR);
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
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="mb-6">
          <TrafficLightComponent
            data={data || { lights: { red: 0, yellow: 0, green: 0 } }}
            activeLight={activeLight}
            onLightSelect={handleLightSelect}
          />
        </div>

        {/* Share section with QR toggle */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between bg-gray-700 rounded-lg p-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">Studentský feedback</h3>
              <p className="text-sm text-gray-300">Sdílejte tento odkaz se studenty</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyUrl}
                className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-md transition"
                title="Kopírovat odkaz"
              >
                {copySuccess ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                )}
              </button>
              <button
                onClick={toggleQR}
                className={`${
                  showQR ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 hover:bg-gray-500'
                } text-white px-4 py-2 rounded-md transition`}
                title="Zobrazit QR kód"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H4a1 1 0 01-1-1zm0 6a1 1 0 011-1h4a1 1 0 010 2H4a1 1 0 01-1-1zm0 6a1 1 0 011-1h4a1 1 0 010 2H4a1 1 0 01-1-1zm8-12a1 1 0 011-1h4a1 1 0 010 2h-4a1 1 0 01-1-1zm0 6a1 1 0 011-1h4a1 1 0 010 2h-4a1 1 0 01-1-1zm0 6a1 1 0 011-1h4a1 1 0 010 2h-4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          {/* QR Code section */}
          {showQR && (
            <div className="mt-4 p-4 bg-white rounded-lg flex justify-center items-center transition-all duration-300 ease-in-out">
              <QRCode
                value={getShareableUrl()}
                size={200}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox={`0 0 256 256`}
              />
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-900/30 border border-red-800 rounded-lg">
            <p className="text-red-200">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrafficLight; 