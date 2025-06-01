import React from 'react';
import { motion } from 'framer-motion';
import { Todo } from '../types/domain';

interface DeleteConfirmModalProps {
    todo: Todo;
    onConfirm: () => void;
    onCancel: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ todo, onConfirm, onCancel }) => {
    return (
        <div 
            className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center pointer-events-none"
            style={{ bottom: '2rem' }}
        >
            <motion.div 
                className="bg-gray-800 border border-gray-700 rounded-lg p-4 w-full max-w-sm shadow-xl pointer-events-auto"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                <div className="flex items-center">
                    <div className="flex-shrink-0 mr-4">
                        <motion.div 
                            className="flex items-center justify-center h-10 w-10 rounded-full bg-red-100"
                            initial={{ rotate: -10 }}
                            animate={{ rotate: 0 }}
                        >
                            <svg 
                                className="h-6 w-6 text-red-600" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24" 
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth="2" 
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                ></path>
                            </svg>
                        </motion.div>
                    </div>
                    
                    <div className="flex-1">
                        <h3 className="text-base font-medium text-white">Delete Selected Thought?</h3>
                        <p className="text-sm text-gray-300 mt-1">
                            This action cannot be undone.
                        </p>
                    </div>

                    <div className="flex space-x-2 ml-4">
                        <button
                            type="button"
                            className="py-1 px-3 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors focus:outline-none"
                            onClick={onCancel}
                        >
                            Cancel
                        </button>
                        <motion.button
                            type="button"
                            className="py-1 px-3 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors focus:outline-none"
                            onClick={onConfirm}
                            whileHover={{ 
                                x: [0, -2, 2, -2, 2, -1, 1, 0],
                                transition: { duration: 0.4 }
                            }}
                        >
                            Delete
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default DeleteConfirmModal; 