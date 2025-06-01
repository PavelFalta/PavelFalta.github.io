import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GlobalLoadingIndicatorProps {
    isLoading: boolean;
    message?: string;
}

const GlobalLoadingIndicator: React.FC<GlobalLoadingIndicatorProps> = ({ isLoading, message }) => {
    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    key="global-loading-indicator"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gray-950/80 backdrop-blur-sm p-6"
                >
                    <motion.div 
                        className="relative w-20 h-20 mb-6"
                    >
                        <motion.div
                            className="absolute inset-0 rounded-full border-4 border-blue-500/40"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.1 }}
                        />
                        <motion.div
                            className="absolute inset-2 rounded-full border-t-4 border-r-4 border-purple-500 border-t-transparent border-r-transparent"
                            animate={{ rotate: -360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <motion.div
                            className="absolute inset-4 w-12 h-12 rounded-full bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                            animate={{ scale: [0.8, 1, 0.8], opacity: [0.7, 1, 0.7] }}
                            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                        />
                    </motion.div>
                    {message && (
                        <motion.p 
                            className="text-lg sm:text-xl text-gray-200 font-medium tracking-wide text-center"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.3 }}
                        >
                            {message}
                        </motion.p>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default GlobalLoadingIndicator; 