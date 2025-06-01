import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface EditTaskModalProps {
    x: number;
    y: number;
    todoId: number;
    initialName: string;
    color?: string;
    isCompleted?: boolean;
    onSave: (name: string) => Promise<boolean>;
    onClose: () => void;
}

function EditTaskModal({ 
    x, 
    y,
    todoId,
    initialName, 
    color = '#8b5cf6', 
    isCompleted = false,
    onSave, 
    onClose 
}: EditTaskModalProps): React.ReactElement {
    const [name, setName] = useState(initialName);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Focus textarea on mount and select all text
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
        }
    }, []);

    const handleSave = async () => {
        if (name.trim() && name !== initialName) {
            setIsLoading(true);
            setHasError(false);
            
            try {
                const success = await onSave(name);
                if (success) {
                    onClose(); // Close immediately after successful save
                } else {
                    setHasError(true);
                    setIsLoading(false);
                }
            } catch (error) {
                setHasError(true);
                setIsLoading(false);
            }
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (name.trim() && name !== initialName) {
                handleSave();
            }
        } else if (event.key === 'Escape') {
            onClose();
        }
    };

    // Check if save should be disabled
    const isSaveDisabled = !name.trim() || name === initialName || isLoading;

    // Subtle floating animation
    const floatVariants = {
        animate: {
            y: [0, -5, 0],
            transition: {
                duration: 4,
                ease: "easeInOut",
                repeat: Infinity
            }
        }
    };

    // Modal animation
    const modalVariants = {
        hidden: {
            scale: 0.9, 
            opacity: 0, 
            x: '-50%',
            y: '-50%'
        },
        visible: {
            scale: 1, 
            opacity: 1, 
            x: '-50%',
            y: '-50%', 
            transition: { type: 'spring', stiffness: 300, damping: 25 }
        }
    };

    // Glowing effect animation for the save button
    const glowVariants = {
        idle: {
            boxShadow: `0 0 10px 1px ${color}`,
        },
        hover: {
            boxShadow: `0 0 20px 4px ${color}`,
        }
    };

    // Background gradient based on the node's color or completion status
    const backgroundGradient = 
        `radial-gradient(circle at top left, ${color}33 0%, rgba(0, 0, 0, 0) 70%)`;

    // Custom RGB values for the border color
    let borderColor = color;

    return (
        <motion.div
            className="fixed z-[1000] rounded-xl bg-slate-900/95 shadow-2xl border-2 flex flex-col items-center justify-center p-6"
            style={{ 
                left: `${x}px`, 
                top: `${y}px`,
                borderColor: borderColor,
                boxShadow: `0 0 25px 5px ${color}40`,
                backdropFilter: 'blur(12px)',
                minWidth: '360px',
                maxWidth: '450px',
                position: 'fixed', // Ensure fixed positioning relative to viewport
                transform: 'translate(-50%, -50%)' // Center the modal at the x,y coordinates
            }}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Background effect */}
            <div 
                className="absolute inset-0 rounded-xl opacity-30"
                style={{
                    background: backgroundGradient,
                }}
            />
            
            {/* Content */}
            <motion.div 
                className="relative z-10 flex flex-col items-center w-full"
                variants={floatVariants}
                animate="animate"
            >
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                     <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }}></span>
                    Edit Thought
                </h2>
                
                <div className="w-full mb-4">
                    <textarea
                        ref={textareaRef}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full px-4 py-3 bg-slate-800/80 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent text-base resize-none min-h-[120px] cursor-text"
                        placeholder="What's on your mind?"
                        style={{
                            borderColor: `${color}80`,
                        }}
                        disabled={isLoading}
                    />
                </div>
                
                <div className="flex space-x-4 w-full justify-between">
                    <motion.button
                        onClick={onClose}
                        whileHover={{ scale: 1.03, backgroundColor: 'rgba(30, 41, 59, 0.9)' }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-slate-800/60 text-white text-sm font-medium border border-slate-700"
                        disabled={isLoading}
                    >
                        Cancel
                    </motion.button>
                    
                    <motion.button
                        onClick={handleSave}
                        disabled={isSaveDisabled}
                        variants={glowVariants}
                        initial="idle"
                        whileHover={!isSaveDisabled ? "hover" : "idle"}
                        whileTap={!isSaveDisabled ? { scale: 0.98 } : {}}
                        className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition flex items-center justify-center
                            ${hasError ? 'bg-red-600' : ''}`}
                        style={{ 
                            backgroundColor: hasError ? 'rgba(220, 38, 38, 0.8)' : color,
                            opacity: isSaveDisabled ? 0.5 : 1
                        }}
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : hasError ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                Error
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                Save Changes
                            </>
                        )}
                    </motion.button>
                </div>
                
                <div className="text-xs text-slate-400 mt-3 italic">
                    {isCompleted ? "Editing completed thought" : "Press Shift+Enter for a new line"}
                </div>
            </motion.div>
        </motion.div>
    );
}

export default EditTaskModal; 