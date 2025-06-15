import { useMemo, memo, useRef, useEffect, useState } from 'react';
import { Group } from '@visx/group';
import { LinePath } from '@visx/shape';
import { scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { curveLinear } from '@visx/curve';
import DraggableWindow from './DraggableWindow';

interface DataPoint {
  x: number;
  y: number;
}

// Simplified peak detection for EKG BPM calculation - count points above 0
function detectPeaks(data: DataPoint[]): DataPoint[] {
  if (data.length < 50) return [];
  
  // Updated for 100Hz data (backend now uses 100Hz, not 250Hz)
  // At 100Hz: 1 second = 100 samples, so 0.2 seconds = 20 samples
  // For reliable peak detection, use smaller chunks to catch all peaks
  const chunkSize = 20; // About 0.2 seconds worth of data at 100Hz
  const peaks: DataPoint[] = [];
  
  for (let start = 0; start < data.length; start += chunkSize) {
    const end = Math.min(start + chunkSize, data.length);
    const chunk = data.slice(start, end);
    
    // Find the highest positive value in this chunk
    let maxPoint: DataPoint | null = null;
    let maxValue = 0;
    
    for (const point of chunk) {
      if (point.y > maxValue) {
        maxValue = point.y;
        maxPoint = point;
      }
    }
    
    if (maxPoint && maxValue > 0) {
      peaks.push(maxPoint);
    }
  }
  
  return peaks;
}

// Calculate BPM from detected peaks
function calculateBPM(peaks: DataPoint[]): number {
  if (peaks.length < 2) {
    return 0;
  }
  
  // Calculate intervals between consecutive peaks
  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    const interval = peaks[i].x - peaks[i - 1].x;
    // Filter out unreasonable intervals (too fast or too slow)
    if (interval >= 0.2 && interval <= 3.0) { // 20-300 BPM range
      intervals.push(interval);
    }
  }
  
  if (intervals.length === 0) {
    return 0;
  }
  
  // Use average interval for calculation
  const avgInterval = intervals.reduce((sum, int) => sum + int, 0) / intervals.length;
  const bpm = 60 / avgInterval;
  
  // Return rounded BPM, clamped to reasonable range
  return Math.round(Math.max(20, Math.min(300, bpm)));
}

// Get axis labels for each signal type
function getAxisLabels(signalType: string): { xLabel: string; yLabel: string } {
  switch (signalType) {
    case 'blood_pressure':
      return { xLabel: 'Time (seconds)', yLabel: 'ABP (mmHg)' };
    case 'brain':
      return { xLabel: 'Time (seconds)', yLabel: 'ICP (mmHg)' };
    case 'heart':
      return { xLabel: 'Time (seconds)', yLabel: 'Amplitude (mV)' };
    case 'temperature':
      return { xLabel: 'Time (seconds)', yLabel: 'Temperature (°C)' };
    case 'lungs':
      return { xLabel: 'Time (seconds)', yLabel: 'Amplitude' };
    default:
      return { xLabel: 'Time (seconds)', yLabel: 'Value' };
  }
}

// Get display value for each signal type
function getValueDisplay(signalType: string, calculatedValue: number, visibleData: DataPoint[]): string {
  if (visibleData.length === 0) return '';

  switch (signalType) {
    case 'blood_pressure': {
      return `${calculatedValue.toFixed(1)} mmHg`;
    }
    case 'brain': {
      return `${calculatedValue.toFixed(1)} mmHg`;
    }
    case 'heart': {
      return `${calculatedValue} BPM`;
    }
    case 'temperature': {
      return `${calculatedValue.toFixed(1)}°C`;
    }
    case 'lungs': {
      // For lungs, show current value
      const currentLungValue = visibleData[visibleData.length - 1]?.y || 0;
      return `${currentLungValue.toFixed(1)}`;
    }
    default: {
      const currentValue = visibleData[visibleData.length - 1]?.y || 0;
      return `${currentValue.toFixed(1)}`;
    }
  }
}

interface SignalWindowProps {
  signalType: string;
  data: DataPoint[];
  color: string;
  title: string;
  icon: string;
  onClose: () => void;
  initialPosition?: { x: number, y: number };
  zIndex: number;
  onFocus: () => void;
  onPositionChange?: (position: { x: number, y: number }) => void;
  displayWindow: number;
  dimensions?: { width: number; height: number }; // Custom window dimensions
}

const SignalWindow = ({
  signalType,
  data,
  color,
  title,
  icon,
  onClose,
  initialPosition,
  zIndex,
  onFocus,
  onPositionChange,
  displayWindow,
  dimensions
}: SignalWindowProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 268, height: 168 });

  // Use ResizeObserver to detect container size changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        
        // Responsive scaling based on screen size
        const isLargeScreen = window.innerWidth >= 1300;
        const minWidth = isLargeScreen ? 400 : 268;
        const minHeight = isLargeScreen ? 320 : 214;
        const widthPadding = isLargeScreen ? 10 : 7;
        const heightPadding = isLargeScreen ? 90 : 60;
        
        // Give the chart more space - account for info panel and margins for labels
        setChartDimensions({
          width: Math.max(minWidth, width - widthPadding),
          height: Math.max(minHeight, height - heightPadding)
        });
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Chart dimensions based on container size - responsive margins
  const isLargeScreen = window.innerWidth >= 1300;
  const margin = isLargeScreen 
    ? { top: 20, right: 20, bottom: 55, left: 55 }  // Original size for PC
    : { top: 13, right: 13, bottom: 37, left: 37 }; // Smaller size for iPad
  const innerWidth = chartDimensions.width - margin.left - margin.right;
  const innerHeight = chartDimensions.height - margin.top - margin.bottom;

  // Filter data to show only the display window - optimized for performance
  const visibleData = useMemo(() => {
    if (data.length === 0) return [];
    
    const latestTime = data[data.length - 1].x;
    const cutoffTime = latestTime - displayWindow;
    
    // More efficient filtering - since data is already sorted, use binary search
    let startIndex = 0;
    let left = 0;
    let right = data.length - 1;
    
    // Binary search for cutoff point
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (data[mid].x < cutoffTime) {
        startIndex = mid + 1;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    // Return slice without additional sorting since data is already sorted
    return data.slice(startIndex);
  }, [data, displayWindow]);

  // Create scales - memoized for performance with better optimization
  const scales = useMemo(() => {
    if (visibleData.length === 0) {
      return {
        xScale: scaleLinear({ range: [0, innerWidth], domain: [0, 1] }),
        yScale: scaleLinear({ range: [innerHeight, 0], domain: [0, 1] })
      };
    }

    // Use a stable time window instead of recalculating based on first/last points
    // This prevents the "rollback" artifacts when new points are added
    const latestTime = visibleData[visibleData.length - 1].x;
    const stableXExtent = [latestTime - displayWindow, latestTime];
    
    // More efficient min/max calculation using reduce
    const { yMin, yMax } = visibleData.reduce(
      (acc, point) => ({
        yMin: Math.min(acc.yMin, point.y),
        yMax: Math.max(acc.yMax, point.y)
      }),
      { yMin: visibleData[0].y, yMax: visibleData[0].y }
    );

    // Add some padding to y-axis
    const yRange = yMax - yMin;
    const yPadding = yRange > 0 ? yRange * 0.1 : 1;
    
    return {
      xScale: scaleLinear({
        range: [0, innerWidth],
        domain: stableXExtent
      }),
      yScale: scaleLinear({
        range: [innerHeight, 0],
        domain: [yMin - yPadding, yMax + yPadding]
      })
    };
  }, [visibleData, innerWidth, innerHeight, displayWindow]);

  // Memoized accessor functions with better caching
  const accessors = useMemo(() => ({
    getX: (d: DataPoint) => scales.xScale(d.x),
    getY: (d: DataPoint) => scales.yScale(d.y)
  }), [scales.xScale, scales.yScale]); // More specific dependencies

  // Simple pathological detection - no complex debouncing, just basic thresholds
  const pathologicalStatus = useMemo(() => {
    if (visibleData.length === 0) return { isPathological: false, value: 0 };

    switch (signalType) {
      case 'blood_pressure': {
        const meanABP = visibleData.reduce((sum, point) => sum + point.y, 0) / visibleData.length;
        return {
          isPathological: meanABP > 120, // Higher threshold with buffer
          value: meanABP
        };
      }
      
      case 'brain': {
        const meanICP = visibleData.reduce((sum, point) => sum + point.y, 0) / visibleData.length;
        return {
          isPathological: meanICP > 20, // Higher threshold with buffer
          value: meanICP
        };
      }
      
      case 'heart': {
        if (visibleData.length < 50) return { isPathological: false, value: 0 };
        const peaks = detectPeaks(visibleData);
        const bpm = calculateBPM(peaks);
        return {
          isPathological: bpm < 50 || bpm > 120, // More extreme thresholds
          value: bpm
        };
      }
      
      case 'temperature': {
        const meanTemp = visibleData.reduce((sum, point) => sum + point.y, 0) / visibleData.length;
        return {
          isPathological: meanTemp > 39.5 || meanTemp < 34.5, // More extreme thresholds
          value: meanTemp
        };
      }
      
      default:
        return { isPathological: false, value: 0 };
    }
  }, [visibleData, signalType]);

  // Get axis labels for this signal type
  const axisLabels = getAxisLabels(signalType);

  return (
    <DraggableWindow
      title={title}
      icon={icon}
      onClose={onClose}
      initialPosition={initialPosition}
      zIndex={zIndex}
      onFocus={onFocus}
      onPositionChange={onPositionChange}
      dimensions={dimensions}
    >
      <div 
        ref={containerRef}
        style={{ 
          width: '100%', 
          height: '100%',
          minHeight: isLargeScreen ? '260px' : '174px', // Responsive min height
          display: 'flex',
          flexDirection: 'column',
          background: '#fafafa',
          borderRadius: isLargeScreen ? '8px' : '5px', // Responsive border radius
          overflow: 'hidden',
          position: 'relative', // For absolute positioning of overlays
          // Add pathological styling here instead of on DraggableWindow
          border: pathologicalStatus.isPathological ? '2px solid rgba(239, 68, 68, 0.5)' : 'none',
          boxShadow: pathologicalStatus.isPathological 
            ? isLargeScreen 
              ? '0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 0 rgba(239, 68, 68, 0.7)' // PC size
              : '0 13px 27px rgba(0, 0, 0, 0.15), 0 0 0 0 rgba(239, 68, 68, 0.7)' // iPad size
            : 'none',
          animation: pathologicalStatus.isPathological ? 'pathologicalPulse 2s infinite ease-in-out' : 'none'
        }}
      >
        {/* Chart container - takes full height */}
        <div style={{ 
          flex: 1, 
          padding: isLargeScreen ? '10px' : '7px', // Responsive padding
          background: 'white',
          borderRadius: isLargeScreen ? '8px' : '5px', // Responsive border radius
          boxShadow: isLargeScreen 
            ? 'inset 0 1px 3px rgba(0,0,0,0.1)' // PC size
            : 'inset 0 1px 2px rgba(0,0,0,0.1)', // iPad size
          position: 'relative'
        }}>
          {/* Permanent value display - top right corner */}
          <div style={{
            position: 'absolute',
            top: isLargeScreen ? '15px' : '10px', // Responsive positioning
            right: isLargeScreen ? '15px' : '10px', // Responsive positioning
            background: pathologicalStatus.isPathological 
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.9))' 
              : 'rgba(255, 255, 255, 0.95)',
            color: pathologicalStatus.isPathological ? '#ffffff' : '#374151',
            padding: isLargeScreen ? '8px 12px' : '5px 8px', // Responsive padding
            borderRadius: isLargeScreen ? '8px' : '5px', // Responsive border radius
            fontSize: isLargeScreen ? '14px' : '9px', // Responsive font size
            fontWeight: '600',
            border: pathologicalStatus.isPathological 
              ? '2px solid rgba(239, 68, 68, 0.8)' 
              : '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: pathologicalStatus.isPathological 
              ? isLargeScreen
                ? '0 4px 12px rgba(239, 68, 68, 0.3), 0 0 0 1px rgba(239, 68, 68, 0.2)' // PC size
                : '0 3px 8px rgba(239, 68, 68, 0.3), 0 0 0 1px rgba(239, 68, 68, 0.2)' // iPad size
              : isLargeScreen
                ? '0 2px 8px rgba(0, 0, 0, 0.1)' // PC size
                : '0 1px 5px rgba(0, 0, 0, 0.1)', // iPad size
            zIndex: 10,
            backdropFilter: 'blur(8px)',
            animation: pathologicalStatus.isPathological ? 'flash 1.5s infinite ease-in-out' : 'none'
          }}>
            {getValueDisplay(signalType, pathologicalStatus.value, visibleData)}
          </div>

          {/* Loading indicator when no data */}
          {data.length === 0 && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 5
            }}>
              {/* Loading circle */}
              <div style={{
                width: isLargeScreen ? '48px' : '32px', // Responsive size
                height: isLargeScreen ? '48px' : '32px', // Responsive size
                border: isLargeScreen ? '4px solid #f3f4f6' : '3px solid #f3f4f6', // Responsive border
                borderTop: isLargeScreen ? `4px solid ${color}` : `3px solid ${color}`, // Responsive border
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: isLargeScreen ? '12px' : '8px' // Responsive margin
              }}></div>
              {/* Loading text */}
              <div style={{
                color: '#6b7280',
                fontSize: isLargeScreen ? '14px' : '9px', // Responsive font size
                fontWeight: '500',
                textAlign: 'center'
              }}>
                Waiting for signal data...
              </div>
            </div>
          )}

          <svg width={chartDimensions.width} height={chartDimensions.height}>
            <Group left={margin.left} top={margin.top}>
              {/* Background */}
              <rect
                width={innerWidth}
                height={innerHeight}
                fill="white"
                stroke="#e0e0e0"
                strokeWidth={1}
              />
              
              {/* Grid */}
              <GridRows
                scale={scales.yScale}
                width={innerWidth}
                strokeDasharray="1,3"
                stroke="#f0f0f0"
                strokeOpacity={0.8}
              />
              <GridColumns
                scale={scales.xScale}
                height={innerHeight}
                strokeDasharray="1,3"
                stroke="#f0f0f0"
                strokeOpacity={0.8}
              />
              
              {/* Signal line */}
              {visibleData.length > 1 && (
                <LinePath
                  data={visibleData}
                  x={accessors.getX}
                  y={accessors.getY}
                  stroke={color}
                  strokeWidth={isLargeScreen ? 2.5 : 1.7} // Responsive stroke width
                  curve={curveLinear}
                  fill="none"
                  style={{
                    filter: isLargeScreen 
                      ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' // PC size
                      : 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))' // iPad size
                  }}
                />
              )}
              
              {/* Axes */}
              <AxisBottom
                top={innerHeight}
                scale={scales.xScale}
                numTicks={Math.max(3, Math.floor(innerWidth / (isLargeScreen ? 80 : 53)))} // Responsive tick spacing
                stroke="#666"
                tickStroke="#666"
                label={axisLabels.xLabel}
                tickLabelProps={{
                  fill: '#666',
                  fontSize: isLargeScreen ? 11 : 7, // Responsive font size
                  textAnchor: 'middle',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
                labelProps={{
                  fill: '#666',
                  fontSize: isLargeScreen ? 12 : 8, // Responsive font size
                  textAnchor: 'middle',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
              />
              <AxisLeft
                scale={scales.yScale}
                numTicks={Math.max(3, Math.floor(innerHeight / (isLargeScreen ? 40 : 27)))} // Responsive tick spacing
                stroke="#666"
                tickStroke="#666"
                label={axisLabels.yLabel}
                tickLabelProps={{
                  fill: '#666',
                  fontSize: isLargeScreen ? 11 : 7, // Responsive font size
                  textAnchor: 'end',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
                labelProps={{
                  fill: '#666',
                  fontSize: isLargeScreen ? 12 : 8, // Responsive font size
                  textAnchor: 'middle',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
              />
            </Group>
          </svg>
        </div>
      </div>
    </DraggableWindow>
  );
};

SignalWindow.displayName = 'SignalWindow';

// Custom comparison function to prevent unnecessary re-renders
const arePropsEqual = (prevProps: SignalWindowProps, nextProps: SignalWindowProps) => {
  // Compare primitive props
  if (
    prevProps.signalType !== nextProps.signalType ||
    prevProps.color !== nextProps.color ||
    prevProps.title !== nextProps.title ||
    prevProps.icon !== nextProps.icon ||
    prevProps.zIndex !== nextProps.zIndex ||
    prevProps.displayWindow !== nextProps.displayWindow
  ) {
    return false;
  }

  // Compare data arrays by length and last few points (shallow comparison)
  if (prevProps.data.length !== nextProps.data.length) {
    return false;
  }
  
  // Only compare the last 10 points to avoid deep comparison
  const prevLast = prevProps.data.slice(-10);
  const nextLast = nextProps.data.slice(-10);
  if (prevLast.length !== nextLast.length) {
    return false;
  }
  
  for (let i = 0; i < prevLast.length; i++) {
    if (prevLast[i].x !== nextLast[i].x || prevLast[i].y !== nextLast[i].y) {
      return false;
    }
  }

  // Compare dimensions
  if (
    prevProps.dimensions?.width !== nextProps.dimensions?.width ||
    prevProps.dimensions?.height !== nextProps.dimensions?.height
  ) {
    return false;
  }

  // Compare position
  if (
    prevProps.initialPosition?.x !== nextProps.initialPosition?.x ||
    prevProps.initialPosition?.y !== nextProps.initialPosition?.y
  ) {
    return false;
  }

  // Function props are assumed to be stable (they should be)
  return true;
};

export default memo(SignalWindow, arePropsEqual); 