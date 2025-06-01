import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Category, CategoryUpdatePayload } from '../types/domain';
import { ChromePicker, ColorResult, CirclePicker } from 'react-color';
import toast from '../utils/toast';
import { motion, AnimatePresence } from 'framer-motion';
import tinycolor from 'tinycolor2';

// Default color if category.color is null or undefined
const DEFAULT_CATEGORY_COLOR = '#808080'; // Gray

interface CategoryLabelProps {
    category: Category;
    position: { x: number; y: number };
    sendMessage?: (action: string, payload: any) => void;
    onUpdateCategory?: (updatedCategory: Category) => void;
    onColorPreview: (categoryId: number, previewColor: string) => void;
    onColorInteractionEnd: (categoryId: number) => void;
    isViewer?: boolean;
}

const CategoryLabel: React.FC<CategoryLabelProps> = ({ category, position, sendMessage, onUpdateCategory, onColorPreview, onColorInteractionEnd, isViewer }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(category.name);
    const [editedColor, setEditedColor] = useState(category.color || DEFAULT_CATEGORY_COLOR);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Check both name and is_completed property for completed labels
    const isCompletedLabel = category.name.includes('(Completed)') || category.is_completed;

    // Disable editing features if user is a viewer or if it's a completed label
    const canEdit = !isViewer && !isCompletedLabel;

    const handleSave = useCallback(async () => {
        if (!canEdit) return; // Prevent saving if viewer or completed label
        if (editedName === category.name && editedColor === (category.color || DEFAULT_CATEGORY_COLOR)) {
            setIsEditing(false);
            setShowColorPicker(false);
            return;
        }

        const updatePayload: CategoryUpdatePayload = {
            name: editedName,
            color: editedColor === DEFAULT_CATEGORY_COLOR && category.color == null ? null : editedColor,
        };

        const loadingToastId = toast.loading('Updating category...');
        setIsEditing(false);
        setShowColorPicker(false);

        // Apply optimistic update immediately
        if (onUpdateCategory) {
            const optimisticUpdatedCategoryForParent: Category = {
                ...category,
                name: updatePayload.name || category.name,
                color: updatePayload.color ?? null, // Use nullish coalescing to ensure it's never undefined
            };
            onUpdateCategory(optimisticUpdatedCategoryForParent);
        }

        if (sendMessage) {
            sendMessage('update_category', { id: category.id, ...updatePayload });
            toast.success('Category updated!', { id: loadingToastId });
        } else {
            console.warn('sendMessage not available, category updated locally (if onUpdateCategory provided).');
            toast.success('Category updated locally (no connection)!', { id: loadingToastId });
        }
    }, [category, editedName, editedColor, onUpdateCategory, sendMessage, canEdit]);

    const handleBlur = useCallback(() => {
        if (!canEdit) return;
        if (!showColorPicker) {
             handleSave();
        }
    }, [showColorPicker, handleSave, canEdit]);

    const prevShowColorPickerRef = useRef<boolean>(showColorPicker);
    useEffect(() => {
        if (prevShowColorPickerRef.current && !showColorPicker) {
            onColorInteractionEnd(category.id);
            handleSave();
        }
        prevShowColorPickerRef.current = showColorPicker;
    }, [showColorPicker, category.id, onColorInteractionEnd, handleSave]);

    useEffect(() => {
        setEditedName(category.name);
        // Always update the color when the category changes, regardless of editing state
        // This ensures we catch both local and remote color changes
        setEditedColor(category.color || DEFAULT_CATEGORY_COLOR);
    }, [category]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                if (isEditing) handleBlur();
                if (showColorPicker) {
                    setShowColorPicker(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isEditing, showColorPicker, containerRef, handleSave, handleBlur]);

    const handleDoubleClick = () => {
        if (canEdit) setIsEditing(true);
    };
    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => setEditedName(event.target.value);

    const handleColorChange = (color: ColorResult) => {
        setEditedColor(color.hex);
        onColorPreview(category.id, color.hex);
    };

    const handleColorSwatchClick = (e: React.MouseEvent) => {
        if (!canEdit) return; // Prevent opening color picker if viewer or completed label
        e.stopPropagation();
        setShowColorPicker(prev => !prev);
        if (isEditing) setIsEditing(false);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') handleSave();
        else if (event.key === 'Escape') {
            setEditedName(category.name);
            setEditedColor(category.color || DEFAULT_CATEGORY_COLOR);
            setIsEditing(false);
            setShowColorPicker(false);
            onColorInteractionEnd(category.id);
        }
    };

    // Helper to get a valid color string for tinycolor
    const tcColor = (colorStr: string | null | undefined) => tinycolor(colorStr || DEFAULT_CATEGORY_COLOR);

    return (
        <motion.div
            ref={containerRef}
            className={`absolute group px-5 py-2 rounded-md shadow-lg ${canEdit ? 'cursor-pointer' : 'cursor-default'} z-40 ${isCompletedLabel ? 'completed-label' : ''}`}
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                backgroundColor: isCompletedLabel 
                    ? 'rgba(0, 0, 0, 0.7)' 
                    : tcColor(editedColor).setAlpha(0.75).darken(15).toString(),
                boxShadow: isCompletedLabel
                    ? `0 0 15px 2px ${tcColor(editedColor).setAlpha(0.3).toString()}`
                    : `0 0 15px 2px ${tcColor(editedColor).setAlpha(0.6).toString()}`,
                backdropFilter: 'blur(4px)',
                borderRadius: '12px',
                border: isCompletedLabel
                    ? `2px solid ${tcColor(editedColor).darken(10).setAlpha(0.5).toString()}`
                    : `2px solid ${tcColor(editedColor).lighten(10).toString()}`,
                transition: 'all 0.3s ease',
            }}
            onDoubleClick={canEdit ? handleDoubleClick : undefined}
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            whileHover={{ 
                scale: canEdit ? 1.05 : 1,
                boxShadow: isCompletedLabel
                    ? `0 0 20px 5px ${tcColor(editedColor).setAlpha(0.4).toString()}`
                    : `0 0 20px 5px ${tcColor(editedColor).setAlpha(0.7).toString()}`
            }}
        >
            <div className="flex items-center space-x-2">
                {!isEditing ? (
                    <span className={`text-white font-semibold text-lg truncate select-none ${isCompletedLabel ? 'flex items-center' : ''}`}
                          style={{ textShadow: isCompletedLabel ? `0 0 8px rgba(255, 255, 255, 0.7)` : `0 0 8px ${tcColor(editedColor).lighten(20).toString()}` }}>
                        {isCompletedLabel && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-white opacity-80" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                        {editedName}
                    </span>
                ) : (
                    canEdit ? <input ref={inputRef} type="text" value={editedName} onChange={handleNameChange} onBlur={handleBlur} onKeyDown={handleKeyDown}
                           className="bg-transparent text-white font-semibold text-base border-none outline-none p-0 m-0 w-fit"
                           style={{ boxShadow: 'none', textShadow: `0 0 8px ${tcColor(editedColor).lighten(20).toString()}` }}/> : <span className={`text-white font-semibold text-lg truncate select-none ${isCompletedLabel ? 'flex items-center' : ''}`}
                          style={{ textShadow: isCompletedLabel ? `0 0 8px rgba(255, 255, 255, 0.7)` : `0 0 8px ${tcColor(editedColor).lighten(20).toString()}` }}>
                            {isCompletedLabel && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-white opacity-80" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                            {editedName}
                        </span>
                )}
                {canEdit && !isCompletedLabel && (
                    <motion.div onClick={handleColorSwatchClick} className="w-6 h-6 rounded-full border-2 cursor-pointer shrink-0"
                                style={{ backgroundColor: editedColor, borderColor: tcColor(editedColor).lighten(20).toString(), boxShadow: `0 0 8px 1px ${tcColor(editedColor).setAlpha(0.6).toString()}` }}
                                whileHover={{ scale: 1.2 }} transition={{ duration: 0.2 }} />
                )}
            </div>
            <AnimatePresence>
                {canEdit && showColorPicker && !isCompletedLabel && (
                    <motion.div className="absolute mt-2 z-50 chrome-picker-dark-theme" style={{ left: '50%', transform: 'translateX(-50%)', background: '#374151', borderRadius: '8px', padding: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -2px rgba(0,0,0,0.2)'}}
                                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.15 }}>
                        <CirclePicker 
                            color={editedColor} 
                            onChange={handleColorChange}
                            colors={[
                                '#FF00FF', // Neon Pink
                                '#00FFFF', // Neon Cyan
                                '#00FF00', // Neon Green
                                '#FFFF00', // Neon Yellow
                                '#FF0000', // Neon Red
                                '#0000FF', // Neon Blue
                                '#FF1493', // Deep Pink
                                '#00FF7F', // Spring Green
                                '#FF4500', // Orange Red
                                '#9400D3', // Dark Violet
                                '#FFD700', // Gold
                                '#7FFF00', // Chartreuse
                                '#FF69B4', // Hot Pink
                                '#00BFFF', // Deep Sky Blue
                                '#32CD32', // Lime Green
                                '#FFA500', // Orange
                                '#BA55D3', // Medium Orchid
                                '#20B2AA', // Light Sea Green
                            ]}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default CategoryLabel;
