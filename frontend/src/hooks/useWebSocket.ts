import { useState, useEffect, useRef, useCallback } from 'react';

export interface TrafficLightData {
  lights: {
    red: number;
    yellow: number;
    green: number;
  };
}

type WebSocketMessage = {
  type: string;
  data?: TrafficLightData;
};

interface UseWebSocketReturn {
  isConnected: boolean;
  data: TrafficLightData | null;
  error: string | null;
  sendMessage: (message: any) => void;
  wsUrl: string;
}

// Get API URL from environment or use default
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Generate or retrieve a persistent client ID
const getClientId = (): string => {
  const clientIdKey = 'traffic_light_client_id';
  let clientId = localStorage.getItem(clientIdKey);
  
  if (!clientId) {
    // Generate a unique ID if not found
    clientId = 'client_' + Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    localStorage.setItem(clientIdKey, clientId);
  }
  
  return clientId;
};

// Function to get appropriate WebSocket URL based on current environment
const getWebSocketUrl = () => {
  // Check if we're running in development or production
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  // For local development
  if (isDevelopment) {
    return 'ws://localhost:8000';
  }
  
  // For production (deployed environment)
  // Use secure WebSockets (wss://) if the page is loaded over HTTPS
  const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
  
  // Extract the host from the API URL
  let apiHost = API_URL.replace(/^https?:\/\//, '');
  // Remove any trailing slash
  apiHost = apiHost.replace(/\/$/, '');
  
  return `${protocol}${apiHost}`;
};

const useWebSocket = (sessionId: string): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [data, setData] = useState<TrafficLightData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const connectionInProgressRef = useRef(false);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 5000; // 5 seconds
  const clientId = useRef<string>(getClientId());
  
  // Store the actual WebSocket URL for debugging (now with client ID)
  const wsUrl = `${getWebSocketUrl()}/ws/${sessionId}?client_id=${encodeURIComponent(clientId.current)}`;

  // Function to clear all intervals and timeouts
  const clearTimers = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Ensure proper cleanup of existing connection
  const closeExistingConnection = useCallback(() => {
    if (!wsRef.current) return;
    
    try {
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        console.log('Closing existing WebSocket connection...');
        // Use a clean close
        wsRef.current.close(1000, 'Clean close by client');
      }
      wsRef.current = null;
    } catch (err) {
      console.error('Error closing WebSocket:', err);
    }
  }, []);

  // Function to send HTTP heartbeat
  const sendHeartbeat = useCallback(async () => {
    try {
      await fetch(`${API_URL}/heartbeat`);
    } catch (err) {
      console.error('Heartbeat error:', err);
    }
  }, []);

  // Function to establish WebSocket connection
  const connectWebSocket = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (connectionInProgressRef.current) {
      console.log('Connection already in progress, skipping');
      return;
    }
    
    // First, ensure any existing connection is properly closed
    closeExistingConnection();
    
    connectionInProgressRef.current = true;
    console.log(`Connecting to WebSocket at: ${wsUrl} with client ID: ${clientId.current}`);
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connection established');
        connectionInProgressRef.current = false;
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          if (message.type === 'update' && message.data) {
            // Validate the message data to prevent invalid states
            if (message.data.lights) {
              // Ensure no negative light values
              const safeData = {
                lights: {
                  red: Math.max(0, message.data.lights.red || 0),
                  yellow: Math.max(0, message.data.lights.yellow || 0),
                  green: Math.max(0, message.data.lights.green || 0)
                }
              };
              setData(safeData);
            }
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        connectionInProgressRef.current = false;
        setError(`Failed to connect to the server at ${wsUrl}. Please try again later.`);
      };

      ws.onclose = (event) => {
        console.log(`WebSocket connection closed with code: ${event.code}, reason: ${event.reason}`);
        connectionInProgressRef.current = false;
        setIsConnected(false);
        
        if (event.code !== 1000) {
          // Not a normal closure, attempt to reconnect
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current++;
            const delay = RECONNECT_DELAY * reconnectAttemptsRef.current;
            console.log(`Attempting to reconnect in ${delay/1000} seconds... (Attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
            
            reconnectTimeoutRef.current = window.setTimeout(() => {
              connectWebSocket();
            }, delay);
          } else {
            setError('Maximum reconnection attempts reached. Please refresh the page.');
          }
        }
      };
    } catch (err) {
      console.error('Error creating WebSocket connection:', err);
      connectionInProgressRef.current = false;
      setError(`Failed to create WebSocket connection: ${err}`);
    }
  }, [wsUrl, closeExistingConnection]);

  // Start HTTP heartbeat as soon as the hook is used
  useEffect(() => {
    // Start heartbeat immediately
    sendHeartbeat();
    // Set up interval for regular heartbeats (every 15 seconds)
    heartbeatIntervalRef.current = window.setInterval(sendHeartbeat, 15000);
    
    return () => clearTimers();
  }, [sendHeartbeat, clearTimers]);

  // Handle WebSocket connection separately
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      console.log("Cleaning up WebSocket connection");
      clearTimers();
      closeExistingConnection();
    };
  }, [sessionId, connectWebSocket, clearTimers, closeExistingConnection]);

  // Send a message over the WebSocket
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
      } catch (err) {
        console.error('Failed to send message:', err);
        setError(`Failed to send message: ${err}`);
      }
    } else {
      setError(`WebSocket is not connected. Current state: ${wsRef.current ? wsRef.current.readyState : 'null'}`);
    }
  }, []);

  return { isConnected, data, error, sendMessage, wsUrl };
};

export default useWebSocket; 