import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

interface ColorPickerPortalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

const ColorPickerPortal: React.FC<ColorPickerPortalProps> = ({ children, isOpen, onClose, triggerRef }) => {
  const portalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [hasPositioned, setHasPositioned] = useState(false);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX,
      });
      setHasPositioned(true);
    } else if (!isOpen) {
      setHasPositioned(false);
    }
  }, [isOpen, triggerRef]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleClickOutside = (event: MouseEvent) => {
      // If clicking inside the portal or its children, do nothing
      if (portalRef.current?.contains(event.target as Node)) {
        return;
      }
      
      // If clicking the trigger, do nothing
      if (triggerRef.current?.contains(event.target as Node)) {
        return;
      }

      // Only close if clicking outside both the portal and trigger
      onClose();
    };

    if (isOpen) {
      // Add a longer delay to ensure the click event on the color picker has time to process
      timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 200);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) {
    return null;
  }

  return ReactDOM.createPortal(
    <div
      ref={portalRef}
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 1000,
        visibility: hasPositioned ? 'visible' : 'hidden',
      }}
      onMouseDown={(e) => {
        // Prevent the click from reaching the document
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div 
        className="bg-gray-800 border border-gray-700 rounded-md shadow-2xl overflow-hidden"
        onMouseDown={(e) => {
          // Prevent the click from reaching the document
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default ColorPickerPortal; 