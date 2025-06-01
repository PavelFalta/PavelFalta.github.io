import React, { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DraggableEvent, DraggableData } from 'react-draggable';
// import { DndProvider } from 'react-dnd'; // Keep if dnd is used, comment if not. Assuming it is for now.
// import { HTML5Backend } from 'react-dnd-html5-backend'; // Keep if dnd is used
import { Todo, Category, TodoUpdate } from '../types/domain'; // Corrected import path
import { useApiClient } from '../hooks/useApiClient';
import { useAuth } from '../context/AuthContext'; // Import useAuth
// @ts-ignore
import TodoCanvas from './TodoCanvas';
import DeleteBin from './DeleteBin';
import CompleteBin from './CompleteBin';
import DeleteConfirmModal from './DeleteConfirmModal';
import toast from '../utils/toast';
// Import Role from API models if not in domain.ts
import { Role as ApiRole } from '../api'; 
import { PanZoomState } from '../hooks/usePanZoomLogic'; // For prop type
import { ReactZoomPanPinchRef, ReactZoomPanPinchState } from 'react-zoom-pan-pinch'; // For prop type
import { Board, User } from '../api'; // Import Board type and User
import { OtherUserCursorData, ActiveUser } from '../hooks/useBoardWebSocket'; // Import OtherUserCursorData and ActiveUser

// interface ApiClients { // This interface is no longer needed as we use the hook directly
//     // todosApi: TodosApi;
//     // categoriesApi: CategoriesApi;
// }

interface TodoListViewProps {
    // apiClients: ApiClients; // Removed: No longer passing apiClients as prop
    todos: Todo[];
    categories: Category[];
    isBoardConnected: boolean;
    boardWsError?: string | null;
    sendMessage?: (action: string, payload: any) => void;
    currentUserRole?: ApiRole | null;
    board: Board;
    initialTransform: PanZoomState;
    onPanZoomTransform: (ref: ReactZoomPanPinchRef, state: {scale: number; positionX: number; positionY: number}) => void;
    otherUsersCursors: Record<number, OtherUserCursorData>;
    currentUser: User | null;
    activeUsers: ActiveUser[];
    onBoardUpdated: (updatedBoard: Board) => void;
    onBoardDeleted: (boardId: number) => void;
}

// Removed ViewMode type
type BinType = 'delete' | 'complete' | null;

// Simple debounce function (needed here now)
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const debounced = (...args: Parameters<F>) => {
        if (timeout !== null) { clearTimeout(timeout); timeout = null; }
        timeout = setTimeout(() => func(...args), waitFor);
    };
    return debounced;
}

// Define amount to enlarge bin hitboxes (in pixels)
const BIN_HITBOX_INFLATION = 70; 

const TodoListView = forwardRef<HTMLDivElement, TodoListViewProps>((
    { 
        // onLogout, // Removed
        todos: currentTodos, // Renamed from initialTodos
        categories: currentCategories, // Renamed from initialCategories
        isBoardConnected,
        boardWsError,
        sendMessage,
        currentUserRole,
        board,
        initialTransform, // Renamed from transformState
        onPanZoomTransform, // Renamed from onTransformFromParent
        otherUsersCursors,
        currentUser,
        activeUsers,      // Added
        onBoardUpdated,   // Added
        onBoardDeleted,   // Added
    }, 
    ref // This is the forwarded ref for TodoCanvas's main div
): React.ReactElement | null => {
    const [todos, setTodos] = useState<Todo[]>(currentTodos || []);
    const [categoriesData, setCategoriesData] = useState<Category[]>(currentCategories || []);
    const [internalLoading, setInternalLoading] = useState(false); // Renamed from isLoading to avoid conflict if props had isLoading
    // State for drag interactions
    const [isDraggingAny, setIsDraggingAny] = useState(false);
    const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
    // State to track which bin is hovered over
    const [hoveredBin, setHoveredBin] = useState<BinType>(null);
    // Delete confirmation modal state
    const [todoToDelete, setTodoToDelete] = useState<Todo | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null); // ID of the todo pending deletion
    // Refs for drop targets
    const deleteBinRef = useRef<HTMLDivElement>(null);
    const completeBinRef = useRef<HTMLDivElement>(null);
    // Ref to store refs of individual todo items (outer divs)
    const todoItemRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

    const apiClient = useApiClient();
    const { user } = useAuth();

    // Determine if user is a viewer
    const isViewer = currentUserRole === ApiRole.Viewer;

    // Moved debouncedUpdatePositionViaWebSocket HERE, to the top-level with other hooks
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedUpdatePositionViaWebSocket = useCallback(
        debounce((id: number, newX: number, newY: number, _originalPositionTodo: Todo) => {
            if (sendMessage) {
                // Use 'update_todo' for position changes as well, payload is part of TodoUpdate
                sendMessage('update_todo', { id, position_x: newX, position_y: newY });
            } else {
                console.warn('sendMessage not available for debouncedUpdatePositionViaWebSocket');
            }
        }, 750),
        [sendMessage]
    );

    // MOVED handleUpdateTodo and handleDeleteTodo callbacks HERE
    const handleUpdateTodo = useCallback(async (todoId: number, todoUpdate: TodoUpdate) => {
        console.warn('handleUpdateTodo needs to be reimplemented with WebSockets');
        // Placeholder - actual implementation would use sendMessage or be removed if parent handles all updates
        return null; 
    }, [/* dependencies if any, e.g., sendMessage */]);

    const handleDeleteTodo = useCallback(async (todoId: number) => {
        console.warn('handleDeleteTodo needs to be reimplemented with WebSockets');
        // Placeholder - actual implementation would use sendMessage or be removed
    }, [/* dependencies if any, e.g., sendMessage */]);

    // Update state when props change (e.g. new data from WebSocket)
    useEffect(() => {
        setTodos(currentTodos || []);
    }, [currentTodos]);

    useEffect(() => {
        setCategoriesData(currentCategories || []);
    }, [currentCategories]);
    
    // Display loading indicator based on isBoardConnected prop
    if (!isBoardConnected && !boardWsError) { // Show loading only if not also in an error state
        return (
            <div className="flex items-center justify-center h-full text-white text-xl">
                Connecting to board...
            </div>
        );
    }

    // Display error message if boardWsError is present
    if (boardWsError) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-red-400 p-4 text-center">
                <h2 className="text-2xl font-semibold mb-2">Connection Error</h2>
                <p className="text-lg mb-4">{boardWsError}</p>
                <p className="text-sm">Please try selecting the board again or refreshing the page.</p>
            </div>
        );
    }

    // Function to update multiple todos in the state
    const updateMultipleTodos = (updatedTodos: Todo[]) => {
        if (!updatedTodos || updatedTodos.length === 0) return;
        
        console.log("Updating state with multiple todos:", updatedTodos); // Debug log
        const updatedIds = new Set(updatedTodos.map(ut => ut.id));
        
        setTodos(prevTodos => {
            const updatesMap = new Map(updatedTodos.map(ut => [ut.id, ut]));
            return prevTodos.map(t => {
                if (updatedIds.has(t.id)) {
                    return { ...t, ...updatesMap.get(t.id) };
                }
                return t;
            });
        });
    };

    // Revert handleTodoUpdate to handle single Todo for optimistic updates
    const handleTodoUpdate = (updatedTodo: Todo) => {
        console.log("Updating single state with:", updatedTodo); // Debug log
        setTodos(prevTodos => 
            prevTodos.map(t => t.id === updatedTodo.id ? { ...t, ...updatedTodo } : t)
        );
    };
    
    // handleTodoAdd remains the same, accepting single or list
    const handleTodoAdd = (newlyCreatedTodos: Todo[] | Todo) => { 
        const todosToAdd = Array.isArray(newlyCreatedTodos) ? newlyCreatedTodos : [newlyCreatedTodos];
        if (todosToAdd.length === 0) return;
        
        console.log("Adding new todos to state:", todosToAdd);
        const existingIds = new Set(todos.map(t => t.id));
        const newTodosOnly = todosToAdd.filter(nt => !existingIds.has(nt.id));
        const updatedExistingTodos = todosToAdd.filter(nt => existingIds.has(nt.id));
 
        setTodos(prevTodos => {
            const updatesMap = new Map(updatedExistingTodos.map(ut => [ut.id, ut]));
            const updatedList = prevTodos.map(t => {
                 if (updatesMap.has(t.id)) {
                    return { ...t, ...updatesMap.get(t.id) };
                 }
                 return t;
            });
            return [...updatedList, ...newTodosOnly];
        });
    };

    const handleTodoRemove = (idToRemove: number) => {
        setTodos(prevTodos => prevTodos.filter(t => t.id !== idToRemove));
    };

    // Handler for delete confirmation modal (e.g., from drag-to-bin)
    const handleDeleteConfirmedFromModal = () => {
        if (todoToDelete && sendMessage) {
            sendMessage('delete_todo', { id: todoToDelete.id });
            handleTodoRemove(todoToDelete.id);
            toast.success('Task deleted.');
        } else {
            toast.error('Could not delete task.');
            console.warn('sendMessage not available or no todo to delete from modal');
        }
        setPendingDeleteId(null); 
        setTodoToDelete(null); 
    };

    // Handler for direct deletion (e.g., from TodoItem action bubble)
    const handleDirectDeleteTodo = (todoId: number) => {
        if (sendMessage) {
            sendMessage('delete_todo', { id: todoId });
            handleTodoRemove(todoId); // Optimistic UI update
            toast.success('Task deleted.');
        } else {
            toast.error('Could not delete task.');
            console.warn('sendMessage not available for direct delete');
        }
    };

    // This handler is for opening the modal (e.g. when dragging to bin)
    const requestDeleteViaModalHandler = (todoId: number) => {
        const todoToSetForDeletion = todos.find(t => t.id === todoId);
        if (todoToSetForDeletion) {
            setTodoToDelete(todoToSetForDeletion); 
        }
    };
    
    // Update handleDragStop to use requestDeleteViaModalHandler
    const handleDragStop = (_event: DraggableEvent, data: DraggableData, forceHoveredBin?: BinType) => {
        setIsDraggingAny(false);
        const currentDraggedId = draggedItemId;
        setDraggedItemId(null);
        const finalHoveredBin = forceHoveredBin || hoveredBin;
        setHoveredBin(null);

        if (currentDraggedId === null) return;

        const originalTodo = todos.find(t => t.id === currentDraggedId);
        if (!originalTodo) return;

        if (finalHoveredBin === 'delete') {
            requestDeleteViaModalHandler(currentDraggedId); // Use the modal handler
        } else if (finalHoveredBin === 'complete') {
            handleCompleteApi(currentDraggedId); // Mark as complete
        } else {
            // Only update position if not dropped on a bin
            if (data.x !== originalTodo.position_x || data.y !== originalTodo.position_y) {
                // Optimistic UI update (already done by Draggable component if controlled)
                // For uncontrolled Draggable, or for explicit state update:
                const optimisticTodo: Todo = { 
                    ...originalTodo, 
                    position_x: data.x, 
                    position_y: data.y 
                };
                handleTodoUpdate(optimisticTodo); // Update local state optimistically
                debouncedUpdatePositionViaWebSocket(currentDraggedId, data.x, data.y, originalTodo);
            }
        }
    };

    // Simplified: Always show all todos
    const filteredTodos = todos; 

    const handleCompleteApi = async (id: number) => {
        if (isViewer) { return; }
        const originalTodo = todos.find(t => t.id === id);
        // Optimistic update:
        setTodos(prevTodos => prevTodos.map(t => t.id === id ? { ...t, is_completed: true, completed_at: new Date().toISOString() } : t));
        if (sendMessage) {
            sendMessage('update_todo', { id, is_completed: true });
            toast.success('Task completed.');
        } else {
            toast.error('Failed to send completion update.');
            console.warn('sendMessage not available for handleCompleteApi');
            if (originalTodo) setTodos(prevTodos => prevTodos.map(t => t.id === id ? originalTodo : t)); // Revert if WS call fails immediately
        }
    };

    const handleUncompleteApi = async (id: number) => {
        const originalTodo = todos.find(t => t.id === id);
        // Optimistic update:
        setTodos(prevTodos => prevTodos.map(t => t.id === id ? { ...t, is_completed: false, completed_at: undefined } : t));
        if (sendMessage) {
            sendMessage('update_todo', { id, is_completed: false });
            toast.success('Task reactivated.');
        } else {
            toast.error('Failed to send reactivation update.');
            console.warn('sendMessage not available for handleUncompleteApi');
            if (originalTodo) setTodos(prevTodos => prevTodos.map(t => t.id === id ? originalTodo : t)); // Revert
        }
    };

    // --- Drag Handlers ---
    const handleDragStart = (id: number) => {
        if (isViewer) return;
        setIsDraggingAny(true);
        setDraggedItemId(id);
        setHoveredBin(null);
    };

    // Check overlap function based on node center and *inflated* bin rect
    const checkCenterOverlap = (nodeRect: DOMRect, binRef: React.RefObject<HTMLDivElement | null>): boolean => {
        if (!binRef.current) return false;
        const binRect = binRef.current.getBoundingClientRect();
        
        // Create an inflated rectangle for hitbox detection
        const inflatedBinRect = {
            left: binRect.left - BIN_HITBOX_INFLATION,
            right: binRect.right + BIN_HITBOX_INFLATION,
            top: binRect.top - BIN_HITBOX_INFLATION,
            bottom: binRect.bottom + BIN_HITBOX_INFLATION,
        };

        // Calculate center of the node
        const nodeCenterX = nodeRect.left + nodeRect.width / 2;
        const nodeCenterY = nodeRect.top + nodeRect.height / 2;
        
        // Check overlap against the inflated rectangle
        return (
             nodeCenterX >= inflatedBinRect.left &&
             nodeCenterX <= inflatedBinRect.right &&
             nodeCenterY >= inflatedBinRect.top &&
             nodeCenterY <= inflatedBinRect.bottom
        );
    };

    const handleDrag = (_event: DraggableEvent, _data: DraggableData) => {
        if (isViewer || !draggedItemId) return;
        
        const draggedNodeRef = todoItemRefs.current.get(draggedItemId);
        if (!draggedNodeRef) return;

        // Get rect of the node being dragged
        const draggedRect = draggedNodeRef.getBoundingClientRect(); 
        
        let binHover: BinType = null;
        // Check overlap using node center
        if (checkCenterOverlap(draggedRect, deleteBinRef)) {
            binHover = 'delete';
        } else if (checkCenterOverlap(draggedRect, completeBinRef)) {
            binHover = 'complete';
        }
        
        setHoveredBin(binHover);
    };

    return (
        <div className="w-full h-full flex flex-col relative bg-gray-900">
            <TodoCanvas 
                ref={ref} 
                todos={todos}
                categories={categoriesData}
                sendMessage={sendMessage}
                isViewer={isViewer}
                onUpdateTodo={handleTodoUpdate}
                onAddTodo={handleTodoAdd}
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragStop={handleDragStop}
                onRequestDeleteTodo={handleDirectDeleteTodo}
                pendingDeleteId={pendingDeleteId}
                todoItemRefs={todoItemRefs}
                transformState={initialTransform}
                onTransformFromParent={onPanZoomTransform}
                otherUsersCursors={otherUsersCursors}
                currentUser={currentUser}
                activeUsers={activeUsers}
                // onBoardUpdated={onBoardUpdated}
                // onBoardDeleted={onBoardDeleted}
            />

            {!isViewer && (
                <AnimatePresence>
                    {isDraggingAny && (
                        <>
                            <DeleteBin ref={deleteBinRef} isHovered={hoveredBin === 'delete'} />
                            <CompleteBin ref={completeBinRef} isHovered={hoveredBin === 'complete'} />
                        </>
                    )}
                </AnimatePresence>
            )}

            {/* Corrected DeleteConfirmModal rendering */} 
            {todoToDelete && (
                <DeleteConfirmModal
                    todo={todoToDelete} 
                    onConfirm={handleDeleteConfirmedFromModal}
                    onCancel={() => { 
                        setTodoToDelete(null); 
                        setPendingDeleteId(null); 
                    }}
                />
            )}
        </div>
    );
});

export default TodoListView; 