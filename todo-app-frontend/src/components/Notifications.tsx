import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BoardInvitation, InvitationsApi } from '../api';
import { toast } from 'react-hot-toast';
import { XMarkIcon, CheckCircleIcon, XCircleIcon as DeclineIcon, InboxIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationsProps {
    apiClient: { invitationsApi: InvitationsApi };
    onInvitationAccepted: () => void;
    pollingInterval?: number;
    isVisible: boolean;
    onClose: () => void;
}

const DEFAULT_POLLING_INTERVAL = 5000; // 5 seconds

const Notifications: React.FC<NotificationsProps> = ({ 
    apiClient,
    onInvitationAccepted,
    pollingInterval = DEFAULT_POLLING_INTERVAL,
    isVisible,
    onClose
}) => {
    const [invitations, setInvitations] = useState<BoardInvitation[]>([]);
    const { invitationsApi } = apiClient;
    const [isFetching, setIsFetching] = useState(false); // General fetching state for any fetch
    const [isInitialLoad, setIsInitialLoad] = useState(true); // Specifically for the first load when panel opens

    const fetchInvitations = useCallback(async (isPoll = false) => {
        if (!isPoll) {
            setIsFetching(true); // Set general fetching true for non-poll requests (initial load/manual refresh)
        }
        try {
            const response = await invitationsApi.getMyPendingInvitationsApiUsersMeInvitationsGet();
            // Always update invitations if data is different, or if it's the initial load even if data is same (e.g. empty to empty)
            if (JSON.stringify(response) !== JSON.stringify(invitations) || (!isPoll && isInitialLoad)) {
                setInvitations(response);
            }
        } catch (error) {
            console.error("Failed to fetch invitations:", error);
            // Optionally, show a non-intrusive error for initial load if needed
            // if (!isPoll && isInitialLoad) toast.error("Could not load notifications.");
        } finally {
            if (!isPoll) {
                setIsFetching(false); // Clear general fetching for non-poll
            }
            if (isInitialLoad) {
                setIsInitialLoad(false); // Mark initial load as complete after the first attempt (success or fail)
            }
        }
    }, [invitationsApi, invitations, isInitialLoad]); // Added isInitialLoad

    useEffect(() => {
        if (isVisible) {
            setIsInitialLoad(true); // Reset initial load flag when panel becomes visible
            fetchInvitations(false); // Explicit non-poll fetch
        }
    }, [isVisible]); // Removed fetchInvitations from here to avoid re-triggering on its own change due to useCallback deps

    useEffect(() => {
        let poller: NodeJS.Timeout | null = null;
        if (isVisible && pollingInterval > 0) { // Only poll if visible and interval is set
            poller = setInterval(() => {
                if (!isFetching) { // Optional: Don't poll if a manual fetch is already in progress
                    fetchInvitations(true); 
                }
            }, pollingInterval);
        }
        return () => {
            if (poller) {
                clearInterval(poller);
            }
        };
    }, [isVisible, pollingInterval, fetchInvitations, isFetching]); // Added isFetching

    const handleAccept = async (invitationId: number) => {
        setIsFetching(true);
        try {
            await invitationsApi.acceptBoardInvitationApiInvitationsInvitationIdAcceptPost({ invitationId });
            toast.success('Invitation accepted!');
            fetchInvitations(false); // Treat as a manual refresh, non-poll
            onInvitationAccepted();
        } catch (error) {
            console.error("Failed to accept invitation:", error);
            toast.error('Failed to accept invitation.');
        } finally {
            setIsFetching(false);
        }
    };

    const handleDecline = async (invitationId: number) => {
        setIsFetching(true);
        try {
            await invitationsApi.declineBoardInvitationApiInvitationsInvitationIdDeclinePost({ invitationId });
            toast.success('Invitation declined!');
            fetchInvitations(false); // Treat as a manual refresh, non-poll
        } catch (error) {
            console.error("Failed to decline invitation:", error);
            toast.error('Failed to decline invitation.');
        } finally {
            setIsFetching(false);
        }
    };

    if (!isVisible) {
        return null;
    }

    const showLoadingIndicator = isInitialLoad && isFetching;
    const showEmptyMessage = !isFetching && invitations.length === 0;
    const showInvitationsList = !isFetching && invitations.length > 0;

    return (
        <motion.div
            key="notifications-panel"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 text-gray-100 flex flex-col"
            style={{
                backdropFilter: 'blur(10px)',
                background: 'linear-gradient(145deg, rgba(31, 41, 55, 0.95) 0%, rgba(17, 24, 39, 0.98) 100%)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3), 0 0 20px rgba(88, 81, 216, 0.2)'
            }}
        >
            <div className="p-4 border-b border-gray-700/60">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Notifications</h3>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                            title="Close"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
            
            <div 
                className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700/50" 
                style={{maxHeight: 'calc(100vh - 200px)'}}
            >
                {showLoadingIndicator && (
                     <div className="px-4 py-10 text-center text-sm text-gray-400">
                        Loading invitations...
                    </div>
                )}

                {showEmptyMessage && (
                    <div className="px-4 py-6 text-center text-gray-400 flex flex-col items-center justify-center h-full">
                        <InboxIcon className="h-12 w-12 mx-auto text-gray-500 mb-3" />
                        <p className="text-sm">No new invitations.</p>
                        <p className="text-xs text-gray-500 mt-1">You're all caught up!</p>
                    </div>
                )}
                
                {showInvitationsList && (
                    <ul className="divide-y divide-gray-700/50">
                        {invitations.map((invitation) => (
                            <li key={invitation.id} className="hover:bg-gray-700/70 transition-colors duration-100">
                                <div className="p-4">
                                    <p className="text-sm text-gray-200">
                                        Invitation to join <span className="font-semibold text-purple-300">{invitation.board?.name || 'an unnamed board'}</span>
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        From: <span className="font-medium text-gray-300">{invitation.inviter?.username || 'an unknown user'}</span>
                                    </p>
                                    <div className="mt-3 flex justify-end space-x-2">
                                        <motion.button
                                            onClick={() => handleDecline(invitation.id)}
                                            disabled={isFetching} // Disable buttons during any fetch operation
                                            className="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ease-in-out 
                                                       text-red-300 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 
                                                       hover:shadow-[0_0_10px_rgba(239,68,68,0.4)] focus:outline-none focus:ring-1 focus:ring-red-500/70 disabled:opacity-50"
                                            whileHover={{ scale: isFetching ? 1 : 1.05, y: isFetching ? 0 : -1 }}
                                            whileTap={{ scale: isFetching ? 1 : 0.95 }}
                                        >
                                            <DeclineIcon className="h-4 w-4 inline mr-1 -mt-0.5" />
                                            Decline
                                        </motion.button>
                                        <motion.button
                                            onClick={() => handleAccept(invitation.id)}
                                            disabled={isFetching} // Disable buttons during any fetch operation
                                            className="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ease-in-out 
                                                       text-green-200 bg-green-600/30 hover:bg-green-600/50 border border-green-500/60 
                                                       hover:shadow-[0_0_10px_rgba(34,197,94,0.4)] focus:outline-none focus:ring-1 focus:ring-green-500/80 disabled:opacity-50"
                                            whileHover={{ scale: isFetching ? 1 : 1.05, y: isFetching ? 0 : -1 }}
                                            whileTap={{ scale: isFetching ? 1 : 0.95 }}
                                        >
                                            <CheckCircleIcon className="h-4 w-4 inline mr-1 -mt-0.5" />
                                            Accept
                                        </motion.button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </motion.div>
    );
};

export default Notifications; 