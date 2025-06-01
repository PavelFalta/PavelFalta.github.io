import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom'; // Import ReactDOM for portals
import { BoardsApi, Role, BoardInvitationCreate } from '../api'; // Correct import for BoardInvitationCreate
import toast from '../utils/toast';

interface AddMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    boardId: number;
    boardsApi: BoardsApi; // To make the API call
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, onClose, boardId, boardsApi }) => {
    const [email, setEmail] = useState('');
    const [selectedRole, setSelectedRole] = useState<Role>(Role.Viewer); // Default to 'viewer'
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Reset fields when modal is opened or closed
        if (isOpen) {
            setEmail('');
            setSelectedRole(Role.Viewer);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!email.trim()) {
            toast.error('Please enter an email address.');
            return;
        }
        setIsSubmitting(true);
        
        const invitationCreate: BoardInvitationCreate = {
            invitedUserEmail: email,
            role: selectedRole,
        };

        try {
            // console.log('Submitting:', { boardId, invitationCreate });
            await boardsApi.inviteMemberToBoardApiBoardsBoardIdMembersPost({
                boardId: boardId,
                boardInvitationCreate: invitationCreate,
            });
            toast.success(`Successfully invited ${email} as ${selectedRole}.`);
            onClose(); // Close modal on success
        } catch (error: any) {
            console.error('Failed to add member:', error);
            const errorDetail = error.response?.detail || error.message || 'An unknown error occurred.';
            toast.error(`Failed to add member: ${errorDetail}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // Use ReactDOM.createPortal to render the modal at the body level
    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out" style={{ opacity: isOpen ? 1 : 0 }}>
            <div className="bg-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 ease-in-out" style={{ opacity: isOpen ? 1 : 0, transform: isOpen ? 'scale(1)' : 'scale(0.95)' }}>
                <h2 className="text-2xl font-semibold text-white mb-6">Add Member to Board</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">User Email</label>
                        <input 
                            type="email" 
                            id="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-colors"
                            placeholder="user@example.com"
                            required 
                        />
                    </div>
                    <div className="mb-6">
                        <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-1">Role</label>
                        <select 
                            id="role" 
                            value={selectedRole} 
                            onChange={(e) => setSelectedRole(e.target.value as Role)} 
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500 shadow-sm appearance-none transition-colors"
                        >
                            {/* Filter out 'owner' as it's usually not assignable directly */}
                            {(Object.values(Role) as Role[]).filter(r => r !== Role.Owner).map(roleValue => (
                                <option key={roleValue} value={roleValue}>
                                    {roleValue.charAt(0).toUpperCase() + roleValue.slice(1)} 
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-gray-300 bg-slate-700 hover:bg-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Adding...' : 'Add Member'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body // Target container for the portal
    );
};

export default AddMemberModal; 