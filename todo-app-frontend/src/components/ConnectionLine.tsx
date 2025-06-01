import React from 'react';
import { motion } from 'framer-motion';

// Export the interface
export interface ConnectionLineProps {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    effectiveColor?: string;
    isCompletedConnection?: boolean; // Add a flag to indicate if this connects completed nodes
}

// Size of the nodes (assuming circular)

// Constants for shadow interpolation
const MIN_LINE_LENGTH = 25; // Approx diameter of node
const MAX_LINE_LENGTH = 300; // Max expected length for full fade
const MAX_SHADOW_BLUR = 5; // Blur for shortest lines
const MIN_SHADOW_BLUR = 10;  // Blur for longest lines
const MAX_SHADOW_SPREAD = 20; // Spread for shortest lines
const MIN_SHADOW_SPREAD = 2; // Spread for longest lines

// Black hole connection colors

const ConnectionLine: React.FC<ConnectionLineProps> = ({ 
    x1, 
    y1, 
    x2, 
    y2, 
    effectiveColor,
    isCompletedConnection = false 
}) => {
    // Use received coordinates directly as center points
    const startX = x1;
    const startY = y1;
    const endX = x2;
    const endY = y2;

    // Calculate line properties
    const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    const angleRad = Math.atan2(endY - startY, endX - startX);
    const angleDeg = angleRad * (180 / Math.PI);

    // --- Calculate Dynamic Shadow --- 
    // Normalize length within the defined range (0 = min length, 1 = max length)
    const normalizedLength = Math.max(0, Math.min(1, 
        (length - MIN_LINE_LENGTH) / (MAX_LINE_LENGTH - MIN_LINE_LENGTH)
    ));

    // Interpolate shadow parameters (longer length -> smaller shadow)
    const currentBlur = MAX_SHADOW_BLUR - (normalizedLength * (MAX_SHADOW_BLUR - MIN_SHADOW_BLUR));
    const currentSpread = MAX_SHADOW_SPREAD - (normalizedLength * (MAX_SHADOW_SPREAD - MIN_SHADOW_SPREAD));

    // Use adjusted styling for completed connections
    let activeColor = effectiveColor;
    
    if (isCompletedConnection && effectiveColor) {
        // For completed connections, use a more subtle, slightly darker version of the color
        const r = parseInt(effectiveColor.slice(1, 3), 16);
        const g = parseInt(effectiveColor.slice(3, 5), 16);
        const b = parseInt(effectiveColor.slice(5, 7), 16);
        
        // Use darker/more transparent color for completed connections
        activeColor = `rgba(${Math.floor(r*0.8)}, ${Math.floor(g*0.8)}, ${Math.floor(b*0.8)}, 0.6)`;
    }
    
    const dynamicBoxShadow = activeColor 
        ? `0 0 ${Math.round(currentBlur)}px ${Math.round(currentSpread)}px ${activeColor}` 
        : 'none';
    // --- End Calculate Dynamic Shadow --- 

    // Style for the line div
    const lineStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${startX}px`, // Position starts at the center of the first node
        top: `${startY}px`, // Position starts at the center of the first node
        width: `${length}px`,
        height: '0px', // Make line invisible by height
        backgroundColor: 'transparent',
        transform: `rotate(${angleDeg}deg)`,
        transformOrigin: '0 0', // Rotate around the starting point
        // Use the dynamically calculated shadow
        boxShadow: dynamicBoxShadow,
        zIndex: 0, // Behind nodes
        pointerEvents: 'none', // Don't interfere with interactions
        transition: 'box-shadow 0.3s ease', // Smooth transition for glow
        // Special styling for completed connections (dotted line)
        ...(isCompletedConnection ? {
            backgroundImage: `linear-gradient(to right, ${activeColor} 50%, transparent 50%)`,
            backgroundSize: '8px 1px',
            backgroundRepeat: 'repeat-x',
            opacity: 0.7,
            filter: 'blur(0.5px)'
        } : {})
    };

    // Don't render if color is missing or length is zero
    if (!activeColor || length === 0) {
        return null;
    }

    return (
        <motion.div 
            style={lineStyle} 
            initial={{ opacity: 0 }} 
            animate={{ 
                opacity: isCompletedConnection ? 0.7 : 0.7,
            }} 
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        />
    );
};

export default ConnectionLine; 