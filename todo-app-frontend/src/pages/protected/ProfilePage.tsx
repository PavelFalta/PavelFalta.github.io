import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApiClient } from '../../hooks/useApiClient';
import { UserUpdate } from '../../api'; // Import UserUpdate type from SDK
import toast from '../../utils/toast';
import { ChromePicker, ColorResult } from 'react-color';

const ProfilePage: React.FC = () => {
    const { user, token } = useAuth(); // Removed fetchCurrentUser
    const { authApi } = useApiClient();

    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState(''); // Optional: Require current pass for changes
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [color, setColor] = useState('#cccccc');
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (user) {
            setEmail(user.email || '');
            setColor(user.color || '#cccccc');
        }
    }, [user]);

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};
        let isValid = true;

        // Validate email format (simple regex)
        if (email && !/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Invalid email format.';
            isValid = false;
        }

        // Validate password only if new password is provided
        if (newPassword) {
            if (newPassword.length < 8) {
                newErrors.newPassword = 'Password must be at least 8 characters.';
                isValid = false;
            }
            if (newPassword !== confirmPassword) {
                newErrors.confirmPassword = 'Passwords do not match.';
                isValid = false;
            }
            // Optional: Add check requiring currentPassword if newPassword is set
            // if (!currentPassword) {
            //     newErrors.currentPassword = 'Current password is required to set a new one.';
            //     isValid = false;
            // }
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);
        setErrors({});

        const payload: UserUpdate = {};
        let changesMade = false;

        if (email !== user?.email) {
            payload.email = email;
            changesMade = true;
        }
        if (newPassword) {
            payload.password = newPassword;
            changesMade = true;
        }
        if (color !== user?.color) {
            payload.color = color;
            changesMade = true;
        }

        if (!changesMade) {
            // Use success toast for info message
            toast.success('No changes detected.'); 
            setIsSubmitting(false);
            return;
        }

        try {
            // Corrected API method name
            const updatedUser = await authApi.updateCurrentUserDetailsApiAuthUsersMePut({ userUpdate: payload });
            toast.success('Profile updated successfully!');
            // Removed fetchCurrentUser call. User state in context won't auto-refresh yet.
            // We would need to expose a refresh function from AuthContext or update state manually here if immediate reflection is needed.
        } catch (err: any) {
            console.error('Profile update error:', err);
            let errorMsg = 'Failed to update profile. Please try again.';
             // Try to parse specific backend errors (e.g., email already exists)
            if (err.body && typeof err.body.detail === 'string') {
                 errorMsg = err.body.detail;
                 // Set specific field errors if possible
                 if (errorMsg.toLowerCase().includes('email')) {
                    setErrors(prev => ({ ...prev, email: errorMsg }));
                 } else {
                    setErrors(prev => ({ ...prev, general: errorMsg }));
                 }
             } else {
                setErrors({ general: errorMsg });
             }
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }
    };

    if (!user) {
        return <div className="p-6 text-white">Loading user profile...</div>;
    }

    return (
        <div className="p-6 max-w-2xl mx-auto bg-gray-800 rounded-lg shadow-xl mt-10">
            <h1 className="text-2xl font-bold text-white mb-6">User Profile</h1>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Username (Display Only) */}
                <div>
                    <label htmlFor="username" className="block mb-2 text-sm font-medium text-gray-400">
                        Username
                    </label>
                    <input
                        type="text"
                        id="username"
                        value={user.username || ''}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-300 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Username cannot be changed.</p>
                </div>

                {/* Email */}
                <div>
                    <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-300">
                        Email Address
                    </label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'}`}
                        placeholder="your.email@example.com"
                        disabled={isSubmitting}
                    />
                    {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
                </div>
                
                 {/* Color Picker */}
                 <div>
                    <label className="block mb-2 text-sm font-medium text-gray-300">
                        Profile Color
                    </label>
                    <div className="flex items-center space-x-3">
                        <div 
                            className="w-10 h-10 rounded-full border-2 border-gray-500 cursor-pointer"
                            style={{ backgroundColor: color }}
                            onClick={() => setShowColorPicker(prev => !prev)}
                        />
                        <span className="text-gray-400">Click swatch to change</span>
                    </div>
                    {showColorPicker && (
                        <div className="absolute mt-2 z-50">
                            <div className="fixed inset-0" onClick={() => setShowColorPicker(false)} /> 
                            <ChromePicker 
                                color={color}
                                onChange={(c: ColorResult) => setColor(c.hex)}
                                disableAlpha={true} 
                            />
                        </div>
                    )}
                 </div>

                {/* Change Password Section */}
                <fieldset className="border border-gray-600 rounded-lg p-4">
                    <legend className="text-sm font-medium text-gray-400 px-2">Change Password (optional)</legend>
                    <div className="space-y-4 mt-2">
                         {/* Optional: Current Password 
                         <div>
                            <label htmlFor="currentPassword" className="block mb-2 text-sm font-medium text-gray-300">
                                Current Password
                            </label>
                            <input
                                type="password"
                                id="currentPassword"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent ${errors.currentPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'}`}
                                placeholder="Enter current password"
                                disabled={isSubmitting}
                            />
                            {errors.currentPassword && <p className="text-xs text-red-400 mt-1">{errors.currentPassword}</p>}
                         </div>
                         */} 
                        <div>
                            <label htmlFor="newPassword" className="block mb-2 text-sm font-medium text-gray-300">
                                New Password
                            </label>
                            <input
                                type="password"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent ${errors.newPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'}`}
                                placeholder="New password (min 8 chars)"
                                disabled={isSubmitting}
                            />
                            {errors.newPassword && <p className="text-xs text-red-400 mt-1">{errors.newPassword}</p>}
                        </div>
                        <div>
                            <label htmlFor="confirmPassword" className="block mb-2 text-sm font-medium text-gray-300">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'}`}
                                placeholder="Confirm new password"
                                disabled={isSubmitting}
                            />
                            {errors.confirmPassword && <p className="text-xs text-red-400 mt-1">{errors.confirmPassword}</p>}
                        </div>
                    </div>
                </fieldset>

                {errors.general && <p className="text-sm text-red-400 text-center">{errors.general}</p>}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {isSubmitting ? (
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : null}
                    {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
            </form>
        </div>
    );
};

export default ProfilePage; 