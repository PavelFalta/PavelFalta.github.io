import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, AuthApi, Role } from '../api';
import { ChromePicker, ColorResult } from 'react-color';
import { toast } from 'react-hot-toast';
import { XMarkIcon, InformationCircleIcon, UserCircleIcon as RoleIcon, IdentificationIcon, GlobeAltIcon, HashtagIcon, PaintBrushIcon, EyeIcon } from '@heroicons/react/24/outline';
import ColorPickerPortal from './ColorPickerPortal';

interface ProfilePanelProps {
    isVisible: boolean;
    onClose: () => void;
    currentUser: User | null;
    apiClient: { 
        authApi: AuthApi;
    };
    selectedBoardId: number | null;
    selectedBoardName: string | null;
    currentUserRole: Role | null;
    initialBoardSpecificColor: string | undefined;
    webSocketSendMessage: (action: string, payload: any) => void;
    onUserUpdated: () => void;
}

const ProfilePanel: React.FC<ProfilePanelProps> = ({
    isVisible,
    onClose,
    currentUser,
    apiClient,
    selectedBoardId,
    selectedBoardName,
    currentUserRole,
    initialBoardSpecificColor,
    webSocketSendMessage,
    onUserUpdated,
}) => {
    const [defaultUserColor, setDefaultUserColor] = useState(currentUser?.color || '#cccccc');
    const [previewDefaultColor, setPreviewDefaultColor] = useState(currentUser?.color || '#cccccc');
    const [boardColor, setBoardColor] = useState(initialBoardSpecificColor || currentUser?.color || '#cccccc');
    const [previewBoardColor, setPreviewBoardColor] = useState(initialBoardSpecificColor || currentUser?.color || '#cccccc');
    
    const [isDefaultColorPickerVisible, setIsDefaultColorPickerVisible] = useState(false);
    const [isBoardColorPickerVisible, setIsBoardColorPickerVisible] = useState(false);
    const [defaultColorLoading, setDefaultColorLoading] = useState(false);

    // Refs for the trigger buttons
    const defaultColorTriggerRef = useRef<HTMLButtonElement>(null);
    const boardColorTriggerRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const newColor = currentUser?.color || '#cccccc';
        setDefaultUserColor(newColor);
        setPreviewDefaultColor(newColor);
    }, [currentUser?.color]);

    useEffect(() => {
        const newBoardColor = initialBoardSpecificColor || currentUser?.color || '#cccccc';
        setBoardColor(newBoardColor);
        setPreviewBoardColor(newBoardColor);
    }, [initialBoardSpecificColor, currentUser?.color]);

    useEffect(() => {
        if (!isVisible) {
            setIsDefaultColorPickerVisible(false);
            setIsBoardColorPickerVisible(false);
        }
    }, [isVisible]);

    const handleDefaultColorPreviewChange = (color: ColorResult) => {
        setPreviewDefaultColor(color.hex);
    };

    const handleDefaultColorSave = async () => {
        if (previewDefaultColor === defaultUserColor) return;
        setDefaultUserColor(previewDefaultColor);
        setDefaultColorLoading(true);
        try {
            await apiClient.authApi.updateCurrentUserDetailsApiAuthUsersMePut({
                userUpdate: { color: previewDefaultColor } 
            });
            toast.success("Default color updated!");
            onUserUpdated(); 
        } catch (error) {
            console.error("Failed to update default color:", error);
            toast.error("Failed to update default color.");
            const oldColor = currentUser?.color || '#cccccc';
            setDefaultUserColor(oldColor);
            setPreviewDefaultColor(oldColor);
        } finally {
            setDefaultColorLoading(false);
        }
    };

    const handleBoardColorPreviewChange = (color: ColorResult) => {
        setPreviewBoardColor(color.hex);
    };

    const handleBoardColorSave = () => {
        if (previewBoardColor === boardColor) return;
        setBoardColor(previewBoardColor);
        if (selectedBoardId) { 
            webSocketSendMessage('update_my_board_color', { color: previewBoardColor });
            toast.success(`Color for board '${selectedBoardName || 'current'}' updated!`);
        } else {
            console.warn("Attempted to change board color without a selected board ID.");
        }
    };
    
    const handleCloseAndSaveDefaultColor = () => {
        if (previewDefaultColor !== defaultUserColor) {
            handleDefaultColorSave();
        }
        setIsDefaultColorPickerVisible(false);
    };

    const handleCloseAndSaveBoardColor = () => {
        if (previewBoardColor !== boardColor) {
            handleBoardColorSave();
        }
        setIsBoardColorPickerVisible(false);
    };

    // Add new handlers for color selection
    const handleDefaultColorChange = (color: ColorResult) => {
        handleDefaultColorPreviewChange(color);
        // Don't close the picker, let the user continue selecting
    };

    const handleBoardColorChange = (color: ColorResult) => {
        handleBoardColorPreviewChange(color);
        // Don't close the picker, let the user continue selecting
    };

    if (!isVisible || !currentUser) {
        return null;
    }

    const RoleDisplay: React.FC<{role: Role | null}> = ({role}) => {
        if (!role) return null;
        let roleText = "Member";
        let roleColor = "bg-gray-500";
        let icon = <RoleIcon className="w-4 h-4 mr-1.5" />;

        switch(role) {
            case Role.Owner:
                roleText = "Owner";
                roleColor = "bg-purple-500";
                icon = <IdentificationIcon className="w-4 h-4 mr-1.5 text-purple-200" />;
                break;
            case Role.Editor:
                roleText = "Editor";
                roleColor = "bg-blue-500";
                icon = <PaintBrushIcon className="w-4 h-4 mr-1.5 text-blue-200" />;
                break;
            case Role.Viewer:
                roleText = "Viewer";
                roleColor = "bg-teal-500";
                icon = <EyeIcon className="w-4 h-4 mr-1.5 text-teal-200" />;
                break;
        }
        return (
            <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${roleColor} text-white shadow-sm`}>
                {icon}
                {roleText}
            </div>
        );
    }

    return (
        <motion.div
            key="profile-panel-refactored"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 w-[380px] bg-gray-800/95 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl z-50 text-gray-100 flex flex-col"
            style={{
                boxShadow: '0 10px 25px rgba(0,0,0,0.3), 0 0 20px rgba(88, 81, 216, 0.2)'
            }}
        >
            <div className="p-4 border-b border-gray-700/60 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Your Profile</h3>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                    title="Close Profile"
                >
                    <XMarkIcon className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700/50 p-5 space-y-6">
                
                {selectedBoardId && selectedBoardName ? (
                    <section className="pb-5 border-b border-gray-700/40">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-semibold text-purple-300 uppercase tracking-wider flex items-center">
                                <HashtagIcon className="w-5 h-5 mr-2 text-purple-400"/> Current Board
                            </h4>
                            {currentUserRole && <RoleDisplay role={currentUserRole} />}
                        </div>
                        <p className="text-lg font-semibold text-gray-100 mb-3 ml-1truncate">{selectedBoardName}</p>
                        
                        <div className='relative'>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Color for this Board</label>
                            <div className="flex items-center space-x-2">
                                <button 
                                    ref={boardColorTriggerRef}
                                    onClick={() => setIsBoardColorPickerVisible(prev => !prev)}
                                    className="w-7 h-7 rounded-md border border-gray-500 shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-gray-800 focus:ring-purple-500 transition-all"
                                    style={{ backgroundColor: previewBoardColor, boxShadow: `0 0 7px ${previewBoardColor}` }}
                                    title="Change color for this board"
                                />
                                 <span className="text-sm text-gray-300 tabular-nums">{previewBoardColor}</span>
                            </div>
                            <ColorPickerPortal
                                isOpen={isBoardColorPickerVisible}
                                onClose={handleCloseAndSaveBoardColor}
                                triggerRef={boardColorTriggerRef}
                            >
                                <ChromePicker 
                                    color={previewBoardColor} 
                                    onChange={handleBoardColorChange}
                                    disableAlpha={true} 
                                />
                            </ColorPickerPortal>
                        </div>
                    </section>
                ) : (
                    <section className='text-center py-4 pb-5 border-b border-gray-700/40'>
                        <InformationCircleIcon className="w-10 h-10 mx-auto text-gray-600 mb-2" />
                        <p className="text-sm text-gray-400">No board selected.</p>
                        <p className="text-xs text-gray-500">Board-specific information will appear here.</p>
                    </section>
                )}

                <section>
                    <h4 className="text-sm font-semibold text-purple-300 uppercase tracking-wider mb-3 flex items-center">
                        <GlobeAltIcon className="w-5 h-5 mr-2 text-purple-400"/> General Information
                    </h4>
                    <div className="space-y-2 text-sm mb-4">
                        <p><span className="font-medium text-gray-400 w-24 inline-block">Username:</span> {currentUser.username}</p>
                        <p><span className="font-medium text-gray-400 w-24 inline-block">Email:</span> {currentUser.email}</p>
                    </div>
                    <div className='relative'>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Default Presence Color</label>
                        <div className="flex items-center space-x-2">
                            <button 
                                ref={defaultColorTriggerRef}
                                onClick={() => setIsDefaultColorPickerVisible(prev => !prev)}
                                className={`w-7 h-7 rounded-md border border-gray-500 shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-gray-800 focus:ring-purple-500 transition-all ${defaultColorLoading ? 'animate-pulse' : ''}`}
                                style={{ backgroundColor: previewDefaultColor, boxShadow: `0 0 7px ${previewDefaultColor}` }}
                                title="Change default presence color"
                                disabled={defaultColorLoading}
                            />
                        </div>
                        <ColorPickerPortal
                            isOpen={isDefaultColorPickerVisible}
                            onClose={handleCloseAndSaveDefaultColor}
                            triggerRef={defaultColorTriggerRef}
                        >
                            <ChromePicker 
                                color={previewDefaultColor} 
                                onChange={handleDefaultColorChange}
                                disableAlpha={true} 
                            />
                        </ColorPickerPortal>
                    </div>
                </section>
            </div>
        </motion.div>
    );
};

export default ProfilePanel; 