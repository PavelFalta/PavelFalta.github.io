import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BoardMembership, User, Role, BoardsApi, BoardMembershipUpdate, BoardInvitationCreate } from '../api';
import { useApiClient } from '../hooks/useApiClient';
import { toast } from 'react-hot-toast';
import { XMarkIcon, UserPlusIcon, TrashIcon, ExclamationCircleIcon, ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';

interface BoardMemberManagerProps {
    boardId: number;
    apiClient: { 
        boardsApi: BoardsApi;
    };
    onClose: () => void;
    isVisible: boolean;
    currentUser: User | null;
}

const BoardMemberManager: React.FC<BoardMemberManagerProps> = ({
    boardId,
    apiClient,
    onClose,
    isVisible,
    currentUser,
}) => {
    const [members, setMembers] = useState<BoardMembership[]>([]);
    const [inviteEmail, setInviteEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchMembers = useCallback(async () => {
        if (!boardId) return;
        setIsLoading(true);
        setError(null);
        try {
            const fetchedMembers = await apiClient.boardsApi.listBoardMembersApiBoardsBoardIdMembersGet({ boardId }); 
            setMembers(fetchedMembers);
        } catch (err) {
            console.error("Failed to fetch board members:", err);
            setError("Failed to load members. Please try again.");
            toast.error("Could not load board members.");
        } finally {
            setIsLoading(false);
        }
    }, [boardId, apiClient.boardsApi]);

    useEffect(() => {
        if (isVisible && boardId) {
            fetchMembers();
            setSearchTerm('');
        }
    }, [isVisible, boardId, fetchMembers]);

    const handleInviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim()) {
            toast.error("Please enter an email address.");
            return;
        }
        setInviteLoading(true);
        const invitationCreatePayload: BoardInvitationCreate = { invitedUserEmail: inviteEmail, role: Role.Viewer };
        try {
            await apiClient.boardsApi.inviteMemberToBoardApiBoardsBoardIdMembersPost({ boardId, boardInvitationCreate: invitationCreatePayload });
            toast.success(`Invitation sent to ${inviteEmail}!`);
            setInviteEmail('');
            fetchMembers();
        } catch (err: any) {
            console.error("Failed to invite user:", err);
            const errorMsg = err.response?.data?.detail || "Failed to send invitation. The user might already be a member or the email is invalid.";
            toast.error(errorMsg);
        } finally {
            setInviteLoading(false);
        }
    };

    const handleRemoveMember = async (userIdToRemove: number) => {
        if (currentUser && userIdToRemove === currentUser.id) {
            toast.error("You cannot remove yourself from the board.");
            return;
        }
        try {
            await apiClient.boardsApi.removeMemberFromBoardApiBoardsBoardIdMembersUserIdToRemoveDelete({ boardId, userIdToRemove });
            toast.success("Member removed successfully.");
            fetchMembers();
        } catch (err) {
            console.error("Failed to remove member:", err);
            toast.error("Failed to remove member.");
        }
    };

    const handleRoleChange = async (userIdToUpdate: number, newRole: Role) => {
        const memberToUpdate = members.find(m => m.user.id === userIdToUpdate);
        const isSelfUpdate = !!(currentUser && userIdToUpdate === currentUser.id);

        if (isSelfUpdate && memberToUpdate?.role === Role.Owner && newRole !== Role.Owner) {
            const otherOwners = members.filter(m => m.user.id !== userIdToUpdate && m.role === Role.Owner);
            if (otherOwners.length === 0) {
                toast.error("Cannot relinquish ownership. You are the only owner. Please transfer ownership first.");
                fetchMembers();
                return;
            }
        }

        const payload: BoardMembershipUpdate = { role: newRole };
        try {
            await apiClient.boardsApi.updateMemberRoleApiBoardsBoardIdMembersUserIdToModifyPut({ boardId, userIdToModify: userIdToUpdate, boardMembershipUpdate: payload });
            toast.success("Member role updated.");
            fetchMembers();
        } catch (err) {
            console.error("Failed to update role:", err);
            toast.error("Failed to update member role.");
            fetchMembers();
        }
    };

    const filteredMembers = useMemo(() => {
        if (!searchTerm.trim()) {
            return members;
        }
        const lowerSearchTerm = searchTerm.toLowerCase();
        return members.filter(member => 
            member.user.username.toLowerCase().includes(lowerSearchTerm) ||
            member.user.email.toLowerCase().includes(lowerSearchTerm)
        );
    }, [members, searchTerm]);

    if (!isVisible) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 w-[400px] bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 text-gray-100 flex flex-col"
            style={{
                backdropFilter: 'blur(10px)',
                background: 'linear-gradient(145deg, rgba(31, 41, 55, 0.95) 0%, rgba(17, 24, 39, 0.98) 100%)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3), 0 0 20px rgba(88, 81, 216, 0.2)'
            }}
        >
            <div className="p-4 border-b border-gray-700/60">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Manage Board Access</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                        title="Close"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-5 flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700/50" style={{maxHeight: 'calc(100vh - 250px)'}}>
                <form onSubmit={handleInviteUser} className="space-y-2">
                    <label htmlFor="invite-email" className="block text-sm font-medium text-gray-300">Invite New Member</label>
                    <div className="flex space-x-2">
                        <input
                            id="invite-email"
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="user@example.com"
                            className="flex-grow px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-sm text-gray-100 placeholder-gray-400 transition-colors focus:bg-gray-600/50"
                            disabled={inviteLoading}
                        />
                        <button
                            type="submit"
                            className="px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-md hover:brightness-110 shadow-md hover:shadow-purple-500/30 transition-all duration-200 flex items-center justify-center text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none"
                            disabled={inviteLoading}
                            style={{ minWidth: '80px' }}
                        >
                            {inviteLoading ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <UserPlusIcon className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </form>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <h4 className="text-md font-semibold text-gray-200">Current Members ({filteredMembers.length})</h4>
                        <button 
                            onClick={fetchMembers}
                            disabled={isLoading}
                            className="p-1.5 text-gray-400 hover:text-purple-400 rounded-full hover:bg-gray-700/70 transition-colors disabled:opacity-50 disabled:cursor-wait"
                            title="Refresh Members"
                        >
                            <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="relative">
                        <input 
                            type="text"
                            placeholder="Search members..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 pl-9 bg-gray-700/80 border border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-sm text-gray-100 placeholder-gray-400 transition-colors focus:bg-gray-600/60"
                        />
                        <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"/>
                    </div>

                    {isLoading && <p className="text-sm text-gray-400 text-center py-3">Loading members...</p>}
                    {error && <p className="text-sm text-red-400 flex items-center justify-center py-3"><ExclamationCircleIcon className="w-4 h-4 mr-1.5" />{error}</p>}
                    
                    {!isLoading && !error && filteredMembers.length === 0 && (
                        <p className="text-sm text-gray-400 italic text-center py-3">
                            {searchTerm ? `No members found for "${searchTerm}".` : "No other members on this board yet."}
                        </p>
                    )}

                    {!isLoading && !error && filteredMembers.length > 0 && (
                        <div className="space-y-2 max-h-52 pr-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700/50">
                            {filteredMembers.map((member) => {
                                const isCurrentUserInEntry = !!(currentUser && member.user.id === currentUser.id);
                                const isOnlyOwner = !!(isCurrentUserInEntry && member.role === Role.Owner && members.filter(m => m.role === Role.Owner).length === 1);

                                return (
                                    <motion.div 
                                        key={member.user.id} 
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="flex items-center justify-between p-2.5 bg-gray-700/60 rounded-md border border-gray-600/40 shadow-sm hover:border-purple-500/60 transition-all hover:shadow-purple-500/20"
                                    >
                                        <div className="flex items-center min-w-0 mr-2">
                                            <div 
                                                className="w-7 h-7 rounded-full mr-2.5 border-2 border-gray-500 shrink-0"
                                                style={{ backgroundColor: member.color || member.user.color || '#808080' }}
                                                title={member.user.username}
                                            ></div>
                                            <div className="min-w-0">
                                                <span className="text-sm font-medium text-gray-100 block truncate" title={member.user.username}>{member.user.username}{isCurrentUserInEntry && " (You)"}</span>
                                                <span className="text-xs text-gray-400 block truncate" title={member.user.email}>{member.user.email}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2 shrink-0">
                                            <select
                                                value={member.role}
                                                onChange={(e) => handleRoleChange(member.user.id, e.target.value as Role)}
                                                className="px-2 py-1 bg-gray-600 border border-gray-500 rounded-md text-xs text-gray-200 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-70 disabled:cursor-not-allowed appearance-none text-center"
                                                style={{minWidth: '70px'}}
                                                disabled={isOnlyOwner}
                                                title={isOnlyOwner ? "Transfer ownership to another member first" : "Change role"}
                                            >
                                                <option value={Role.Owner}>Owner</option>
                                                <option value={Role.Editor}>Editor</option>
                                                <option value={Role.Viewer}>Viewer</option>
                                            </select>
                                            <button
                                                onClick={() => handleRemoveMember(member.user.id)}
                                                className="p-1.5 text-red-500 hover:text-red-400 rounded-full hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent focus:outline-none focus:ring-1 focus:ring-red-400"
                                                title={isCurrentUserInEntry ? "You cannot remove yourself" : "Remove Member"}
                                                disabled={isCurrentUserInEntry}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default BoardMemberManager; 