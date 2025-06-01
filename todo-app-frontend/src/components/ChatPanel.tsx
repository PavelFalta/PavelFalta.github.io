import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, SendChatMessagePayload } from '../hooks/useBoardWebSocket';
import { User } from '../context/AuthContext';
import { XMarkIcon, ChatBubbleOvalLeftEllipsisIcon, PaperAirplaneIcon, BellIcon } from '@heroicons/react/24/solid';

interface ChatPanelProps {
    chatMessages: ChatMessage[];
    currentUser: User | null;
    sendMessage: (action: string, payload: SendChatMessagePayload) => void;
    boardId: number | null;
    lastDisconnectTime?: string | null; // ISO 8601 timestamp of last disconnect
}

const ChatPanel: React.FC<ChatPanelProps> = ({ 
    chatMessages, 
    currentUser, 
    sendMessage, 
    boardId,
    lastDisconnectTime 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
    const prevMessagesCountRef = useRef(chatMessages.length);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    // Check for unread messages based on lastDisconnectTime
    useEffect(() => {
        if (!isOpen && lastDisconnectTime) {
            const lastDisconnectDate = new Date(lastDisconnectTime);
            
            // Check if any messages are newer than lastDisconnectTime
            const hasNewMessages = chatMessages.some(msg => {
                const messageDate = new Date(msg.timestamp);
                return messageDate > lastDisconnectDate;
            });

            setHasUnreadMessages(hasNewMessages);
        }
    }, [chatMessages, lastDisconnectTime, isOpen]);

    useEffect(() => {
        if (isOpen) {
            setHasUnreadMessages(false); // Reset unread status immediately

            // Delay scrolling and focusing to allow animations to start and layout to stabilize
            const timerId = setTimeout(() => {
                scrollToBottom();
                if (inputRef.current) {
                    inputRef.current.focus();
                }
            }, 150);

            return () => clearTimeout(timerId);
        }
    }, [isOpen, chatMessages.length, scrollToBottom]);

    useEffect(() => {
        // Keep isOpen state if boardId is the same, only reset for actual board change
        setNewMessage('');
    }, [boardId]);

    const handleSendMessage = () => {
        if (newMessage.trim() === '' || !currentUser || !boardId) return;
        sendMessage('send_chat_message', { message: newMessage.trim() });
        setNewMessage('');
    };

    const togglePanel = () => {
        const newIsOpenState = !isOpen;
        setIsOpen(newIsOpenState);
        if (newIsOpenState) {
            setHasUnreadMessages(false);
        }
    };
    
    const getInitials = (username: string) => {
        if (!username) return '?';
        const parts = username.split(/[\s_-]+/);
        let initials = '';
        for (const part of parts) {
            if (part.length > 0) {
                initials += part[0].toUpperCase();
            }
        }
        return initials.slice(0, 2);
    };

    // Animation variants for the main container
    const containerVariants = {
        closed: {
            width: '64px', // 4rem / w-16
            height: '64px', // 4rem / h-16
            borderRadius: '9999px', // rounded-full
            padding: '0px',
            x: 0, // Keep its position from fixed bottom-4 right-4
            y: 0,
            boxShadow: '0 0 18px rgba(90,100,250,0.7)',
            transition: { duration: 0.3, ease: "anticipate" }
        },
        open: {
            width: 'clamp(320px, 80vw, 384px)', // Equivalent to w-80 sm:w-96
            height: 'clamp(300px, 70vh, 500px)', // Max height
            borderRadius: '12px', // rounded-lg (Tailwind lg)
            padding: '0px', // Panel itself will have padding for content
            overflow: 'hidden', // Important for child animations and structure
            x: 0,
            y: 0,
            boxShadow: '0 10px 25px rgba(0,0,0,0.3), 0 0 20px rgba(59,130,246,0.3)',
            transition: { duration: 0.4, ease: "anticipate", staggerChildren: 0.05 }
        }
    };

    const contentVariants = {
        closed: { opacity: 0, y: 20, display: 'none', transition: { duration: 0.2 } },
        open: { opacity: 1, y: 0, display: 'flex', transition: { duration: 0.3, delay: 0.1 } }
    };
    
    const iconVariants = {
      closed: { scale: 1, rotate: 0 },
      open: { scale: 1, rotate: 0 } // Icon itself doesn't need to rotate if content changes
    };

    return (
        <motion.div
            className="fixed bottom-6 right-6 z-[70]"
            variants={containerVariants}
            initial="closed"
            animate={isOpen ? "open" : "closed"}
            layout
            whileHover={!isOpen && boardId ? { 
                scale: 1.1, 
                boxShadow: '0 0 25px rgba(90,100,250,0.9)',
                transition: { duration: 0.2, ease: "easeInOut" }
            } : {}}
            style={isOpen ? {} : {
                background: 'linear-gradient(to right, #4f46e5, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: boardId ? 'pointer' : 'default',
            }}
            onClick={!isOpen && boardId ? togglePanel : undefined}
            title={!boardId ? "Chat unavailable (no board selected)" : (isOpen ? "Chat Panel" : "Open Chat")}
        >
            {/* Button Icon (visible when closed) */}
            <AnimatePresence>
            {!isOpen && (
                <motion.div
                    variants={iconVariants}
                    initial="closed"
                    animate="closed"
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="flex items-center justify-center"
                    key="chat-icon-closed"
                >
                    <ChatBubbleOvalLeftEllipsisIcon className="w-8 h-8 text-white" />
                    {hasUnreadMessages && (
                        <motion.span 
                            className="absolute -top-0.5 -right-0.5 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-gray-800 shadow-sm"
                            animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                        />
                    )}
                </motion.div>
            )}
            </AnimatePresence>

            {/* Panel Content (visible when open) */}
            {/* Conditional rendering ensures refs like inputRef are available when needed */}
            {isOpen && (
                 <motion.div 
                    className="bg-gray-900/80 backdrop-blur-lg text-gray-100 w-full h-full flex flex-col overflow-hidden border border-blue-500/30 rounded-lg"
                    variants={contentVariants} // Use variants for opacity & y
                    initial="closed"
                    animate="open"
                    exit="closed" // Ensure it animates out
                    key="chat-panel-content"
                  >
                    <div className="p-3.5 border-b border-blue-500/20 bg-gray-800/50 flex justify-between items-center shrink-0">
                        <h3 className="text-md font-semibold text-gray-200">Board Chat</h3>
                        <motion.button
                            onClick={togglePanel} // This now closes the panel
                            className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-gray-700/70 transition-colors"
                            aria-label="Close chat"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </motion.button>
                    </div>
                    <div className="flex-grow p-3 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-gray-800/50">
                        {chatMessages.length === 0 && (
                            <p className="text-gray-400 text-sm text-center py-4">No messages yet. Be the first!</p>
                        )}
                        {chatMessages.map((msg) => {
                            const isCurrentUser = msg.user_id === currentUser?.id;
                            const messageDate = new Date(msg.timestamp);
                            const displayTime = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                            return (
                                <div
                                    key={msg.id}
                                    className={`flex items-end space-x-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                                >
                                    {!isCurrentUser && msg.user && ( // Added check for msg.user
                                        <div
                                            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white select-none border border-gray-500/50 shadow-sm"
                                            style={{ backgroundColor: msg.user.color || '#374151' }}
                                            title={msg.user.username}
                                        >
                                            {getInitials(msg.user.username)}
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-[75%] p-2.5 rounded-lg shadow-md ${isCurrentUser
                                                ? 'bg-blue-600 text-white rounded-br-none shadow-blue-600/30'
                                                : 'bg-gray-700 text-gray-200 rounded-bl-none shadow-black/20'
                                            }`}
                                    >
                                        {!isCurrentUser && msg.user && ( // Added check for msg.user
                                            <p className="text-xs font-semibold mb-0.5"
                                               style={{ color: msg.user.color || '#9ca3af' }}
                                            >
                                                {msg.user.username}
                                            </p>
                                        )}
                                        <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                                        <p className={`text-xs mt-1 ${isCurrentUser ? 'text-blue-200' : 'text-gray-400'} text-right`}>
                                            {displayTime}
                                        </p>
                                    </div>
                                    {isCurrentUser && currentUser && (
                                       <div
                                            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white select-none border border-blue-300/50 shadow-sm bg-blue-500"
                                            title={currentUser.username}
                                        >
                                            {getInitials(currentUser.username)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-3 border-t border-blue-500/20 bg-gray-800/30 shrink-0">
                        <div className="flex items-center space-x-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (handleSendMessage(), e.preventDefault())}
                                placeholder="Type a message..."
                                className="flex-grow p-2.5 bg-gray-700/80 border border-gray-600/70 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-[0_0_10px_rgba(59,130,246,0.5)] outline-none text-sm placeholder-gray-400 text-gray-100 transition-all duration-150"
                                disabled={!currentUser || !boardId}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!newMessage.trim() || !currentUser || !boardId}
                                className="p-2.5 rounded-md text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 hover:brightness-110 shadow-[0_0_8px_rgba(59,130,246,0.3)] hover:shadow-[0_0_12px_rgba(90,100,250,0.5)]"
                                title="Send Message"
                            >
                                <PaperAirplaneIcon className="w-5 h-5 transform rotate-[-0deg]" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default ChatPanel; 