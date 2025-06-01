import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApiClient } from '../hooks/useApiClient';
import { Board, BoardCreate } from '../api'; // Import Board and BoardCreate
import toast from '../utils/toast';

interface CreateBoardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBoardCreated: (newBoard: Board) => void; // Callback with the newly created board
}

const CreateBoardModal: React.FC<CreateBoardModalProps> = ({ isOpen, onClose, onBoardCreated }) => {
    const { boardsApi } = useApiClient();
    const [boardName, setBoardName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setBoardName('');
            setIsSubmitting(false);
            setError(null);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!boardName.trim()) {
            setError('Board name cannot be empty.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const payload: BoardCreate = { name: boardName.trim() };

        try {
            const newBoard = await boardsApi.createNewBoardApiBoardsPost({ boardCreate: payload });
            toast.success(`Board "${newBoard.name}" created!`);
            onBoardCreated(newBoard); // Pass the new board back to parent
            onClose(); // Close modal on success
        } catch (err: any) {
            console.error("Create board error:", err);
            const errorMsg = err?.body?.detail || 'Failed to create board.';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4"
                onClick={onClose} // Close on backdrop click
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md relative border border-gray-700"
                    onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside
                >
                    <h2 className="text-xl font-semibold text-white mb-4">Create New Board</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="boardName" className="block mb-1 text-sm font-medium text-gray-300">
                                Board Name
                            </label>
                            <input
                                type="text"
                                id="boardName"
                                value={boardName}
                                onChange={(e) => setBoardName(e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'}`}
                                placeholder="Enter board name"
                                disabled={isSubmitting}
                                autoFocus
                            />
                            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
                        </div>

                        <div className="flex justify-end space-x-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-lg hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500 transition duration-150 ease-in-out disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center"
                            >
                                {isSubmitting ? (
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : null}
                                {isSubmitting ? 'Creating...' : 'Create Board'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CreateBoardModal; 