import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { BoardsApi, Role, BoardMembership, BoardMembershipUpdate, User } from '../api';
import toast from '../utils/toast';

interface ManageMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    boardId: number;
    boardsApi: BoardsApi;
    currentUserRole: Role | null; // To check if owner
    currentUserId: number; // Added currentUserId
}

const ManageMembersModal: React.FC<ManageMembersModalProps> = ({ 
    isOpen, 
    onClose, 
    boardId, 
    boardsApi, 
    currentUserRole, 
    currentUserId // Added currentUserId
}) => {
    const [members, setMembers] = useState<BoardMembership[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isOwner = currentUserRole === Role.Owner;

    const fetchMembers = useCallback(async () => {
        if (!boardId) return;
        setIsLoading(true);
        setError(null);
        try {
            const fetchedMembers = await boardsApi.listBoardMembersApiBoardsBoardIdMembersGet({ boardId });
            setMembers(fetchedMembers || []);
        } catch (err: any) {
            console.error("Failed to fetch board members:", err);
            setError("Could not load board members.");
            toast.error("Could not load board members.");
        } finally {
            setIsLoading(false);
        }
    }, [boardId, boardsApi]);

    useEffect(() => {
        if (isOpen) {
            fetchMembers();
        }
    }, [isOpen, fetchMembers]);

    const handleRoleChange = async (membershipId: number, userId: number, newRole: Role) => {
        if (!isOwner) return toast.error("Only owners can change roles.");
        
        const membershipUpdate: BoardMembershipUpdate = { role: newRole };
        const loadingToastId = toast.loading('Updating role...');
        try {
            await boardsApi.updateMemberRoleApiBoardsBoardIdMembersUserIdToModifyPut({
                boardId: boardId,
                userIdToModify: userId,
                boardMembershipUpdate: membershipUpdate
            });
            toast.success('User role updated!', { id: loadingToastId });
            fetchMembers(); // Re-fetch members to show updated role
            // TODO: Ideally, rely on WebSocket broadcast if backend sends one for this action
        } catch (err: any) {
            console.error("Failed to update role:", err);
            toast.error(`Failed to update role: ${err.message || 'Error'}`, { id: loadingToastId });
        }
    };

    const handleRemoveMember = async (membershipId: number, userId: number, username: string) => {
        if (!isOwner) return toast.error("Only owners can remove members.");
        
        if (userId === currentUserId) { // Prevent owner from removing themselves
            toast.error("Owners cannot remove themselves from the board.");
            return;
        }

        // Basic confirmation
        if (!window.confirm(`Are you sure you want to remove ${username} from this board?`)) {
            return;
        }
        
        const loadingToastId = toast.loading(`Removing ${username}...`);
        try {
            await boardsApi.removeMemberFromBoardApiBoardsBoardIdMembersUserIdToRemoveDelete({
                boardId: boardId,
                userIdToRemove: userId
            });
            toast.success(`${username} removed from board.`, { id: loadingToastId });
            fetchMembers(); // Re-fetch members list
             // TODO: Rely on WebSocket broadcast if backend sends one
        } catch (err: any) {
            console.error("Failed to remove member:", err);
            toast.error(`Failed to remove member: ${err.message || 'Error'}`, { id: loadingToastId });
        }
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out" style={{ opacity: isOpen ? 1 : 0 }}>
            <div className="bg-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-lg transform transition-all duration-300 ease-in-out" style={{ opacity: isOpen ? 1 : 0, transform: isOpen ? 'scale(1)' : 'scale(0.95)' }}>
                <h2 className="text-2xl font-semibold text-white mb-4">Manage Board Members</h2>
                
                {isLoading && <div className="text-center text-gray-400 py-4">Loading members...</div>}
                {error && <div className="text-center text-red-400 py-4">Error: {error}</div>}
                
                {!isLoading && !error && (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                        {members.map(member => (
                            <div key={member.id} className="flex items-center justify-between bg-slate-700 p-3 rounded-lg shadow">
                                <div className="flex items-center space-x-3">
                                    <div 
                                        className={`w-6 h-6 rounded-full border shrink-0 ${member.userId === currentUserId ? 'border-blue-400 ring-2 ring-blue-500' : 'border-gray-400'}`}
                                        style={{ backgroundColor: member.user?.color || '#cccccc' }} 
                                    ></div>
                                    <div>
                                        <span className={`font-medium ${member.userId === currentUserId ? 'text-blue-300' : 'text-white'}`}>{member.user?.username || 'Unknown User'}{member.userId === currentUserId && " (You)"}</span>
                                        <span className="block text-xs text-gray-400">{member.user?.email || 'No email'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    {isOwner && member.userId !== currentUserId && member.role !== Role.Owner ? (
                                        // Role Selector (only for non-owners, non-self if current user is owner)
                                        <select 
                                            value={member.role} 
                                            onChange={(e) => handleRoleChange(member.id, member.userId, e.target.value as Role)} 
                                            className="px-2 py-1 text-xs bg-slate-600 border border-slate-500 rounded-md text-white focus:ring-blue-500 focus:border-blue-500 shadow-sm appearance-none transition-colors"
                                        >
                                            {(Object.values(Role) as Role[]).filter(r => r !== Role.Owner).map(roleValue => (
                                                <option key={roleValue} value={roleValue}>
                                                    {roleValue.charAt(0).toUpperCase() + roleValue.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        // Display Role Text
                                        <span className="text-sm text-gray-300 px-2 py-1 bg-slate-600 rounded-md">
                                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                        </span>
                                    )}
                                    {isOwner && member.userId !== currentUserId && member.role !== Role.Owner ? (
                                        // Remove Button (only for non-owners, non-self if current user is owner)
                                        <button 
                                            onClick={() => handleRemoveMember(member.id, member.userId, member.user?.username || 'this user')}
                                            className="p-1 text-red-400 hover:text-red-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                                            title="Remove Member"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    ) : (
                                        <div className="w-7"></div> // Placeholder to keep alignment
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-end mt-6">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-4 py-2 text-sm font-medium text-gray-300 bg-slate-700 hover:bg-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ManageMembersModal; 