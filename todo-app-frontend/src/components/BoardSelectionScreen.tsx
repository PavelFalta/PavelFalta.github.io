import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Board, User } from '../api'; // Assuming User might be needed for a greeting, can be removed
import { PlusCircleIcon, Squares2X2Icon, PencilSquareIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'; // Added CheckIcon, XMarkIcon

interface BoardSelectionScreenProps {
    boards: Board[];
    onSelectBoard: (boardId: number) => void;
    onCreateBoard: (name: string) => void;
    currentUser: User | null; // Optional: for a personalized greeting
    onEditBoard: (boardId: number, newName: string) => void;
    onDeleteBoard: (boardId: number) => void;
}

const BoardSelectionScreen: React.FC<BoardSelectionScreenProps> = ({
    boards,
    onSelectBoard,
    onCreateBoard,
    currentUser,
    onEditBoard,
    onDeleteBoard,
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [editingBoardId, setEditingBoardId] = useState<number | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [confirmingDeleteBoardId, setConfirmingDeleteBoardId] = useState<number | null>(null);
    const createInputRef = useRef<HTMLInputElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isCreating && createInputRef.current) {
            createInputRef.current.focus();
        }
    }, [isCreating]);

    useEffect(() => {
        if (editingBoardId !== null && editInputRef.current) {
            editInputRef.current.focus();
        }
    }, [editingBoardId]);
    
    const cardVariants = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                delay: i * 0.07,
                duration: 0.4,
                ease: [0.25, 0.1, 0.25, 1] // easeOutExpo-like
            },
        }),
        hover: {
            scale: 1.03,
            boxShadow: '0px 10px 30px rgba(59, 130, 246, 0.3), 0 0 20px rgba(139, 92, 246, 0.2)',
            transition: { duration: 0.2, ease: 'easeOut' },
        },
        tap: {
            scale: 0.97,
            transition: { duration: 0.15, ease: 'easeIn' },
        }
    };

    return (
        <motion.div 
            className="min-h-screen w-full bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-6 sm:p-8 pt-20 sm:pt-24"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <motion.div 
                className="text-center mb-10 sm:mb-12"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
            >
                {currentUser && (
                    <p className="text-3xl sm:text-4xl text-gray-100 mb-1 sm:mb-2 font-semibold">
                        Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">{currentUser.username}</span>!
                    </p>
                )}
                <p className="mt-3 text-md sm:text-lg text-gray-500 max-w-xl mx-auto">
                    Select an existing board to continue your work or create a new one to start fresh.
                </p>
            </motion.div>

            {/* Revised Main Content Area Logic */}
            {boards.length === 0 ? (
                isCreating ? (
                    // EMPTY STATE: Inline Creation Form
                    <motion.div
                        key="creating-board-form-empty"
                        variants={cardVariants} // Or a specific variant for this state
                        initial="hidden"
                        animate="visible"
                        className="aspect-[4/3] w-full max-w-xs mx-auto bg-gray-800 border-2 border-blue-500 rounded-xl shadow-xl p-4 sm:p-5 flex flex-col justify-center items-center focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-offset-2 focus-within:ring-offset-gray-900"
                    >
                        <input
                            ref={createInputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="New Board Name..."
                            className="w-full mb-3 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none text-sm"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    if (inputValue.trim()) {
                                        onCreateBoard(inputValue.trim());
                                        setIsCreating(false);
                                        setInputValue('');
                                    }
                                } else if (e.key === 'Escape') {
                                    setIsCreating(false);
                                    setInputValue('');
                                }
                            }}
                        />
                        <div className="flex space-x-2">
                            <button
                                onClick={() => {
                                    if (inputValue.trim()) {
                                        onCreateBoard(inputValue.trim());
                                        setIsCreating(false);
                                        setInputValue('');
                                    }
                                }}
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-800 border-2 border-green-500/70 hover:border-green-400 text-green-400 hover:text-green-300 shadow-md hover:shadow-lg hover:shadow-green-500/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-gray-800"
                                title="Create Board"
                            >
                                <CheckIcon className="w-6 h-6" />
                            </button>
                            <button
                                onClick={() => {
                                    setIsCreating(false);
                                    setInputValue('');
                                }}
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-800 border-2 border-red-500/70 hover:border-red-400 text-red-400 hover:text-red-300 shadow-md hover:shadow-lg hover:shadow-red-500/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-800"
                                title="Cancel"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    // EMPTY STATE: "No Boards Yet" UI
                <motion.div 
                    className="text-center p-10 bg-gray-800 rounded-xl shadow-xl border border-gray-700"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                >
                    <Squares2X2Icon className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-semibold text-gray-200 mb-2">No Boards Yet</h2>
                    <p className="text-gray-400 mb-6">It looks like you haven't created or joined any boards.</p>
                        <motion.div
                            onClick={() => {
                                setIsCreating(true);
                                setInputValue('');
                            }}
                            className="group relative w-full max-w-xs mx-auto bg-gradient-to-br from-blue-600 to-purple-700 p-6 rounded-xl shadow-2xl hover:shadow-[0_0_30px_rgba(90,100,250,0.6)] transition-all duration-300 cursor-pointer focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-60"
                            whileHover={{ scale: 1.03, y: -5 }}
                        whileTap={{ scale: 0.98 }}
                    >
                            <div className="absolute inset-0 bg-black/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative flex flex-col items-center justify-center text-center">
                                <PlusCircleIcon className="w-20 h-20 text-white/80 group-hover:text-white transition-colors duration-300 mb-3" />
                                <h3 className="text-xl font-semibold text-white">Create Your First Board</h3>
                                <p className="text-sm text-blue-200/80 group-hover:text-blue-100 transition-colors duration-300 mt-1">Let's get your ideas flowing!</p>
                            </div>
                        </motion.div>
                </motion.div>
                )
            ) : (
                // BOARDS EXIST: Grid of Boards UI
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 sm:gap-6 w-full max-w-7xl">
                    {/* First Item: Inline Creation Form OR "Create New Board" Card */}
                    {isCreating ? (
                        <motion.div
                            key="creating-board-form-grid"
                            custom={0} // for stagger if needed
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                            className="aspect-[4/3] bg-gray-800 border-2 border-blue-500 rounded-xl shadow-xl p-4 sm:p-5 flex flex-col justify-center items-center focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-offset-2 focus-within:ring-offset-gray-900"
                        >
                            <input
                                ref={createInputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="New Board Name..."
                                className="w-full mb-3 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none text-sm"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        if (inputValue.trim()) {
                                            onCreateBoard(inputValue.trim());
                                            setIsCreating(false);
                                            setInputValue('');
                                        }
                                    } else if (e.key === 'Escape') {
                                        setIsCreating(false);
                                        setInputValue('');
                                    }
                                }}
                            />
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => {
                                        if (inputValue.trim()) {
                                            onCreateBoard(inputValue.trim());
                                            setIsCreating(false);
                                            setInputValue('');
                                        }
                                    }}
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-800 border-2 border-green-500/70 hover:border-green-400 text-green-400 hover:text-green-300 shadow-md hover:shadow-lg hover:shadow-green-500/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-gray-800"
                                    title="Create Board"
                                >
                                    <CheckIcon className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={() => {
                                        setIsCreating(false);
                                        setInputValue('');
                                    }}
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-800 border-2 border-red-500/70 hover:border-red-400 text-red-400 hover:text-red-300 shadow-md hover:shadow-lg hover:shadow-red-500/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-800"
                                    title="Cancel"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                    <motion.button
                            onClick={() => {
                                setIsCreating(true);
                                setEditingBoardId(null); 
                                setInputValue(''); 
                            }}
                            custom={0} 
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover="hover"
                        whileTap="tap"
                            className="group aspect-[4/3] relative bg-gray-800/70 hover:bg-gray-800/90 border-2 border-blue-500/50 hover:border-blue-400 rounded-xl shadow-lg hover:shadow-xl flex flex-col items-center justify-center text-blue-300 hover:text-blue-200 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900 cursor-pointer overflow-hidden"
                    >
                            <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-300" style={{backgroundImage: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.3) 0%, transparent 70%)'}}></div>
                            <div className="relative z-10 flex flex-col items-center justify-center">
                                <PlusCircleIcon className="w-16 h-16 sm:w-20 sm:h-20 text-blue-400/80 group-hover:text-blue-300 group-hover:scale-105 transition-all duration-300 mb-2 sm:mb-3" />
                        <span className="text-sm sm:text-md font-semibold">Create New Board</span>
                            </div>
                    </motion.button>
                    )}

                    {/* Existing Boards (mapped next to the create card/form) */}
                    {boards.map((board, index) => {
                        const isOwner = currentUser && board.ownerId === currentUser.id;
                        const isEditingThisBoard = editingBoardId === board.id;
                        // Adjust index for stagger if create form is present (+1 if isCreating is false, as the button counts as 0)
                        // No, custom index should be based on visual order. If create form is there, it's 0.
                        // Existing boards will always start from index 1 effectively if we consider create form/button as 0.
                        const cardIndex = index + 1; 

                        if (isEditingThisBoard) {
                            return (
                                <motion.div
                                    key={`${board.id}-editing`}
                                    custom={cardIndex}
                                    variants={cardVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="group aspect-[4/3] bg-gray-800 border-2 border-purple-500 rounded-xl shadow-xl p-4 sm:p-5 flex flex-col justify-center items-start focus-within:ring-2 focus-within:ring-purple-400 focus-within:ring-offset-2 focus-within:ring-offset-gray-900"
                                >
                                    <input
                                        ref={editInputRef}
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        className="w-full mb-3 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:ring-1 focus:ring-purple-400 focus:border-purple-400 outline-none text-sm"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                if (inputValue.trim() && inputValue.trim() !== board.name) {
                                                    onEditBoard(board.id, inputValue.trim());
                                                }
                                                setEditingBoardId(null);
                                                setInputValue('');
                                            } else if (e.key === 'Escape') {
                                                setEditingBoardId(null);
                                                setInputValue('');
                                            }
                                        }}
                                    />
                                    <div className="flex space-x-2 self-center">
                                        <button
                                            onClick={() => {
                                                if (inputValue.trim() && inputValue.trim() !== board.name) {
                                                    onEditBoard(board.id, inputValue.trim());
                                                }
                                                setEditingBoardId(null);
                                                setInputValue('');
                                            }}
                                            className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-800 border-2 border-green-500/70 hover:border-green-400 text-green-400 hover:text-green-300 shadow-md hover:shadow-lg hover:shadow-green-500/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-gray-800"
                                            title="Save Changes"
                                        >
                                            <CheckIcon className="w-6 h-6" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingBoardId(null);
                                                setInputValue('');
                                            }}
                                            className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-800 border-2 border-red-500/70 hover:border-red-400 text-red-400 hover:text-red-300 shadow-md hover:shadow-lg hover:shadow-red-500/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-800"
                                            title="Cancel"
                                        >
                                            <XMarkIcon className="w-6 h-6" />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        }
                        
                        return (
                            <motion.div
                                key={board.id}
                                custom={cardIndex}
                                variants={cardVariants}
                                initial="hidden"
                                animate="visible"
                                whileHover="hover"
                                className="group aspect-[4/3] bg-gray-800 border border-gray-700 hover:border-purple-500/80 rounded-xl shadow-xl p-4 sm:p-5 flex flex-col justify-between items-start focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-900 overflow-hidden relative"
                                style={{ background: 'linear-gradient(145deg, rgba(31, 41, 55, 0.9) 0%, rgba(17, 24, 39, 0.95) 100%)'}}
                            >
                                <div 
                                    className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                ></div>
                                
                                {isOwner && (
                                    <div className="absolute top-2 right-2 z-20 flex space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        {confirmingDeleteBoardId === board.id ? (
                                            <>
                                                <motion.button
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        onDeleteBoard(board.id); 
                                                        setConfirmingDeleteBoardId(null);
                                                    }}
                                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-slate-800 border-2 border-red-500/70 hover:border-red-400 text-red-400 hover:text-red-300 shadow-md hover:shadow-lg hover:shadow-red-500/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-800"
                                                    whileHover={{ scale: 1.15, boxShadow: '0 0 12px rgba(239, 68, 68, 0.6)'}}
                                                    whileTap={{ scale: 0.95 }}
                                                    title="Confirm Delete"
                                                >
                                                    <CheckIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                                                </motion.button>
                                                <motion.button
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setConfirmingDeleteBoardId(null); 
                                                    }}
                                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-slate-800 border-2 border-gray-500/70 hover:border-gray-400 text-gray-400 hover:text-gray-300 shadow-md hover:shadow-lg hover:shadow-gray-500/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-800"
                                                    whileHover={{ scale: 1.15 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    title="Cancel Delete"
                                                >
                                                    <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                                                </motion.button>
                                            </>
                                        ) : (
                                            <>
                                        <motion.button
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setEditingBoardId(board.id);
                                                        setInputValue(board.name); 
                                                        setIsCreating(false); 
                                                        setConfirmingDeleteBoardId(null); 
                                                    }}
                                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-slate-800 border-2 border-blue-500/70 hover:border-blue-400 text-blue-400 hover:text-blue-300 shadow-md hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-800"
                                                    whileHover={{ scale: 1.15, rotate: -8, boxShadow: '0 0 12px rgba(59, 130, 246, 0.6)' }}
                                                    whileTap={{ scale: 0.95 }}
                                            title="Edit Board"
                                        >
                                                    <PencilSquareIcon className="w-5 h-5 sm:w-5 sm:h-5" />
                                        </motion.button>
                                        <motion.button
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setConfirmingDeleteBoardId(board.id);
                                                        setEditingBoardId(null); 
                                                    }}
                                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-slate-800 border-2 border-red-500/70 hover:border-red-400 text-red-400 hover:text-red-300 shadow-md hover:shadow-lg hover:shadow-red-500/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-800"
                                                    whileHover={{ scale: 1.15, rotate: 8, boxShadow: '0 0 12px rgba(239, 68, 68, 0.6)' }}
                                                    whileTap={{ scale: 0.95 }}
                                            title="Delete Board"
                                        >
                                                    <TrashIcon className="w-5 h-5 sm:w-5 sm:h-5" />
                                        </motion.button>
                                            </>
                                        )}
                                    </div>
                                )}

                                <motion.div 
                                    className="relative z-10 flex flex-col justify-between h-full w-full cursor-pointer"
                                    onClick={() => onSelectBoard(board.id)}
                                    whileTap="tap"
                                    variants={{ tap: cardVariants.tap }}
                                >
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-semibold text-gray-100 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-300 group-hover:to-purple-400 transition-colors duration-200 break-words line-clamp-2">
                                            {board.name}
                                        </h2>
                                    </div>
                                    <div className="mt-auto pt-2 text-right w-full">
                                        <span className="text-xs text-blue-400 group-hover:text-blue-300 font-medium transition-colors duration-200">Open Board &rarr;</span>
                                    </div>
                                </motion.div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
};

export default BoardSelectionScreen; 