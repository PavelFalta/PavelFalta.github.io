import React, { useState, useRef, useEffect, useCallback } from 'react';
import Draggable, { DraggableEvent, DraggableData } from 'react-draggable';
import { Todo } from '../types/domain';
import toast from '../utils/toast';
import { motion, AnimatePresence } from 'framer-motion'; // Import motion
import EditTaskModal from './EditTaskModal';
import ReactDOM from 'react-dom';

interface TodoItemProps {
    todo: Todo;
    sendMessage?: (action: string, payload: any) => void;
    onUpdate: (updatedTodo: Todo) => void;
    onDragStartCallback: (id: number) => void;
    onDragCallback: (event: DraggableEvent, data: DraggableData) => void;
    onDragStopCallback: (event: DraggableEvent, data: DraggableData) => void;
    setNodeRef: (node: HTMLDivElement | null) => void;
    effectiveColor?: string;
    canvasScale: number;
    onDeleteTodo?: (id: number) => void;
    onCompleteTodo?: (id: number) => void;
    isPendingDelete?: boolean;
    forceExpanded?: boolean;
    isViewer?: boolean;
}

// Constants for sizing
const BASE_CIRCLE_SIZE = 48;
const MIN_HOVER_SIZE = 100; // Increased from 80 to give more space for text
const MAX_HOVER_SIZE = 220; // Increased from 200 for longer text
const CHARS_PER_PIXEL_FACTOR = 3; // Adjusted to give more space per character
const ACTION_BUBBLE_SIZE = 64; // Size of the action bubbles - increased to 64px

function TodoItem({ 
    todo, 
    onDragStartCallback, 
    onDragCallback,
    onDragStopCallback, 
    setNodeRef,
    effectiveColor,
    canvasScale,
    onDeleteTodo,
    onCompleteTodo,
    isPendingDelete = false,
    forceExpanded = false,
    isViewer,
    sendMessage,
    onUpdate
}: TodoItemProps): React.ReactElement {
    const [isDragging, setIsDragging] = useState(false);
    const [isHovered, setIsHovered] = useState(false); // Hover state
    const [isRightClicked, setIsRightClicked] = useState(false); // Right-click state
    const [confirmDelete, setConfirmDelete] = useState(false); // Confirmation state for delete
    const [isEditing, setIsEditing] = useState(false); // New state for text editing
    const [editedName, setEditedName] = useState(todo.name); // New state for edited text
    const [editModalPosition, setEditModalPosition] = useState({ x: 0, y: 0 }); // State for modal position
    
    const editInputRef = useRef<HTMLInputElement>(null); // Ref for the edit input
    // Initialize without type, cast later
    const draggableRef = useRef(null);

    // For long-press on mobile/touch devices
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
    const longPressDelay = 500; // ms before registering as a long press
    
    // For detecting double-tap on mobile
    const [lastTapTime, setLastTapTime] = useState(0);
    const [touchDragEnabled, setTouchDragEnabled] = useState(false);
    const doubleTapDelay = 300; // ms threshold for double tap
    
    // Handle touch start - start long press timer
    const handleTouchStart = (e: React.TouchEvent) => {
        const now = Date.now();
        
        if (now - lastTapTime < doubleTapDelay) {
            // This is a double-tap - enable drag mode
            setTouchDragEnabled(true);
            handleDragStart(e as unknown as DraggableEvent);
            // Clear any existing timer
            if (longPressTimer) clearTimeout(longPressTimer);
            setLongPressTimer(null);
            return;
        }
        
        // First tap - start timer for long press
        setLastTapTime(now);
        
        if (longPressTimer) clearTimeout(longPressTimer);
        
        const timer = setTimeout(() => {
            // This will trigger after longPressDelay ms
            setIsRightClicked(true);
            e.preventDefault(); // Prevent default behavior
        }, longPressDelay);
        
        setLongPressTimer(timer);
    };
    
    // Handle touch end/cancel - clear long press timer
    const handleTouchEnd = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
        
        if (touchDragEnabled) {
            setTouchDragEnabled(false);
            handleDragStop({} as DraggableEvent, {} as DraggableData);
        }
    };
    
    // Handle touch move - clear timer if user moves finger
    const handleTouchMove = (e: React.TouchEvent) => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
        
        if (touchDragEnabled && draggableRef.current) {
            // If we're in drag mode, process the move
            const touch = e.touches[0];
            const element = draggableRef.current as HTMLElement;
            const rect = element.getBoundingClientRect();
            
            // Create a synthetic drag event
            const data = {
                node: element,
                x: touch.clientX,
                y: touch.clientY,
                deltaX: 0,
                deltaY: 0,
                lastX: 0,
                lastY: 0
            } as DraggableData;
            
            // Call drag callback
            onDragCallback(e as unknown as DraggableEvent, data);
        }
    };

    // Reset confirm delete state when right-click menu is closed
    useEffect(() => {
        if (!isRightClicked) {
            setConfirmDelete(false);
            // Don't reset editing state when closing right-click menu if we're showing the modal
            if (!isEditing) {
                setEditedName(todo.name);
            }
        }
    }, [isRightClicked, todo.name]);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [isEditing]);

    // Effect to update the parent map when the ref changes or component unmounts
    useEffect(() => {
        setNodeRef(draggableRef.current);
        // Cleanup function to remove ref from map on unmount
        return () => {
            setNodeRef(null);
        };
    }, [setNodeRef]); // Rerun if setNodeRef function changes (it shouldn't normally)

    // Add click outside listener when right-clicked
    useEffect(() => {
        if (isRightClicked) {
            const handleClickOutside = (event: MouseEvent) => {
                if (draggableRef.current && !(draggableRef.current as any).contains(event.target)) {
                    setIsRightClicked(false);
                }
            };
            
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isRightClicked]);

    // Debounced function removed - parent will handle position updates
    // const debouncedApiUpdatePosition = useCallback(...);

    const handleDragStart = (e?: DraggableEvent) => {
        setIsDragging(true);
        onDragStartCallback(todo.id); // Notify parent that dragging started
    };

    // Call parent's onDrag handler
    const handleDrag = (e: DraggableEvent, data: DraggableData) => {
        onDragCallback(e, data);
    };

    const handleDragStop = (e: DraggableEvent, data: DraggableData) => {
        setIsDragging(false);
        // Notify parent about the drop event and data
        onDragStopCallback(e, data);
        // Position update logic is now handled by the parent
    };

    // Use canEdit flag based on isViewer
    const canEdit = !isViewer;

    // Handle right-click to show action bubbles
    const handleRightClick = (e: React.MouseEvent) => {
        if (!canEdit) return; // Prevent context menu for viewers
        e.preventDefault();
        e.stopPropagation();
        setIsRightClicked(true);
    };

    // Save edited task name
    const handleSaveEdit = async (newName: string): Promise<boolean> => {
        if (!canEdit) return false; // Prevent saving if viewer
        if (newName.trim() === '') {
            setEditedName(todo.name); // Don't allow empty names
            toast.error('Task name cannot be empty.');
            return false;
        }

        if (newName === todo.name) {
            return true; // No changes to save
        }

        if (sendMessage) {
            sendMessage('update_todo', { id: todo.id, name: newName });
            // Optimistic update of local state for immediate feedback in the input field
            // The actual Todo object update will come via WebSocket and parent components.
            onUpdate({ ...todo, name: newName }); // Notify parent for local state update if needed
            toast.success('Task updated.');
                return true;
        } else {
            console.error('Failed to update thought: sendMessage not available.');
            toast.error('Failed to send update. Not connected.');
            setEditedName(todo.name); // Reset to original if WS call fails immediately
            return false;
        }
    };

    // Handle opening the edit modal
    const handleOpenEditModal = () => {
        if (!canEdit) return; // Prevent opening modal if viewer
        if (!draggableRef.current) return;
        
        // Get the current viewport dimensions
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Position the modal in the center of the viewport
        const modalX = windowWidth / 2;
        const modalY = windowHeight / 2;
        
        setEditModalPosition({ x: modalX, y: modalY });
        setIsEditing(true);
    };

    // Handle closing the edit modal
    const handleCloseEditModal = () => {
        setIsEditing(false);
    };

    // Use effectiveColor if provided, otherwise fall back to default gray
    const nodeColor = effectiveColor || '#4b5563'; 
    const textColor = '#ffffff';

    const overlayVariants = {
        initial: { opacity: 0, scale: 0.7 },
        // Delay slightly more to let the circle expand first
        hover: { opacity: 1, scale: 1, transition: { duration: 0.15, delay: 0.15 } } 
    };
    
    const calculateHoverSize = (text: string): number => {
        const estimatedSize = BASE_CIRCLE_SIZE + text.length * CHARS_PER_PIXEL_FACTOR;
        return Math.max(MIN_HOVER_SIZE, Math.min(estimatedSize, MAX_HOVER_SIZE));
    };
    const targetHoverSize = calculateHoverSize(todo.name);

    // Use either hover or force expanded state
    const isExpanded = isHovered || forceExpanded;

    // Calculate the negative offset needed to keep the center stationary
    const offset = -(targetHoverSize - BASE_CIRCLE_SIZE) / 2;

    const circleVariants = {
        initial: {
            width: `${BASE_CIRCLE_SIZE}px`,
            height: `${BASE_CIRCLE_SIZE}px`,
            x: 0,
            y: 0,
        },
        hover: {
            width: `${targetHoverSize}px`,
            height: `${targetHoverSize}px`,
            x: offset, // Apply negative offset
            y: offset,
            transition: { duration: 0.2, ease: "easeOut" }
        }
    };

    // Define blackHoleVariants for the rotating animation
    const blackHoleVariants = {
        idle: {
            rotate: 0,
        },
        animate: {
            rotate: 360,
            transition: {
                duration: 20,
                ease: "linear",
                repeat: Infinity
            }
        }
    };

    // Animation for action bubbles
    const actionBubbleVariants = {
        hidden: { 
            scale: 0,
            opacity: 0,
            rotate: -45,
            y: 20
        },
        visible: { 
            scale: 1,
            opacity: 1,
            rotate: 0,
            y: 0,
            transition: {
                type: 'spring',
                stiffness: 300,
                damping: 20,
                delay: 0.05
            }
        },
        exit: {
            scale: 0,
            opacity: 0,
            rotate: 45,
            y: -20,
            transition: {
                duration: 0.2
            }
        }
    };

    // Delete button variant with different animation timing
    const deleteButtonVariants = {
        ...actionBubbleVariants,
        visible: {
            ...actionBubbleVariants.visible,
            transition: {
                ...actionBubbleVariants.visible.transition,
                delay: 0
            }
        }
    };

    // Update the blackHole gradient to match the nodeColor for a more subtle effect
    const blackHoleGradient = todo.is_completed ? 
        (nodeColor === '#4b5563' ? 
            'radial-gradient(circle, rgba(138, 43, 226, 0.2) 0%, rgba(0, 0, 0, 0) 70%)' : 
            (() => {
                // Extract RGB components for a subtler gradient
                const r = parseInt(nodeColor.slice(1, 3), 16);
                const g = parseInt(nodeColor.slice(3, 5), 16);
                const b = parseInt(nodeColor.slice(5, 7), 16);
                return `radial-gradient(circle, rgba(${r}, ${g}, ${b}, 0.2) 0%, rgba(0, 0, 0, 0) 70%)`;
            })()) 
        : '';

    // Black hole styling for completed tasks
    const getNodeStyling = () => {
        if (todo.is_completed) {
            // Calculate a dark variation of the category color for black hole effect
            const baseColor = nodeColor;
            
            // Use simpler, stronger colors that will persist after refresh
            // Skip the color-mix function which might not be supported in all browsers
            let glowColor, borderColor, darkenedColor;
            
            if (baseColor === '#4b5563') {
                // Default purple theme for nodes without category
                glowColor = 'rgba(138, 43, 226, 0.8)';
                borderColor = 'rgba(138, 43, 226, 0.5)';
                darkenedColor = '#000000';
            } else {
                // Extract RGB components for custom glows based on category
                const r = parseInt(baseColor.slice(1, 3), 16);
                const g = parseInt(baseColor.slice(3, 5), 16);
                const b = parseInt(baseColor.slice(5, 7), 16);
                
                glowColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
                borderColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
                darkenedColor = `rgb(${Math.floor(r*0.3)}, ${Math.floor(g*0.3)}, ${Math.floor(b*0.3)})`;
            }
            
            // Stronger, more visible glow
            return {
                backgroundColor: darkenedColor,
                boxShadow: `0 0 ${isDragging ? '30px' : '25px'} 10px ${glowColor}`,
                border: `2px solid ${borderColor}`,
                transition: 'box-shadow 0.3s ease, background-color 0.3s ease'
            };
        } else {
            // Regular node styling
            return {
                backgroundColor: nodeColor,
                boxShadow: effectiveColor ? `0 0 12px 3px ${effectiveColor}` : 'none',
                border: 'none',
                transition: 'box-shadow 0.3s ease'
            };
        }
    };

    // New edit button variant with animation
    const editButtonVariants = {
        ...actionBubbleVariants,
        visible: {
            ...actionBubbleVariants.visible,
            transition: {
                ...actionBubbleVariants.visible.transition,
                delay: 0.1 // Slight delay between buttons
            }
        }
    };

    // --- Define positions for circular layout ---
    const centerX = targetHoverSize / 2;
    const centerY = targetHoverSize / 2;
    const radius = (targetHoverSize / 2) + (ACTION_BUBBLE_SIZE / 2) + 10; // 10px gap

    const getBubblePosition = (angleDegrees: number) => {
        const angleRadians = angleDegrees * (Math.PI / 180);
        return {
            left: `${centerX + radius * Math.cos(angleRadians) - ACTION_BUBBLE_SIZE / 2}px`,
            top: `${centerY + radius * Math.sin(angleRadians) - ACTION_BUBBLE_SIZE / 2}px`,
        };
    };

    const editBubblePosition = getBubblePosition(0); // Right
    const completeBubblePosition = getBubblePosition(180); // Left
    const deleteBubblePosition = getBubblePosition(90); // Bottom
    // --- End positions for circular layout ---

    return (
        <>
        <Draggable
            nodeRef={draggableRef as unknown as React.RefObject<HTMLElement>} 
            position={{
                x: (todo.position_x ?? 0) - BASE_CIRCLE_SIZE / 2,
                y: (todo.position_y ?? 0) - BASE_CIRCLE_SIZE / 2,
            }}
            onStart={handleDragStart}
            onDrag={handleDrag}
            onStop={handleDragStop}
            handle=".handle"
            scale={canvasScale} 
            cancel=".action-bubble"
            disabled={!canEdit || isEditing || isRightClicked}
        >
            <div 
                ref={draggableRef} 
                style={{ position: 'absolute' }} 
                className={`absolute ${isDragging ? 'z-30' : (isExpanded || isRightClicked || isPendingDelete) ? 'z-20' : 'z-10'} ${todo.is_completed ? 'completed' : ''} ${!canEdit ? 'viewer-mode' : ''}`} 
                onContextMenu={handleRightClick}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onTouchMove={handleTouchMove}
            >
                <motion.div
                    transition={{ 
                        duration: 0.2, 
                        ease: "easeOut"
                    }}
                    variants={circleVariants}
                    initial="initial"
                    animate={isExpanded || isRightClicked || isPendingDelete ? "hover" : "initial"}
                    whileHover={{ zIndex: 20 }} 
                    onHoverStart={() => setIsHovered(true)} 
                    onHoverEnd={() => setIsHovered(false)}
                    className={`absolute cursor-grab rounded-full shadow-md flex items-center justify-center w-12 h-12 ${isDragging ? 'shadow-xl' : ''} ${isPendingDelete || confirmDelete ? 'border-2 border-red-500' : ''}`}
                    style={{ 
                        ...getNodeStyling(),
                        ...(isPendingDelete || confirmDelete ? { 
                            filter: 'brightness(1.2) contrast(1.1)',
                            outline: '2px solid rgba(239, 68, 68, 0.6)',
                            outlineOffset: '2px',
                            boxShadow: "0 0 25px rgba(239, 68, 68, 0.8)",
                            borderColor: "rgba(239, 68, 68, 1)"
                        } : {})
                    }}
                >
                    {todo.is_completed && (
                        <motion.div 
                            className="absolute inset-0 rounded-full"
                            style={{
                                background: blackHoleGradient,
                            }}
                            variants={blackHoleVariants}
                            initial="idle"
                            animate="animate"
                        />
                    )}
                    <AnimatePresence>
                        {(isExpanded || isRightClicked || isPendingDelete) && (
                            <motion.div
                                variants={overlayVariants}
                                initial="initial"
                                animate="hover"
                                exit="initial"
                                className={`handle absolute inset-0 rounded-full ${todo.is_completed ? 'bg-black/70' : 'bg-black/50'} backdrop-blur-sm flex items-center justify-center p-1.5 shadow-inner cursor-grab overflow-hidden`}
                                style={{
                                    boxShadow: todo.is_completed ? 'inset 0 0 20px 5px rgba(138, 43, 226, 0.3)' : 'none'
                                }}
                            >
                                <span 
                                    className="text-lg leading-tight font-medium w-full text-center whitespace-pre-wrap px-0"
                                    style={{ 
                                        color: textColor,
                                        textShadow: todo.is_completed ? '0 0 8px rgba(138, 43, 226, 0.8)' : 'none',
                                        padding: '0',
                                        display: 'block',
                                        textAlign: 'center',
                                        maxWidth: `${targetHoverSize * 0.8}px`,
                                        margin: '0 auto',
                                        overflow: 'hidden',
                                        maxHeight: `${targetHoverSize * 0.8}px`,
                                        fontFamily: "'Inter', 'Roboto', system-ui, sans-serif",
                                        fontWeight: 500,
                                        letterSpacing: '0.01em'
                                    }}
                                >
                                    {todo.name}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {isRightClicked && (
                            <motion.div
                                className="action-bubbles-container"
                                style={{
                                    position: 'absolute',
                                    left: `0px`,
                                    top: `0px`,
                                    zIndex: 1000 
                                }}
                            >
                                {!todo.is_completed && (
                                    <motion.div
                                        className="action-bubble absolute cursor-pointer rounded-full bg-slate-900 border-2 border-amber-500 flex items-center justify-center shadow-lg overflow-hidden"
                                        style={{
                                            width: `${ACTION_BUBBLE_SIZE}px`,
                                            height: `${ACTION_BUBBLE_SIZE}px`,
                                            ...editBubblePosition, // Apply calculated position
                                            boxShadow: '0 0 15px 3px rgba(245, 158, 11, 0.4)',
                                            pointerEvents: 'auto',
                                            cursor: 'pointer',
                                            zIndex: 1000 
                                        }}
                                        variants={editButtonVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        whileHover={{ 
                                            scale: 1.1, 
                                            boxShadow: '0 0 20px 5px rgba(245, 158, 11, 0.6)'
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleOpenEditModal();
                                            setIsRightClicked(false);
                                        }}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}
                                    >
                                        <motion.svg 
                                            xmlns="http://www.w3.org/2000/svg" 
                                            className="h-8 w-8 text-amber-500" 
                                            viewBox="0 0 24 24" 
                                            fill="none"
                                            stroke="currentColor" 
                                            strokeWidth={2}
                                            initial={{ rotate: 0 }}
                                            animate={{ rotate: 0 }}
                                            whileHover={{ rotate: 10 }}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </motion.svg>
                                    </motion.div>
                                )}
                                <motion.div
                                    className="action-bubble absolute cursor-pointer rounded-full bg-slate-900 flex items-center justify-center shadow-lg overflow-hidden"
                                    style={{
                                        width: `${ACTION_BUBBLE_SIZE}px`,
                                        height: `${ACTION_BUBBLE_SIZE}px`,
                                        ...completeBubblePosition, // Apply calculated position
                                        boxShadow: todo.is_completed ? 
                                            '0 0 15px 3px rgba(59, 130, 246, 0.4)' : 
                                            '0 0 15px 3px rgba(22, 163, 74, 0.4)',
                                        border: todo.is_completed ? 
                                            '2px solid rgb(59, 130, 246)' : 
                                            '2px solid rgb(22, 163, 74)',
                                        pointerEvents: 'auto',
                                        cursor: 'pointer',
                                        zIndex: 1000 
                                    }}
                                    variants={actionBubbleVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    whileHover={{ 
                                        scale: 1.1, 
                                        boxShadow: todo.is_completed ? 
                                            '0 0 20px 5px rgba(59, 130, 246, 0.6)' : 
                                            '0 0 20px 5px rgba(22, 163, 74, 0.6)' 
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (onCompleteTodo) {
                                            try {
                                                onCompleteTodo(todo.id);
                                                setIsRightClicked(false);
                                            } catch (error) {
                                                console.error("Error completing todo:", error);
                                                toast.error("Failed to update todo completion status");
                                            }
                                        }
                                    }}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                >
                                    {todo.is_completed ? (
                                        <motion.svg 
                                            xmlns="http://www.w3.org/2000/svg" 
                                            className="h-8 w-8 text-blue-500" 
                                            viewBox="0 0 24 24" 
                                            fill="none"
                                            stroke="currentColor" 
                                            strokeWidth={2}
                                            initial={{ rotate: 0 }}
                                            animate={{ rotate: 0 }}
                                            whileHover={{ rotate: 180 }}
                                            transition={{ duration: 0.5 }}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </motion.svg>
                                    ) : (
                                        <motion.svg 
                                            xmlns="http://www.w3.org/2000/svg" 
                                            className="h-8 w-8 text-green-500" 
                                            viewBox="0 0 24 24" 
                                            fill="none"
                                            stroke="currentColor" 
                                            strokeWidth={2}
                                            whileHover={{ scale: 1.2 }}
                                        >
                                            <motion.path 
                                                strokeLinecap="round" 
                                                strokeLinejoin="round" 
                                                d="M5 13l4 4L19 7"
                                                initial={{ pathLength: 0 }}
                                                animate={{ pathLength: 1 }}
                                                transition={{ duration: 0.5 }}
                                            />
                                        </motion.svg>
                                    )}
                                </motion.div>
                                {!confirmDelete && (
                                    <motion.div
                                        className="action-bubble absolute cursor-pointer rounded-full bg-slate-900 border-2 flex items-center justify-center shadow-lg overflow-hidden"
                                        style={{
                                            width: `${ACTION_BUBBLE_SIZE}px`,
                                            height: `${ACTION_BUBBLE_SIZE}px`,
                                            ...deleteBubblePosition, // Apply calculated position
                                            border: '2px solid rgb(220, 38, 38)',
                                            boxShadow: '0 0 15px 3px rgba(220, 38, 38, 0.4)',
                                            pointerEvents: 'auto',
                                            cursor: 'pointer',
                                            zIndex: 1000
                                        }}
                                        variants={deleteButtonVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        whileHover={{ 
                                            scale: 1.1, 
                                            boxShadow: '0 0 20px 5px rgba(220, 38, 38, 0.6)'
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setConfirmDelete(true);
                                        }}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}
                                    >
                                        <motion.svg 
                                            xmlns="http://www.w3.org/2000/svg" 
                                            className="h-8 w-8 text-red-500 relative z-10" 
                                            viewBox="0 0 24 24" 
                                            fill="none"
                                            stroke="currentColor" 
                                            strokeWidth={2}
                                            pointerEvents="none"
                                            initial={{ rotate: 0 }}
                                            animate={{ rotate: 0 }}
                                            whileHover={{ rotate: 20 }}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </motion.svg>
                                    </motion.div>
                                )}
                                {confirmDelete && (
                                    <motion.div
                                        className="action-bubble absolute cursor-pointer rounded-full bg-slate-900 border-2 flex items-center justify-center shadow-lg overflow-hidden"
                                        style={{
                                            width: `${ACTION_BUBBLE_SIZE}px`,
                                            height: `${ACTION_BUBBLE_SIZE}px`,
                                            ...deleteBubblePosition, // Apply calculated position (confirm uses same as initial delete)
                                            border: '2px solid rgb(234, 179, 8)',
                                            boxShadow: '0 0 15px 3px rgba(234, 179, 8, 0.4)',
                                            pointerEvents: 'auto',
                                            cursor: 'pointer',
                                            zIndex: 1000
                                        }}
                                        variants={deleteButtonVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        whileHover={{ 
                                            scale: 1.1, 
                                            boxShadow: '0 0 20px 5px rgba(234, 179, 8, 0.6)'
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (onDeleteTodo) {
                                                try {
                                                    onDeleteTodo(todo.id);
                                                    setIsRightClicked(false);
                                                    setConfirmDelete(false);
                                                } catch (error) {
                                                    console.error("Error deleting todo:", error);
                                                    toast.error("Failed to delete todo");
                                                }
                                            }
                                        }}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}
                                    >
                                        <motion.div
                                            className="flex items-center justify-center text-yellow-500"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.2 }}
                                            whileHover={{
                                                x: [0, -4, 4, -4, 4, -2, 2, 0],
                                                transition: { duration: 0.5, ease: "easeInOut" }
                                            }}
                                        >
                                            <motion.svg 
                                                xmlns="http://www.w3.org/2000/svg" 
                                                className="h-9 w-9 text-yellow-500" 
                                                viewBox="0 0 24 24" 
                                                fill="none"
                                                stroke="currentColor" 
                                                strokeWidth={2}
                                                pointerEvents="none"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </motion.svg>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </Draggable>

        {/* Use ReactDOM.createPortal to mount the EditTaskModal directly to the body */}
        {canEdit && isEditing && 
            ReactDOM.createPortal(
                <AnimatePresence>
                    <EditTaskModal
                        x={editModalPosition.x}
                        y={editModalPosition.y}
                        todoId={todo.id}
                        initialName={todo.name}
                        color={nodeColor}
                        isCompleted={todo.is_completed}
                        onSave={handleSaveEdit}
                        onClose={handleCloseEditModal}
                    />
                </AnimatePresence>,
                document.body
            )
        }
        </>
    );
}

export default TodoItem; 