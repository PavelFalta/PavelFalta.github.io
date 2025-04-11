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
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 5000; // 5 seconds
  
  // Store the actual WebSocket URL for debugging
  const wsUrl = `${getWebSocketUrl()}/ws/${sessionId}`;

  // Function to close WebSocket connection
  const closeWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      wsRef.current.close(1000, 'Normal closure');
      wsRef.current = null;
    }
  }, []);

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

  // Function to clean up everything
  const cleanup = useCallback(() => {
    closeWebSocket();
    clearTimers();
  }, [closeWebSocket, clearTimers]);

  // Function to send HTTP heartbeat
  const sendHeartbeat = useCallback(async () => {
    try {
      await fetch(`${API_URL}/heartbeat`);
    } catch (err) {
      console.error('Heartbeat error:', err);
    }
  }, []);

  // Handle page visibility changes - keep both WebSocket and heartbeat alive
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Just send an immediate heartbeat when tab becomes visible
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sendHeartbeat]);

  // Handle beforeunload event - close when leaving the site
  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanup();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [cleanup]);

  // Handle navigation events using the History API - close when navigating away
  useEffect(() => {
    const handleNavigation = () => {
      cleanup();
    };

    window.addEventListener('popstate', handleNavigation);
    return () => {
      window.removeEventListener('popstate', handleNavigation);
    };
  }, [cleanup]);

  // Function to establish WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    // Close any existing connection first
    closeWebSocket();

    console.log(`Connecting to WebSocket at: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connection established');
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        if (message.type === 'update' && message.data) {
          setData(message.data);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      setError(`Failed to connect to the server at ${wsUrl}. Please try again later.`);
    };

    ws.onclose = (event) => {
      console.log(`WebSocket connection closed with code: ${event.code}, reason: ${event.reason}`);
      setIsConnected(false);
      wsRef.current = null;
      
      // Only attempt to reconnect if the closure wasn't intentional (not code 1000)
      // and if we're not in a hidden state (tab switched or screen locked)
      if (event.code !== 1000 && !document.hidden) {
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
  }, [wsUrl, closeWebSocket]);

  // Start HTTP heartbeat as soon as the hook is used
  useEffect(() => {
    sendHeartbeat();
    heartbeatIntervalRef.current = window.setInterval(sendHeartbeat, 15000);
    return () => clearTimers();
  }, [sendHeartbeat, clearTimers]);

  // Handle WebSocket connection
  useEffect(() => {
    connectWebSocket();
    return () => cleanup();
  }, [sessionId, connectWebSocket, cleanup]);

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