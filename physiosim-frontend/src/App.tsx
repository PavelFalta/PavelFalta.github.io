import { useState, useEffect, useRef } from 'react'
import HumanBody from './components/HumanBody'
import SignalWindow from './components/SignalWindow'
import './App.css'

interface DataPoint {
  x: number;
  y: number;
}

interface SignalData {
  new_data: DataPoint[];
  color: string;
  params: {
    amplitude: number;
    frequency: number;
  };
}

// We'll keep accumulated data points in a separate buffer
interface SignalBuffer {
  [signalType: string]: {
    data: DataPoint[];
    color: string;
  }
}

interface WindowPosition {
  x: number;
  y: number;
}

interface WindowState {
  signalType: string;
  position: WindowPosition;
  zIndex: number;
  isDragged?: boolean; // Track if window has been manually positioned
  dimensions?: { width: number; height: number }; // Custom dimensions per signal type
}

// Animation queue for point-by-point rendering - now per signal
interface QueuedDataPoint extends DataPoint {
  signalType: string;
  color: string;
  animationTime?: number; // When this point should be displayed in animation time
}

// Per-signal animation state - optimized
interface SignalAnimationState {
  queue: QueuedDataPoint[];
  speed: number;
  lastProcessTime: number;
  pointsProcessedInLastSecond: number;
  queueSizeHistory: { timestamp: number; size: number }[];
  // Add optimization fields
  lastDataUpdate: number;
  pendingPoints: number;
}

// Cycle information for adaptive timing
interface CycleInfo {
  cycleId: string;
  signalType: string;
  points: DataPoint[];
  color: string;
  receivedAt: number; // timestamp when cycle was received
  duration?: number; // calculated duration based on next cycle timing
}

// Available signal types matching the backend
const SIGNAL_TYPES = {
  "heart": { label: "Electrocardiogram (EKG)", icon: "💓" },
  "lungs": { label: "Respiratory", icon: "🫁" },
  "blood_pressure": { label: "Arterial Blood Pressure (ABP)", icon: "🩸" },
  "brain": { label: "Intracranial Pressure (ICP)", icon: "🧠" },
  "temperature": { label: "Body Temperature", icon: "🌡️" }
}

// Fixed display window in seconds (general signals)
const DISPLAY_WINDOW = 10.0;

// Blood pressure specific display window (longer to show fewer cycles)
const BP_DISPLAY_WINDOW = 10.0;

// Buffer size - how much data to keep in memory (in seconds)
const BUFFER_SIZE = 10.0;

function App() {
  const [activeSignals, setActiveSignals] = useState<string[]>(['blood_pressure', 'brain', 'heart']); // Auto-open ABP, ICP, and EKG
  const [connected, setConnected] = useState<boolean>(false);
  const [clientId] = useState<string>(`user-${Math.floor(Math.random() * 1000)}`);
  
  // Global amplitude and frequency controls
  const [globalAmplitude, setGlobalAmplitude] = useState<number>(100);
  const [globalFrequency, setGlobalFrequency] = useState<number>(1.0);
  
  // Autoregulation control state
  const [autoregulationEnabled, setAutoregulationEnabled] = useState<boolean>(true);
  
  // Debug panel state - commented out for now
  // const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  
  // Performance optimization - use refs for animation data - now per signal
  const signalAnimationStatesRef = useRef<Record<string, SignalAnimationState>>({});
  const cycleBufferRef = useRef<CycleInfo[]>([]);
  
  // Rolling average for queue size - track buffer size over time
  const ROLLING_AVERAGE_WINDOW = 5000; // 5 seconds
  
  // Convert frequency to heart rate for display
  const heartRate = Math.round(globalFrequency * 60);
  
  // Window management - auto-open both blood pressure and brain windows with relative positioning
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [nextZIndex, setNextZIndex] = useState<number>(102);
  
  // Data buffer for accumulated signal data
  const [dataBuffer, setDataBuffer] = useState<SignalBuffer>({});
  
  const ws = useRef<WebSocket | null>(null);
  const animationTimerRef = useRef<number | null>(null);

  // Function to update and get rolling average queue size
  const updateAndGetAverageQueueSize = (currentQueueSize: number, currentTime: number, signalType: string): number => {
    // Ensure signal animation state exists
    if (!signalAnimationStatesRef.current[signalType]) {
      signalAnimationStatesRef.current[signalType] = {
        queue: [],
        speed: 50,
        lastProcessTime: 0,
        pointsProcessedInLastSecond: 0,
        queueSizeHistory: [],
        lastDataUpdate: 0,
        pendingPoints: 0
      };
    }
    
    // Add current measurement
    signalAnimationStatesRef.current[signalType].queueSizeHistory.push({ timestamp: currentTime, size: currentQueueSize });
    
    // Remove measurements older than the rolling window
    const cutoffTime = currentTime - ROLLING_AVERAGE_WINDOW;
    signalAnimationStatesRef.current[signalType].queueSizeHistory = signalAnimationStatesRef.current[signalType].queueSizeHistory.filter(
      entry => entry.timestamp >= cutoffTime
    );
    
    // Calculate average
    if (signalAnimationStatesRef.current[signalType].queueSizeHistory.length === 0) return 0;
    
    const totalSize = signalAnimationStatesRef.current[signalType].queueSizeHistory.reduce((sum, entry) => sum + entry.size, 0);
    const averageSize = totalSize / signalAnimationStatesRef.current[signalType].queueSizeHistory.length;
    
    return averageSize;
  };

  // Animation system - processes queue and adds points gradually - now per signal
  useEffect(() => {
    let lastPerformanceCheck = 0;
    let pageHidden = false;

    // Handle page visibility changes to prevent animation issues when tab is minimized
    const handleVisibilityChange = () => {
      pageHidden = document.hidden;
      if (!pageHidden) {
        // Page became visible again - reset timing for all signals to prevent burst updates
        const currentTime = performance.now();
        Object.keys(signalAnimationStatesRef.current).forEach(signalType => {
          if (signalAnimationStatesRef.current[signalType]) {
            signalAnimationStatesRef.current[signalType].lastProcessTime = currentTime;
            // Clear queued points with old animation times to prevent artifacts
            signalAnimationStatesRef.current[signalType].queue = signalAnimationStatesRef.current[signalType].queue.filter(
              point => !point.animationTime || point.animationTime > currentTime - 1000 // Keep only points from last second
            );
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const animate = (currentTime: number) => {
      // Skip animation processing if page is hidden to prevent accumulation
      if (pageHidden) {
        animationTimerRef.current = requestAnimationFrame(animate);
        return;
      }

      // Initialize timing on first frame
      if (lastPerformanceCheck === 0) {
        lastPerformanceCheck = currentTime;
      }

      // Batch updates for better performance
      const batchUpdates: { [signalType: string]: DataPoint[] } = {};
      let hasBatchUpdates = false;

      // Process each active signal independently
      activeSignals.forEach(signalType => {
        // Ensure signal animation state exists
        if (!signalAnimationStatesRef.current[signalType]) {
          signalAnimationStatesRef.current[signalType] = {
            queue: [],
            speed: 50,
            lastProcessTime: currentTime,
            pointsProcessedInLastSecond: 0,
            queueSizeHistory: [],
            lastDataUpdate: 0,
            pendingPoints: 0
          };
        }

        const signalState = signalAnimationStatesRef.current[signalType];
        const timeSinceLastPoint = currentTime - signalState.lastProcessTime;
        const msPerPoint = 1000 / signalState.speed;

        if (timeSinceLastPoint >= msPerPoint && signalState.queue.length > 0) {
          // Find points that are ready to be displayed based on animationTime
          const readyPoints = signalState.queue.filter(point => 
            !point.animationTime || (currentTime >= point.animationTime)
          );
          
          if (readyPoints.length > 0) {
            // Calculate how many ready points we should process this frame
            const pointsToProcess = Math.floor(timeSinceLastPoint / msPerPoint);
            const actualPointsToProcess = Math.min(pointsToProcess, readyPoints.length, 10); // Limit to 10 points per frame for stability

            if (actualPointsToProcess > 0) {
              // Take the first ready points
              const pointsToAdd = readyPoints.slice(0, actualPointsToProcess);
              
              // Remove processed points from queue more efficiently
              const processedPointSet = new Set(pointsToAdd);
              signalState.queue = signalState.queue.filter(point => !processedPointSet.has(point));
              
              // Batch the points for a single state update
              batchUpdates[signalType] = pointsToAdd.map(p => ({ x: p.x, y: p.y }));
              hasBatchUpdates = true;
              
              // Update timing
              signalState.lastProcessTime = currentTime;
              signalState.pointsProcessedInLastSecond += actualPointsToProcess;
              signalState.pendingPoints = signalState.queue.length;
            }
          }
        }
      });

      // Single batched state update for better performance
      if (hasBatchUpdates) {
        setDataBuffer(prevBuffer => {
          const newBuffer = { ...prevBuffer };
          
          Object.entries(batchUpdates).forEach(([signalType, newPoints]) => {
            if (!newBuffer[signalType]) {
              // Get color from the animation state or use a default
              const firstQueuedPoint = signalAnimationStatesRef.current[signalType]?.queue[0];
              newBuffer[signalType] = {
                data: [],
                color: firstQueuedPoint?.color || "#888888"
              };
            }
            
            // Pre-sort new points and merge efficiently
            newPoints.sort((a, b) => a.x - b.x);
            
            // Use a more efficient merge approach
            const existingData = newBuffer[signalType].data;
            if (existingData.length === 0) {
              newBuffer[signalType].data = newPoints;
            } else {
              // Find insertion point for better performance
              const lastExistingTime = existingData[existingData.length - 1].x;
              const firstNewTime = newPoints[0].x;
              
              if (firstNewTime >= lastExistingTime) {
                // Append case - most common
                newBuffer[signalType].data = [...existingData, ...newPoints];
              } else {
                // Need to merge - less common
                newBuffer[signalType].data = [...existingData, ...newPoints].sort((a, b) => a.x - b.x);
              }
            }
            
            // More efficient trimming - only when necessary
            const dataLength = newBuffer[signalType].data.length;
            if (dataLength > 1200) { // Increased threshold for less frequent trimming
              const newestTime = newBuffer[signalType].data[dataLength - 1].x;
              const cutoffTime = newestTime - BUFFER_SIZE;
              
              // Use binary search for efficient trimming
              let trimIndex = 0;
              for (let i = 0; i < dataLength; i++) {
                if (newBuffer[signalType].data[i].x >= cutoffTime) {
                  trimIndex = i;
                  break;
                }
              }
              
              if (trimIndex > 0) {
                newBuffer[signalType].data = newBuffer[signalType].data.slice(trimIndex);
              }
            }
          });
          
          return newBuffer;
        });
      }

      // Performance logging - reduced frequency
      if (currentTime - lastPerformanceCheck >= 5000) { // Every 5 seconds instead of 1
        activeSignals.forEach(signalType => {
          const signalState = signalAnimationStatesRef.current[signalType];
          if (signalState) {
            signalState.pointsProcessedInLastSecond = 0;
          }
        });
        lastPerformanceCheck = currentTime;
      }

      // Continue animation loop
      animationTimerRef.current = requestAnimationFrame(animate);
    };

    // Start the animation
    animationTimerRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationTimerRef.current) {
        cancelAnimationFrame(animationTimerRef.current);
        animationTimerRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeSignals]); // Restart when active signals change

  useEffect(() => {
    // Setup WebSocket connection
    const connectWebSocket = () => {
      const socket = new WebSocket(`wss://page-backend-production.up.railway.app/ws/${clientId}`);
      
      socket.onopen = () => {
        setConnected(true);
        
        // Send complete initial state immediately to start data flow
        const signalParams: Record<string, { amplitude: number; frequency: number }> = {};
        activeSignals.forEach(signal => {
          signalParams[signal] = {
            amplitude: globalAmplitude,
            frequency: globalFrequency
          };
        });
        
        socket.send(JSON.stringify({ 
          active_signals: activeSignals,
          signal_params: signalParams,
          autoregulation: autoregulationEnabled
        }));
      };
      
      socket.onmessage = (event) => {
        const receivedData = JSON.parse(event.data);
        
        // Handle autoregulation status from server
        if (receivedData.autoregulation !== undefined) {
          setAutoregulationEnabled(receivedData.autoregulation);
        }
        
        if (receivedData.signals) {
          // DON'T update signalsData immediately - this causes instant display
          // setSignalsData(receivedData.signals);
          
          const currentTime = performance.now();
          
          // Process cycles with adaptive timing
          const currentCycles = [...cycleBufferRef.current];
          
            Object.entries(receivedData.signals).forEach(([signalType, signalData]) => {
              const typedSignalData = signalData as SignalData;
              
              // Ensure signal animation state exists
              if (!signalAnimationStatesRef.current[signalType]) {
                signalAnimationStatesRef.current[signalType] = {
                  queue: [],
                  speed: 50,
                  lastProcessTime: 0,
                  pointsProcessedInLastSecond: 0,
                  queueSizeHistory: [],
                  lastDataUpdate: 0,
                  pendingPoints: 0
                };
              }
              
            if (typedSignalData.new_data && typedSignalData.new_data.length > 0) {
              // Create a new cycle
              const newCycle: CycleInfo = {
                cycleId: `${signalType}-${currentTime}`,
                signalType,
                points: typedSignalData.new_data,
                color: typedSignalData.color,
                receivedAt: currentTime
              };
              
              // Find the previous cycle for this signal type
              let prevCycleIndex = -1;
              for (let i = currentCycles.length - 1; i >= 0; i--) {
                if (currentCycles[i].signalType === signalType && !currentCycles[i].duration) {
                  prevCycleIndex = i;
                  break;
                }
              }
              
              if (prevCycleIndex !== -1) {
                // Calculate duration for the previous cycle
                const prevCycle = currentCycles[prevCycleIndex];
                const timeDiff = currentTime - prevCycle.receivedAt;
                prevCycle.duration = timeDiff;
                
                // Add previous cycle points to animation queue
                const pointsPerMs = prevCycle.points.length / timeDiff;
                
                // Calculate baseline speed from cycle timing
                const baselineSpeed = pointsPerMs * 1000;
                
                // Get current queue size and calculate rolling average
                const currentQueueSize = signalAnimationStatesRef.current[signalType].queue.length;
                const averageQueueSize = updateAndGetAverageQueueSize(currentQueueSize, currentTime, signalType);
                
                // Calculate queue pressure factor based on rolling average - increases speed when queue gets large
                // Target queue size: 0 points (immediate processing)
                // Max queue size: 1000 points (before trimming)
                const targetQueueSize = 0;
                const maxQueueSize = 1000;
                
                let queuePressureFactor = 1.0;
                if (averageQueueSize > targetQueueSize) {
                  // Increase speed linearly as average queue grows beyond target
                  // At max queue size, speed is 3x baseline
                  const pressureRatio = Math.min(1.0, (averageQueueSize - targetQueueSize) / (maxQueueSize - targetQueueSize));
                  queuePressureFactor = 1.0 + (pressureRatio * 2.0); // 1.0 to 3.0 multiplier
                }
                
                // Apply queue pressure to baseline speed
                const adaptiveSpeed = Math.max(10, Math.min(500, baselineSpeed * queuePressureFactor));
                
                // Batch create cycle points for better performance
                const cyclePoints: QueuedDataPoint[] = new Array(prevCycle.points.length);
                const timeIncrement = timeDiff / prevCycle.points.length;
                
                for (let i = 0; i < prevCycle.points.length; i++) {
                  cyclePoints[i] = {
                    x: prevCycle.points[i].x,
                    y: prevCycle.points[i].y,
                    signalType: prevCycle.signalType,
                    color: prevCycle.color,
                    animationTime: currentTime + (i * timeIncrement)
                  };
                }
                
                // Add to queue more efficiently
                signalAnimationStatesRef.current[signalType].queue.push(...cyclePoints);
                
                // Limit queue size to prevent memory issues
                const queue = signalAnimationStatesRef.current[signalType].queue;
                if (queue.length > 2000) {
                  signalAnimationStatesRef.current[signalType].queue = queue.slice(-1000);
                }
                
                // Update animation speed
                signalAnimationStatesRef.current[signalType].speed = adaptiveSpeed;
              }
              
              // Add new cycle to buffer
              currentCycles.push(newCycle);
            }
          });
          
          // Update cycle buffer ref
          cycleBufferRef.current = currentCycles.slice(-50); // Keep last 50 cycles
        }
      };
      
      socket.onclose = () => {
        setConnected(false);
        // Attempt to reconnect after a delay
        setTimeout(connectWebSocket, 3000);
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        socket.close();
      };
      
      ws.current = socket;
    };
    
    connectWebSocket();
    
    // Cleanup on unmount
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [clientId]);
  
  // Send updated state to server when active signals or global parameters change
  useEffect(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      // Create signal params for each active signal using global settings
      const signalParams: Record<string, { amplitude: number; frequency: number }> = {};
      activeSignals.forEach(signal => {
        signalParams[signal] = {
          amplitude: globalAmplitude,
          frequency: globalFrequency
        };
      });
      
      ws.current.send(JSON.stringify({ 
        active_signals: activeSignals,
        signal_params: signalParams,
        autoregulation: autoregulationEnabled
      }));
    }
  }, [activeSignals, globalAmplitude, globalFrequency, autoregulationEnabled]);

  const toggleSignal = (signalType: string) => {
    if (activeSignals.includes(signalType)) {
      // Signal is already active, don't do anything
      // The window is closed by closeWindow function
      return;
    } else {
      // Add to active signals
      setActiveSignals(prev => [...prev, signalType]);
      
      // Initialize animation state for this signal
      if (!signalAnimationStatesRef.current[signalType]) {
        signalAnimationStatesRef.current[signalType] = {
          queue: [],
          speed: 50,
          lastProcessTime: 0,
          pointsProcessedInLastSecond: 0,
          queueSizeHistory: [],
          lastDataUpdate: 0,
          pendingPoints: 0
        };
      }
      
      // Use calculated position instead of random offset
      const position = calculateRelativePosition(signalType);
      const dimensions = calculateWindowDimensions(signalType);
      
      // Create a new window
      setWindows(prev => [
        ...prev,
        {
          signalType,
          position,
          dimensions,
          zIndex: nextZIndex
        }
      ]);
      
      // Increment next z-index
      setNextZIndex(prev => prev + 1);
    }
  };

  const closeWindow = (signalType: string) => {
    // Remove from active signals
    setActiveSignals(prev => prev.filter(s => s !== signalType));
    
    // Remove the window
    setWindows(prev => prev.filter(w => w.signalType !== signalType));
    
    // Clear any queued data for this signal from refs
    if (signalAnimationStatesRef.current[signalType]) {
      signalAnimationStatesRef.current[signalType].queue = [];
      // Remove the animation state entirely
      delete signalAnimationStatesRef.current[signalType];
    }
    
    // Clear cycle buffer for this signal
    cycleBufferRef.current = cycleBufferRef.current.filter(cycle => cycle.signalType !== signalType);
    
    // Clear displayed data for this signal
    setDataBuffer(prev => {
      const newBuffer = { ...prev };
      delete newBuffer[signalType];
      return newBuffer;
    });
  };
  
  const focusWindow = (signalType: string) => {
    // Bring window to front by updating its z-index
    setWindows(prev => {
      const newWindows = [...prev];
      const windowIndex = newWindows.findIndex(w => w.signalType === signalType);
      
      if (windowIndex !== -1) {
        newWindows[windowIndex] = {
          ...newWindows[windowIndex],
          zIndex: nextZIndex
        };
        setNextZIndex(prev => prev + 1);
      }
      
      return newWindows;
    });
  };

  const handleAmplitudeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalAmplitude(Number(e.target.value));
  };

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert heart rate slider value to frequency
    // Frequency is stored in Hz, but displayed as BPM (heart rate)
    const heartRateValue = Number(e.target.value);
    setGlobalFrequency(heartRateValue / 60);
  };

  // Calculate custom window dimensions for different signal types
  const calculateWindowDimensions = (signalType: string) => {
    switch (signalType) {
      case 'blood_pressure':
        // Wider window for blood pressure to show detailed waveforms
        return { width: 720, height: 380 };
      case 'brain':
        // Taller window for brain signals to show frequency details
        return { width: 580, height: 380 };
      case 'heart':
        // Compact square-ish window for EKG
        return { width: 520, height: 380 };
      case 'temperature':
        // Smaller window for slow-changing temperature
        return { width: 480, height: 340 };
      case 'lungs':
        // Medium-wide window for respiratory signals
        return { width: 640, height: 390 };
      default:
        // Default dimensions
        return { width: 600, height: 400 };
    }
  };

  // Calculate positions as percentages to ensure windows stay on screen
  const calculateRelativePosition = (signalType: string) => {
    const windowDimensions = calculateWindowDimensions(signalType);
    const windowWidth = windowDimensions.width;
    const windowHeight = windowDimensions.height;
    const margin = 20; // Minimum margin from edges
    
    // Ensure we have valid viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Make sure window fits with margins
    const maxX = Math.max(margin, viewportWidth - windowWidth - margin);
    const maxY = Math.max(margin, viewportHeight - windowHeight - margin);
    
    if (signalType === 'blood_pressure') {
      // Position at bottom-left, but ensure it stays on screen
      return {
        x: margin,
        y: Math.min(maxY, Math.max(margin, viewportHeight - windowHeight - margin))
      };
    } else if (signalType === 'brain') {
      // Position at top-right, but ensure it stays on screen
      return {
        x: Math.min(maxX, Math.max(margin, viewportWidth - windowWidth - margin)),
        y: margin
      };
    } else if (signalType === 'heart') {
      // Position EKG at bottom-right
      return {
        x: Math.min(maxX, Math.max(margin, viewportWidth - windowWidth - margin)),
        y: Math.min(maxY, Math.max(margin, viewportHeight - windowHeight - margin))
      };
    }
    
    // Default center positioning for other windows
    return {
      x: Math.max(margin, Math.min(maxX, (viewportWidth - windowWidth) / 2)),
      y: Math.max(margin, Math.min(maxY, (viewportHeight - windowHeight) / 2))
    };
  };

  // Update window position after dragging
  const updateWindowPosition = (signalType: string, newPosition: WindowPosition) => {
    setWindows(prev => prev.map(window => 
      window.signalType === signalType 
        ? { ...window, position: newPosition, isDragged: true }
        : window
    ));
  };

  // Adjust window positions based on viewport size with proper bounds checking
  useEffect(() => {
    const adjustWindowPositions = () => {
      setWindows(prev => prev.map(windowState => {
        // Don't move windows that have been manually dragged
        if (windowState.isDragged) {
          return windowState;
        }
        
        const newPosition = calculateRelativePosition(windowState.signalType);
        return { ...windowState, position: newPosition };
      }));
    };
    
    // Adjust positions on mount and resize
    adjustWindowPositions();
    window.addEventListener('resize', adjustWindowPositions);
    
    return () => window.removeEventListener('resize', adjustWindowPositions);
  }, []);

  // Initialize windows with proper positions on first load
  useEffect(() => {
    if (windows.length === 0) {
      setWindows([
        {
          signalType: 'blood_pressure',
          position: calculateRelativePosition('blood_pressure'),
          dimensions: calculateWindowDimensions('blood_pressure'),
          zIndex: 100
        },
        {
          signalType: 'brain',
          position: calculateRelativePosition('brain'),
          dimensions: calculateWindowDimensions('brain'),
          zIndex: 101
        },
        {
          signalType: 'heart',
          position: calculateRelativePosition('heart'),
          dimensions: calculateWindowDimensions('heart'),
          zIndex: 102
        }
      ]);
    }
  }, []);

  return (
    <div className="canvas-container">
      {/* Human body in the center */}
      <div className="body-container">
        <HumanBody activeSignals={activeSignals} onToggleSignal={toggleSignal} />
      </div>
      
      {/* Global controls */}
      <div className="global-controls">
        {/* Connection status indicator inside controls */}
        <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}
             title={connected ? 'Connected to server' : 'Disconnected, attempting to reconnect...'}>
        </div>
        
        <div className="control-group">
          <label>Blood Pressure: {globalAmplitude} mmHg</label>
          <input 
            type="range" 
            min="50" 
            max="150" 
            value={globalAmplitude} 
            onChange={handleAmplitudeChange}
            className="slider large-slider"
          />
        </div>
        
        <div className="control-group">
          <label>Heart Rate: {heartRate} BPM</label>
          <input 
            type="range" 
            min="20" 
            max="200" 
            step="1" 
            value={heartRate} 
            onChange={handleFrequencyChange}
            className="slider large-slider"
          />
        </div>
        
        <div className="control-group">
          <label className="switch-label">
            Brain Autoregulation: {autoregulationEnabled ? 'Normal 🧠' : 'TBI Mode 🚨'}
          </label>
          <div className="switch-container">
            <label className="switch">
              <input 
                type="checkbox" 
                checked={autoregulationEnabled}
                onChange={(e) => setAutoregulationEnabled(e.target.checked)}
              />
              <span className="switch-slider"></span>
            </label>
          </div>
        </div>
        
        {/* Debug controls - commented out for now
        <div className="control-group">
          <button 
            className="debug-toggle"
            onClick={() => setShowDebugPanel(!showDebugPanel)}
          >
            {showDebugPanel ? '🔧 Hide Debug' : '🔧 Debug Info'}
          </button>
        </div>
        */}
      </div>
      
      {/* Debug panel - commented out for now
      {showDebugPanel && (
        <div className="debug-panel">
          <div className="debug-content">
            <div className="debug-title">🎯 Animation Debug</div>
            <div className="debug-info">
              {activeSignals.length > 0 ? (
                <>
                  {activeSignals.map(signal => {
                    const signalState = signalAnimationStatesRef.current[signal];
                    return signalState ? (
                      <div key={signal} className="debug-row">
                        <span className="signal-name">{signal}:</span>
                        <span className="signal-stats">
                          {signalState.speed.toFixed(1)} pts/sec | Queue: {signalState.queue.length}
                        </span>
                      </div>
                    ) : null;
                  })}
                  <div className="debug-row">
                    <span className="signal-name">Total Cycles:</span>
                    <span className="signal-stats">{cycleBufferRef.current.length}</span>
                  </div>
                </>
              ) : (
                <div className="debug-row">No active signals</div>
              )}
            </div>
          </div>
        </div>
      )}
      */}
      
      {/* Signal windows */}
      {windows.map(window => {
        const signalType = window.signalType;
        
        // Get accumulated data from buffer ONLY - no fallback to signalsData
        const bufferData = dataBuffer[signalType]?.data || [];
        const color = dataBuffer[signalType]?.color || "#888888"; // Default gray color
        const { label, icon } = SIGNAL_TYPES[signalType as keyof typeof SIGNAL_TYPES];
        
        // Use a longer display window for blood pressure
        const effectiveDisplayWindow = signalType === 'blood_pressure' ? BP_DISPLAY_WINDOW : DISPLAY_WINDOW;
        
        return (
          <SignalWindow
            key={`window-${signalType}`}
            signalType={signalType}
            data={bufferData}
            color={color}
            title={label}
            icon={icon}
            onClose={() => closeWindow(signalType)}
            initialPosition={window.position}
            zIndex={window.zIndex}
            onFocus={() => focusWindow(signalType)}
            onPositionChange={(newPosition) => updateWindowPosition(signalType, newPosition)}
            displayWindow={effectiveDisplayWindow}
            dimensions={window.dimensions}
          />
        );
      })}
      
      {/* Copyright footer */}
      <div className="copyright-footer">
        <span className="copyright-text">
          UJEP • ODAS 2025
        </span>
      </div>
    </div>
  );
}

export default App

