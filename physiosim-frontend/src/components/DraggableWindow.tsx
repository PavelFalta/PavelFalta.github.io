import { useState, useRef, ReactNode, useEffect } from 'react';
import './DraggableWindow.css';

interface DraggableWindowProps {
  title: string;
  icon?: string;
  children: ReactNode;
  onClose: () => void;
  initialPosition?: { x: number, y: number };
  zIndex?: number;
  onFocus?: () => void;
  onPositionChange?: (position: { x: number, y: number }) => void;
  dimensions?: { width: number; height: number }; // Custom window dimensions
  isPathological?: boolean; // Whether the window should show pathological state
}

const DraggableWindow = ({ 
  title, 
  icon, 
  children, 
  onClose, 
  initialPosition = { x: 100, y: 100 },
  zIndex = 10,
  onFocus,
  onPositionChange,
  dimensions = { width: 600, height: 400 }, // Default dimensions
  isPathological = false
}: DraggableWindowProps) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasBeenDragged, setHasBeenDragged] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);
  
  // Update position when initialPosition changes, but only if not currently dragging
  useEffect(() => {
    if (!isDragging && !hasBeenDragged) {
      setPosition(initialPosition);
    }
  }, [initialPosition, isDragging, hasBeenDragged]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (onFocus) onFocus();
    
    // Only start dragging if clicking on the title bar
    if ((e.target as HTMLElement).closest('.window-title-bar')) {
      setIsDragging(true);
      const { clientX, clientY } = e;
      const { left, top } = windowRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
      setDragOffset({
        x: clientX - left,
        y: clientY - top
      });
    }
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const { clientX, clientY } = e;
    const x = clientX - dragOffset.x;
    const y = clientY - dragOffset.y;
    
    // Ensure window stays within viewport using the passed dimensions
    const windowWidth = dimensions.width;
    const windowHeight = dimensions.height;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const newX = Math.max(0, Math.min(x, viewportWidth - windowWidth));
    const newY = Math.max(0, Math.min(y, viewportHeight - windowHeight));
    
    const newPosition = { x: newX, y: newY };
    setPosition(newPosition);
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
    setHasBeenDragged(true); // Mark as manually positioned
    // Notify parent of final position after dragging
    if (onPositionChange) {
      onPositionChange(position);
    }
  };
  
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);
  
  return (
    <div 
      ref={windowRef}
      className={`draggable-window ${collapsed ? 'collapsed' : ''} ${isPathological ? 'pathological' : ''}`}
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        zIndex
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="window-title-bar">
        {icon && <span className="window-icon">{icon}</span>}
        <div className="window-title">{title}</div>
        <div className="window-controls">
          <button className="window-button" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '□' : '_'}
          </button>
          <button className="window-button" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="window-content">
        {children}
      </div>
    </div>
  );
};

export default DraggableWindow; 