import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface NewTaskModalProps {
    x: number;
    y: number;
    onSave: (name: string) => Promise<boolean>;
    onClose: () => void;
}

function NewTaskModal({ x, y, onSave, onClose }: NewTaskModalProps): React.ReactElement {
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Focus input on mount
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    }, []);

    const handleSave = async () => {
        if (name.trim()) {
            setIsLoading(true);
            setHasError(false);
            
            try {
                const success = await onSave(name);
                if (success) {
                    // Modal will close automatically when save is successful
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
            if (name.trim()) {
                handleSave();
            }
        } else if (event.key === 'Escape') {
            onClose();
        }
    };

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
            boxShadow: `0 0 10px 1px rgba(139, 92, 246, 0.5)`,
        },
        hover: {
            boxShadow: `0 0 20px 4px rgba(139, 92, 246, 0.7)`,
        }
    };

    // Background gradient
    const backgroundGradient = `radial-gradient(circle at top left, rgba(139, 92, 246, 0.2) 0%, rgba(0, 0, 0, 0) 70%)`;

    return (
        <motion.div
            className="fixed z-[1000] rounded-xl bg-slate-900/95 shadow-2xl border-2 border-purple-500 flex flex-col items-center justify-center p-6"
            style={{ 
                left: `${x}px`, 
                top: `${y}px`,
                boxShadow: '0 0 25px 5px rgba(139, 92, 246, 0.4)',
                backdropFilter: 'blur(12px)',
                minWidth: '360px',
                maxWidth: '450px'
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
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    Create New Thought
                </h2>
                
                <div className="w-full mb-4">
                    <textarea
                        ref={textareaRef}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full px-4 py-3 bg-slate-800/80 border border-purple-400/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base resize-none min-h-[120px] cursor-text"
                        placeholder="What's on your mind?"
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
                        disabled={!name.trim() || isLoading}
                        variants={glowVariants}
                        initial="idle"
                        whileHover={name.trim() && !isLoading ? "hover" : "idle"}
                        whileTap={name.trim() && !isLoading ? { scale: 0.98 } : {}}
                        className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition flex items-center justify-center
                            ${hasError ? 'bg-red-600' : 'bg-purple-600'}`}
                        style={{ 
                            opacity: !name.trim() || isLoading ? 0.5 : 1
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
                                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3-7H7v-2h6v2z" />
                                </svg>
                                Create Thought
                            </>
                        )}
                    </motion.button>
                </div>
                
                <div className="text-xs text-slate-400 mt-3 italic">
                    Press Shift+Enter for a new line
                </div>
            </motion.div>
        </motion.div>
    );
}

export default NewTaskModal; 