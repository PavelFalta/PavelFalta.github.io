import { forwardRef } from 'react';
import { motion } from 'framer-motion';

interface DeleteBinProps {
    isHovered?: boolean; // Add prop to indicate hover
}

const DeleteBin = forwardRef<HTMLDivElement, DeleteBinProps>(({ isHovered }, ref) => {
    // Simplified animation variants with linear transitions instead of spring
    // This helps prevent the animation glitches in Firefox
    const variants = {
        hidden: { 
            scale: 0, 
            opacity: 0,
            transition: { 
                duration: 0.2,
                ease: "easeOut"
            }
        },
        visible: { 
            scale: 1, 
            opacity: 1, 
            transition: { 
                duration: 0.3,
                ease: "easeOut"
            } 
        },
    };

    // Styling with colors that match the aesthetic
    const bgColor = 'bg-slate-900';
    const borderColor = 'border-red-600';
    const hoverBorderColor = 'border-red-400';
    const ariaLabel = 'Delete Task';

    // Glowing color
    const glowColor = 'rgba(220, 38, 38, 0.6)'; // Red for delete

    // Rotating animation for the effect
    const rotateVariants = {
        animate: {
            rotate: 360,
            transition: {
                duration: 15,
                ease: "linear",
                repeat: Infinity
            }
        }
    };

    return (
        <motion.div
            ref={ref}
            key="delete-bin"
            variants={variants}
            initial="hidden"
            animate={{
                scale: isHovered ? 1.25 : 1,
                opacity: 1,
                boxShadow: `0 0 ${isHovered ? '35px' : '20px'} ${isHovered ? '8px' : '5px'} ${glowColor}`,
            }}
            exit="hidden"
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                opacity: { duration: 0.3, ease: "easeOut" },
                scale: { type: "spring", stiffness: 300, damping: 15 },
                boxShadow: { duration: 0.2, ease: "easeOut" }
            }}
            className={`fixed bottom-6 left-1/4 -translate-x-1/2 z-40 p-6 ${bgColor} backdrop-blur-sm rounded-full shadow-lg border-2 ${borderColor} transition-colors duration-200 ease-out ${isHovered ? `${hoverBorderColor}` : ''}`}
            aria-label={ariaLabel}
            style={{ 
                overflow: 'hidden',
                transformOrigin: 'center'
            }}
        >
            {/* Glow effect */}
            <motion.div 
                className="absolute inset-0 rounded-full"
                style={{
                    background: `radial-gradient(circle, ${glowColor.replace('0.6', '0.3')} 0%, rgba(0, 0, 0, 0) 70%)`,
                    opacity: 0.8,
                }}
                variants={rotateVariants}
                animate="animate"
            />

            {/* Delete icon */}
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-10 w-10 text-red-500 relative z-10" 
                viewBox="0 0 24 24" 
                fill="none"
                stroke="currentColor" 
                strokeWidth={2}
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
        </motion.div>
    );
});

export default DeleteBin; 