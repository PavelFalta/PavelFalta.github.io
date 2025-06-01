import { forwardRef } from 'react';
import { motion } from 'framer-motion';

interface CompleteBinProps {
    isHovered?: boolean;
    showRestoreIcon?: boolean;
}

const CompleteBin = forwardRef<HTMLDivElement, CompleteBinProps>(({ isHovered, showRestoreIcon = false }, ref) => {
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

    // Styling with colors that match the black hole aesthetic
    const bgColor = 'bg-slate-900';
    const borderColor = showRestoreIcon ? 'border-blue-600' : 'border-green-600';
    const hoverBorderColor = showRestoreIcon ? 'border-blue-400' : 'border-green-400';
    const ariaLabel = showRestoreIcon ? 'Restore Task' : 'Complete Task';

    // Glowing color based on action
    const glowColor = showRestoreIcon 
        ? 'rgba(59, 130, 246, 0.6)' // Blue for restore
        : 'rgba(22, 163, 74, 0.6)'; // Green for complete

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
            key="complete-bin"
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
            className={`fixed bottom-6 right-1/4 translate-x-1/2 z-40 p-6 ${bgColor} backdrop-blur-sm rounded-full shadow-lg border-2 ${borderColor} transition-colors duration-200 ease-out ${isHovered ? `${hoverBorderColor}` : ''}`}
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

            {/* Show either restore or checkmark icon */}
            {showRestoreIcon ? (
                // Restore icon
                <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-10 w-10 text-blue-500 relative z-10" 
                    viewBox="0 0 24 24" 
                    fill="none"
                    stroke="currentColor" 
                    strokeWidth={2}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            ) : (
                // Complete checkmark icon
                <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-10 w-10 text-green-500 relative z-10" 
                    viewBox="0 0 24 24" 
                    fill="none"
                    stroke="currentColor" 
                    strokeWidth={2}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            )}
        </motion.div>
    );
});

export default CompleteBin; 