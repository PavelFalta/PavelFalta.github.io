import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Role, InvitationsApi, AuthApi, Board } from '../api';
import { Link } from 'react-router-dom';
import { ActiveUser } from '../hooks/useBoardWebSocket';
import { useApiClient } from '../hooks/useApiClient';
import { useBoardWebSocket } from '../hooks/useBoardWebSocket';
import { toast } from 'react-hot-toast';
import { ChevronDownIcon, ArrowRightOnRectangleIcon, UserGroupIcon, BellIcon, UserCircleIcon, Cog8ToothIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import BoardMemberManager from './BoardMemberManager';
import Notifications from './Notifications';
import ProfilePanel from './ProfilePanel';
import SettingsModal from './SettingsModal';

interface HeaderProps {
    currentUser: User | null;
    onLogout: () => void;
    currentBoardName: string | null;
    selectedBoardId: number | null;
    currentUserRole?: Role | null;
    onOpenCreateBoardModal?: () => void;
    onUserUpdated: () => void;
    onAccountDeactivated: () => void;
    onReturnToBoardSelection?: () => void;
    onInvitationAccepted: () => void;
}

const MAX_DISPLAY_AVATARS = 5;

const Header: React.FC<HeaderProps> = ({ 
    currentUser, 
    onLogout, 
    currentBoardName,
    selectedBoardId,
    currentUserRole,
    onOpenCreateBoardModal,
    onUserUpdated,
    onAccountDeactivated,
    onReturnToBoardSelection,
    onInvitationAccepted
}) => {
    const [isBoardDropdownOpen, setIsBoardDropdownOpen] = useState(false);
    const boardDropdownRef = useRef<HTMLDivElement>(null);
    const { boardsApi, invitationsApi, authApi } = useApiClient();
    
    const { sendMessage, activeUsers } = useBoardWebSocket(selectedBoardId ?? null);

    // Add effect to monitor active users changes
    useEffect(() => {
        if (activeUsers) {
            console.log('Active users in Header:', activeUsers);
        }
    }, [activeUsers]);

    const [activePanel, setActivePanel] = useState<'notifications' | 'memberManager' | 'profile' | null>(null);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [currentNotificationsCount, setCurrentNotificationsCount] = useState(0);

    useEffect(() => {
        const fetchInitialInvites = async () => {
            if (!invitationsApi) return;
            try {
                const initialInvites = await invitationsApi.getMyPendingInvitationsApiUsersMeInvitationsGet();
                setCurrentNotificationsCount(initialInvites.length);
            } catch (error) {
                console.error("Failed to fetch initial invitations count:", error);
            }
        };
        if (currentUser && invitationsApi) {
            fetchInitialInvites();
            const intervalId = setInterval(fetchInitialInvites, 30000);
            return () => clearInterval(intervalId);
        }
    }, [invitationsApi, currentUser]);

    const currentUserActiveInfo = currentUser ? activeUsers?.find(au => au.user_id === currentUser.id) : null;
    const effectiveUserColor = currentUserActiveInfo?.color || currentUser?.color || '#cccccc';

    // Memoize visible active users to prevent unnecessary recalculations
    const visibleActiveUsers = useMemo(() => {
        console.log('Calculating visible active users:', activeUsers);
        return activeUsers ? activeUsers.slice(0, MAX_DISPLAY_AVATARS) : [];
    }, [activeUsers]);
    
    const hiddenActiveUsersCount = useMemo(() => {
        console.log('Calculating hidden active users count:', activeUsers);
        return activeUsers ? Math.max(0, activeUsers.length - MAX_DISPLAY_AVATARS) : 0;
    }, [activeUsers]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (boardDropdownRef.current && !boardDropdownRef.current.contains(event.target as Node)) {
                setIsBoardDropdownOpen(false);
            }
            if (activePanel) {
                const panelElement = document.getElementById(`header-panel-${activePanel}`);
                if (panelElement && !panelElement.contains(event.target as Node)) {
                    const toggleButton = document.getElementById(`toggle-button-${activePanel}`);
                    if (!toggleButton || !toggleButton.contains(event.target as Node)) {
                         setActivePanel(null);
                    }
                }
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [activePanel]);

    const togglePanel = (panelName: 'notifications' | 'memberManager' | 'profile') => {
        setActivePanel(prev => prev === panelName ? null : panelName);
    };

    const isOwner = currentUserRole === Role.Owner;
    const isEditor = currentUserRole === Role.Editor;

    return (
        <>
            <header className="p-4 flex justify-between items-center w-full z-30 bg-gray-800/50 backdrop-blur-sm sticky top-0 border-b border-gray-700/60 shadow-sm">
                {/* Left Section: Back Button, ThoughtSpace Title, Current Board Name */}
                <div className="flex items-center space-x-0"> {/* Reduced space-x-4 to space-x-2 for tighter fit with back arrow */} 
            <motion.h1 
                        className={`text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 ${selectedBoardId && onReturnToBoardSelection ? 'cursor-pointer' : ''}`}
                style={{
                    textShadow: '0 0 10px rgba(147, 51, 234, 0.7), 0 0 20px rgba(79, 70, 229, 0.5)',
                    letterSpacing: '1px'
                }}
                        whileHover={selectedBoardId && onReturnToBoardSelection ? { scale: 1.02, textShadow: '0 0 15px rgba(147, 51, 234, 0.9), 0 0 25px rgba(79, 70, 229, 0.7)'} : {}}
                transition={{ duration: 0.2 }}
                        onClick={selectedBoardId && onReturnToBoardSelection ? onReturnToBoardSelection : undefined}
                        title={selectedBoardId && onReturnToBoardSelection ? "Back to Board Selection" : "ThoughtSpace"}
            >
                ThoughtSpace
            </motion.h1>
                    {currentBoardName && (
                        <span className="text-xl text-gray-400 font-medium ml-2">/ {currentBoardName}</span>
                    )}
                </div>

                {/* Center Section - Intentionally left empty or for global actions if any in future */}
                <div className="flex-grow flex justify-center items-center px-4"></div>

                {/* Right Section: Active Users, Member Manager, Notifications, Profile, Settings, Username, Logout */}
                <div className="flex items-center space-x-3">
                    {currentUser && (
                        <>
                            {/* Active Users Display */}
                            {selectedBoardId && activeUsers && activeUsers.length > 0 && (
                                <div className="flex items-center space-x-2 pr-3 border-r border-gray-600/70 mr-1">
                                    {visibleActiveUsers.map(activeUser => (
                                        <div 
                                            key={activeUser.user_id} 
                                            className="w-7 h-7 rounded-full border-2 border-gray-500/70 relative group tooltip-container shadow-inner"
                                            style={{ backgroundColor: activeUser.color || '#808080' }}
                                            title={activeUser.username}
                                        >
                                            {/* Avatar content or image can go here */}
                                        </div>
                                    ))}
                                    {hiddenActiveUsersCount > 0 && (
                                        <div 
                                            className="w-7 h-7 rounded-full border-2 border-gray-600 bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-300 shadow-inner"
                                            title={`${hiddenActiveUsersCount} more user(s) active`}
                                        >
                                            +{hiddenActiveUsersCount}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* Manage Members Button */}
                            {selectedBoardId && (isOwner || isEditor) && (
                                <div className="relative">
                                    <motion.button
                                        id="toggle-button-memberManager"
                                        onClick={() => togglePanel('memberManager')}
                                        className="relative p-2.5 rounded-full focus:outline-none transition-all duration-200 ease-in-out bg-gray-700/50 hover:bg-gray-600/70 shadow-md hover:shadow-lg focus:ring-2 focus:ring-purple-500/70 focus:shadow-[0_0_10px_rgba(139,92,246,0.5)] hover:shadow-purple-500/30"
                                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} title="Manage Board Members"
                                    >
                                        <UserGroupIcon className="h-6 w-6 text-purple-300 group-hover:text-purple-200 transition-colors" />
                                    </motion.button>
                                    {activePanel === 'memberManager' && (
                                        <div id="header-panel-memberManager">
                                            <BoardMemberManager 
                                                apiClient={{ boardsApi }}
                                                boardId={selectedBoardId} 
                                                isVisible={activePanel === 'memberManager'} 
                                                onClose={() => setActivePanel(null)} 
                                                currentUser={currentUser}
                                            />
                        </div>
                    )}
                </div>
            )}

                            {/* Notifications Button */}
                            <div className="relative">
                                <motion.button
                                    id="toggle-button-notifications"
                                    onClick={() => togglePanel('notifications')}
                                    className="relative p-2.5 rounded-full focus:outline-none transition-all duration-200 ease-in-out bg-gray-700/50 hover:bg-gray-600/70 shadow-md hover:shadow-lg focus:ring-2 focus:ring-purple-500/70 focus:shadow-[0_0_10px_rgba(139,92,246,0.5)] hover:shadow-purple-500/30"
                                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} title="Notifications"
                                >
                                    <BellIcon className="h-6 w-6 text-purple-300 group-hover:text-purple-200 transition-colors" />
                                    {currentNotificationsCount > 0 && (
                                        <motion.span 
                                        className="absolute -top-0.5 -right-0.5 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-gray-800 shadow-sm"
                                        animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                                    />)}
                                </motion.button>
                                {activePanel === 'notifications' && invitationsApi && (
                                    <div id="header-panel-notifications">
                                        <Notifications 
                                            apiClient={{ invitationsApi }}
                                            isVisible={activePanel === 'notifications'} 
                                            onClose={() => setActivePanel(null)} 
                                            onInvitationAccepted={() => {
                                                onInvitationAccepted();
                                                invitationsApi.getMyPendingInvitationsApiUsersMeInvitationsGet()
                                                    .then(invites => setCurrentNotificationsCount(invites.length))
                                                    .catch(err => console.error("Failed to refresh notification count:", err));
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Profile Panel Button */}
                            <div className="relative">
                                <motion.button
                                    id="toggle-button-profile"
                                    onClick={() => togglePanel('profile')}
                                    className="relative p-2.5 rounded-full focus:outline-none transition-all duration-200 ease-in-out bg-gray-700/50 hover:bg-gray-600/70 shadow-md hover:shadow-lg focus:ring-2 focus:ring-purple-500/70 focus:shadow-[0_0_10px_rgba(139,92,246,0.5)] hover:shadow-purple-500/30"
                                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} title="View Profile"
                                >
                                    <UserCircleIcon className="h-6 w-6 text-purple-300 group-hover:text-purple-200 transition-colors" />
                                </motion.button>
                                {activePanel === 'profile' && (
                                    <div id="header-panel-profile">
                                        <ProfilePanel 
                                            isVisible={activePanel === 'profile'}
                                            onClose={() => setActivePanel(null)}
                                            currentUser={currentUser}
                                            apiClient={{ authApi }}
                                            selectedBoardId={selectedBoardId}
                                            selectedBoardName={currentBoardName}
                                            currentUserRole={currentUserRole || null}
                                            initialBoardSpecificColor={effectiveUserColor || undefined}
                                            webSocketSendMessage={sendMessage}
                                            onUserUpdated={onUserUpdated}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Settings Modal Button */}
                            <div className="relative">
                                <motion.button
                                    onClick={() => setIsSettingsModalOpen(true)}
                                    className="relative p-2.5 rounded-full focus:outline-none transition-all duration-200 ease-in-out bg-gray-700/50 hover:bg-gray-600/70 shadow-md hover:shadow-lg focus:ring-2 focus:ring-purple-500/70 focus:shadow-[0_0_10px_rgba(139,92,246,0.5)] hover:shadow-purple-500/30"
                                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} title="Account Settings"
                                >
                                    <Cog8ToothIcon className="h-6 w-6 text-purple-300 group-hover:text-purple-200 transition-colors" />
                                </motion.button>
                            </div>

                            {/* Updated Username Display */}
                            <div className="flex items-center px-2 py-1.5 rounded-lg hover:bg-gray-700/60 transition-colors duration-150 cursor-default">
                                <span className="text-sm font-semibold text-gray-100">
                                    {currentUser.username}
                                </span>
                                {currentUserRole && selectedBoardId && (
                                    <span className="text-xs font-medium text-purple-400 ml-1.5">({currentUserRole})</span>
                                )}
                            </div>
                        
                            {/* Logout Button */}
                <motion.button
                    onClick={onLogout}
                    className="p-2.5 rounded-full bg-slate-800 border-2 border-red-500 text-red-400 hover:text-red-300 hover:border-red-400 hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500 transition-all duration-200 ease-in-out shadow-lg shadow-red-500/30 hover:shadow-red-400/50 flex items-center justify-center"
                    aria-label="Logout"
                    title="Logout"
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </motion.button>
                        </>
                    )}
                </div>
            </header>
            {isSettingsModalOpen && currentUser && authApi && (
                <SettingsModal 
                    isOpen={isSettingsModalOpen}
                    onClose={() => setIsSettingsModalOpen(false)}
                    apiClient={{authApi: authApi}}
                    currentUser={currentUser}
                    onUserUpdated={onUserUpdated}
                    onAccountDeactivated={onAccountDeactivated}
                />
            )}
        </>
    );
};

export default Header; 