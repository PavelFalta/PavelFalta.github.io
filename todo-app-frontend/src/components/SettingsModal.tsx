import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, AuthApi, UserUpdate } from '../api';
import { toast } from 'react-hot-toast';
import { XMarkIcon, EyeIcon, EyeSlashIcon, ExclamationTriangleIcon, ArrowPathIcon, EnvelopeIcon, KeyIcon, Cog8ToothIcon } from '@heroicons/react/24/solid';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User | null;
    apiClient: { 
        authApi: AuthApi;
    };
    onUserUpdated: () => void; 
    onAccountDeactivated: () => void;
}

type ActiveTab = 'email' | 'password' | 'account';

const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    onClose,
    currentUser,
    apiClient,
    onUserUpdated,
    onAccountDeactivated,
}) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('password');

    // Email States (New Feature - Placeholder)
    const [newEmail, setNewEmail] = useState(currentUser?.email || '');
    const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('');
    const [emailUpdateLoading, setEmailUpdateLoading] = useState(false);
    const [emailUpdateError, setEmailUpdateError] = useState<string | null>(null);

    // Password States (Moved from ProfilePanel)
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPasswordForUpdate, setNewPasswordForUpdate] = useState(''); // Renamed to avoid conflict
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordUpdateLoading, setPasswordUpdateLoading] = useState(false);
    const [passwordUpdateError, setPasswordUpdateError] = useState<string | null>(null);

    // Deactivate Account States (Moved from ProfilePanel)
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setNewEmail(currentUser.email || '');
        }
        // Reset forms when modal is closed or user changes
        if (!isOpen) {
            setCurrentPasswordForEmail('');
            setCurrentPassword('');
            setNewPasswordForUpdate('');
            setConfirmNewPassword('');
            setDeleteConfirmText('');
            setEmailUpdateError(null);
            setPasswordUpdateError(null);
            setActiveTab('password'); // Default tab
        }
    }, [isOpen, currentUser]);

    const handleUpdateEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailUpdateError(null);

        if (!currentUser) {
            setEmailUpdateError("User not found. Please try again.");
            toast.error("Action failed: User not available.");
            return;
        }

        if (!newEmail.trim() || !currentPasswordForEmail.trim()) {
            setEmailUpdateError("New email and current password are required.");
            return;
        }
        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            setEmailUpdateError("Please enter a valid email address.");
            return;
        }

        setEmailUpdateLoading(true);
        try {
            // Step 1: Verify current password
            try {
                await apiClient.authApi.loginForAccessTokenApiAuthTokenPost({
                    username: currentUser.email, // Assuming email is used as username for login
                    password: currentPasswordForEmail,
                });
            } catch (authError) {
                setEmailUpdateError("Incorrect current password. Please try again.");
                toast.error("Email update failed: Incorrect current password.");
                setEmailUpdateLoading(false);
                return;
            }

            // Step 2: If password is correct, proceed to update email
            await apiClient.authApi.updateCurrentUserDetailsApiAuthUsersMePut({
                userUpdate: { email: newEmail } 
            });
            toast.success("Email updated successfully!");
            onUserUpdated(); 
            // setCurrentPasswordForEmail(''); 
        } catch (error: any) {
            const apiErrorMessage = error.response?.data?.detail || error.message || "Failed to update email.";
            setEmailUpdateError(apiErrorMessage);
            toast.error(`Email update failed: ${apiErrorMessage}`);
        } finally {
            setEmailUpdateLoading(false);
        }
    };
    
    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordUpdateError(null);

        if (!currentUser) {
            setPasswordUpdateError("User not found. Please try again.");
            toast.error("Action failed: User not available.");
            return;
        }

        if (newPasswordForUpdate !== confirmNewPassword) {
            setPasswordUpdateError("New passwords do not match.");
            return;
        }
        if (!currentPassword || !newPasswordForUpdate) {
            setPasswordUpdateError("All password fields are required.");
            return;
        }
        if (newPasswordForUpdate.length < 8) {
            setPasswordUpdateError("New password must be at least 8 characters long.");
            return;
        }
        setPasswordUpdateLoading(true);
        try {
            // Step 1: Verify current password
            try {
                await apiClient.authApi.loginForAccessTokenApiAuthTokenPost({
                    username: currentUser.email, // Assuming email is used as username for login
                    password: currentPassword, 
                });
            } catch (authError) {
                setPasswordUpdateError("Incorrect current password. Please try again.");
                toast.error("Password update failed: Incorrect current password.");
                setPasswordUpdateLoading(false);
                return;
            }

            // Step 2: If password is correct, proceed to update password
            // --- SECURITY WARNING --- 
            // The available apiClient.authApi.updateCurrentUserDetailsApiAuthUsersMePut method 
            // takes a UserUpdate object which only has a single 'password' field (for the new password).
            // This frontend code collects the 'currentPassword', but this specific API call DOES NOT SEND IT.
            // IF THE BACKEND DOES NOT INDEPENDENTLY VERIFY THE CURRENT PASSWORD FOR THE ACTIVE SESSION
            // WHEN THIS ENDPOINT IS CALLED WITH A NEW PASSWORD, IT IS A SECURITY RISK.
            // A dedicated backend endpoint that explicitly requires 'current_password' and 'new_password' is highly recommended.
            console.log(
                'Attempting to update password. New password:', newPasswordForUpdate, 
                '(SECURITY NOTE: Current password was collected by UI but NOT sent by this API call. Backend must verify session + current password if required.)'
            );

            await apiClient.authApi.updateCurrentUserDetailsApiAuthUsersMePut({
                userUpdate: { password: newPasswordForUpdate } 
            });
            
            toast.success("Password updated successfully!");
            setCurrentPassword('');
            setNewPasswordForUpdate('');
            setConfirmNewPassword('');
            // Consider if onUserUpdated() or even a forced re-login via onAccountDeactivated() is appropriate after password change.
            // For now, just clearing fields and showing success.
            onUserUpdated(); // Call to refresh user state, may or may not be needed depending on session handling.

        } catch (error: any) {
            const apiErrorMessage = error.response?.data?.detail || error.message || "Failed to update password.";
            setPasswordUpdateError(apiErrorMessage);
            toast.error(`Password update failed: ${apiErrorMessage}`);
        } finally {
            setPasswordUpdateLoading(false);
        }
    };

    const handleDeactivateAccount = async () => {
        if (deleteConfirmText !== "DEACTIVATE") return;
        setDeleteAccountLoading(true);
        try {
            await apiClient.authApi.updateCurrentUserDetailsApiAuthUsersMePut({
                userUpdate: { isActive: false } 
            });
            toast.success("Account deactivated. You will be logged out.");
            setTimeout(() => {
                onAccountDeactivated(); 
                onClose(); // Close modal after triggering deactivation
            }, 1500);
        } catch (error) {
            console.error("Failed to deactivate account:", error);
            toast.error("Failed to deactivate account.");
            setDeleteAccountLoading(false);
        }
    };

    if (!isOpen || !currentUser) {
        return null;
    }
    
    const TabButton: React.FC<{tab: ActiveTab; label: string; icon: React.ReactNode}> = ({tab, label, icon}) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ease-in-out
                        ${activeTab === tab 
                            ? 'bg-purple-600 text-white shadow-lg transform scale-105' 
                            : 'bg-gray-700 hover:bg-gray-600/70 text-gray-300 hover:text-white'}`}
        >
            {icon}
            <span>{label}</span>
        </button>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={onClose} // Close on backdrop click
                >
                    <motion.div
                        key="settings-modal-content"
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: "circOut" }}
                        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg text-gray-100 flex flex-col overflow-hidden"
                        style={{
                            background: 'linear-gradient(145deg, rgba(31, 41, 55, 0.98) 0%, rgba(17, 24, 39, 1) 100%)',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 30px rgba(128, 90, 213, 0.2)',
                        }}
                        onClick={(e) => e.stopPropagation()} // Prevent close on modal content click
                    >
                        {/* Modal Header */}
                        <div className="p-5 border-b border-gray-700/60 flex justify-between items-center shrink-0 bg-gray-800/50">
                            <div className="flex items-center space-x-2">
                                <Cog8ToothIcon className="w-6 h-6 text-purple-400"/>
                                <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                                    Account Settings
                                </h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                                title="Close Settings"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="p-4 bg-gray-800/30 border-b border-gray-700/50 flex space-x-2 justify-center">
                            <TabButton tab="password" label="Password" icon={<KeyIcon className="w-5 h-5"/>} />
                            <TabButton tab="email" label="Email" icon={<EnvelopeIcon className="w-5 h-5"/>} />
                            <TabButton tab="account" label="Account" icon={<ExclamationTriangleIcon className="w-5 h-5"/>} />
                        </div>

                        {/* Modal Body - Tab Content */}
                        <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700/50 p-6" style={{maxHeight: 'calc(100vh - 300px)'}}>
                            {activeTab === 'email' && (
                                <motion.section key="email-section" initial={{opacity:0, x:10}} animate={{opacity:1, x:0}} transition={{duration: 0.3}}>
                                    <h4 className="text-lg font-semibold text-gray-200 mb-4">Update Email</h4>
                                    <p className="text-xs text-gray-400 mb-4">
                                        To change your email address, please enter your new email and your current password for verification.
                                    </p>
                                    <form onSubmit={handleUpdateEmail} className="space-y-4">
                                        <div>
                                            <label htmlFor="newEmailSettings" className="block text-sm font-medium text-gray-400 mb-1">New Email Address</label>
                                            <input 
                                                type="email"
                                                id="newEmailSettings" 
                                                value={newEmail} 
                                                onChange={(e) => setNewEmail(e.target.value)}
                                                className="w-full px-3.5 py-2.5 bg-gray-700 border border-gray-600 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-sm text-gray-100 placeholder-gray-500"
                                                required 
                                            />
                                        </div>
                                        <div className="relative">
                                            <label htmlFor="currentPasswordForEmail" className="block text-sm font-medium text-gray-400 mb-1">Current Password</label>
                                            <input 
                                                type={showCurrentPassword ? "text" : "password"} 
                                                id="currentPasswordForEmail" 
                                                value={currentPasswordForEmail} 
                                                onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
                                                className="w-full px-3.5 py-2.5 bg-gray-700 border border-gray-600 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-sm text-gray-100 placeholder-gray-500"
                                                required 
                                            />
                                             <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-9 text-gray-400 hover:text-gray-200">
                                                {showCurrentPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                            </button>
                                        </div>
                                        {emailUpdateError && <p className="text-xs text-red-400">{emailUpdateError}</p>}
                                        <button 
                                            type="submit" 
                                            disabled={emailUpdateLoading}
                                            className="w-full px-5 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:brightness-110 shadow-md hover:shadow-lg transition-all duration-200 text-sm font-semibold disabled:opacity-60 flex items-center justify-center"
                                        >
                                            {emailUpdateLoading ? <ArrowPathIcon className="w-5 h-5 animate-spin"/> : "Update Email"}
                                        </button>
                                    </form>
                                </motion.section>
                            )}
                            {activeTab === 'password' && (
                                <motion.section key="password-section" initial={{opacity:0, x:10}} animate={{opacity:1, x:0}} transition={{duration: 0.3}}>
                                    <h4 className="text-lg font-semibold text-gray-200 mb-4">Update Password</h4>
                                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                                        <div className="relative">
                                            <label htmlFor="currentPasswordSettings" className="block text-sm font-medium text-gray-400 mb-1">Current Password</label>
                                            <input 
                                                type={showCurrentPassword ? "text" : "password"} 
                                                id="currentPasswordSettings" 
                                                value={currentPassword} 
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                className="w-full px-3.5 py-2.5 bg-gray-700 border border-gray-600 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-sm text-gray-100 placeholder-gray-500"
                                                required 
                                            />
                                            <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-9 text-gray-400 hover:text-gray-200">
                                                {showCurrentPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <label htmlFor="newPasswordSettings" className="block text-sm font-medium text-gray-400 mb-1">New Password</label>
                                            <input 
                                                type={showNewPassword ? "text" : "password"} 
                                                id="newPasswordSettings" 
                                                value={newPasswordForUpdate} 
                                                onChange={(e) => setNewPasswordForUpdate(e.target.value)}
                                                className="w-full px-3.5 py-2.5 bg-gray-700 border border-gray-600 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-sm text-gray-100 placeholder-gray-500"
                                                required 
                                            />
                                            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-9 text-gray-400 hover:text-gray-200">
                                                {showNewPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <label htmlFor="confirmNewPasswordSettings" className="block text-sm font-medium text-gray-400 mb-1">Confirm New Password</label>
                                            <input 
                                                type={showConfirmPassword ? "text" : "password"} 
                                                id="confirmNewPasswordSettings" 
                                                value={confirmNewPassword} 
                                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                                className="w-full px-3.5 py-2.5 bg-gray-700 border border-gray-600 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-sm text-gray-100 placeholder-gray-500"
                                                required 
                                            />
                                             <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-9 text-gray-400 hover:text-gray-200">
                                                {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                            </button>
                                        </div>
                                        {passwordUpdateError && <p className="text-xs text-red-400">{passwordUpdateError}</p>}
                                        <button 
                                            type="submit" 
                                            disabled={passwordUpdateLoading}
                                            className="w-full px-5 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:brightness-110 shadow-md hover:shadow-lg transition-all duration-200 text-sm font-semibold disabled:opacity-60 flex items-center justify-center"
                                        >
                                            {passwordUpdateLoading ? <ArrowPathIcon className="w-5 h-5 animate-spin"/> : "Update Password"}
                                        </button>
                                    </form>
                                </motion.section>
                            )}
                            {activeTab === 'account' && (
                                <motion.section key="account-section" initial={{opacity:0, x:10}} animate={{opacity:1, x:0}} transition={{duration: 0.3}}>
                                    <h4 className="text-lg font-semibold text-red-400 mb-4">Deactivate Account</h4>
                                     <p className="text-xs text-gray-400 mb-4">Deactivating your account will prevent you from logging in. All your data will remain, but you will not be able to access it unless you contact support to reactivate. This action is reversible by contacting support.</p>
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="deleteConfirmSettings" className="block text-sm font-medium text-gray-500 mb-1">Type "DEACTIVATE" to confirm:</label>
                                            <input 
                                                type="text" 
                                                id="deleteConfirmSettings" 
                                                value={deleteConfirmText} 
                                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                                placeholder="DEACTIVATE"
                                                className="w-full px-3.5 py-2.5 bg-gray-700 border border-gray-600 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 text-sm text-gray-100 placeholder-gray-500"
                                            />
                                        </div>
                                        <button 
                                            onClick={handleDeactivateAccount} 
                                            disabled={deleteConfirmText !== 'DEACTIVATE' || deleteAccountLoading}
                                            className="w-full px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md transition-all duration-200 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                        >
                                            {deleteAccountLoading ? <ArrowPathIcon className="w-5 h-5 animate-spin"/> : <><ExclamationTriangleIcon className="w-4 h-4 mr-1.5" /> Deactivate My Account</>}
                                        </button>
                                    </div>
                                </motion.section>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SettingsModal; 