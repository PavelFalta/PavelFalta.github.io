import React, { useState, useRef, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { DraggableEvent, DraggableData } from 'react-draggable';
// import { TodosApi, CategoriesApi } from '../api'; // Commented out
import { Todo, Category, TodoCreate, CategoryUpdatePayload } from '../types/domain'; // Updated import, added CategoryUpdatePayload
import TodoItem from './TodoItem';
import NewTaskModal from './NewTaskModal';
import toast from '../utils/toast';
import { AnimatePresence, motion } from 'framer-motion';
import CategoryLabel from './CategoryLabel';
// @ts-ignore
import ConnectionLine, { ConnectionLineProps } from './ConnectionLine';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchState } from "react-zoom-pan-pinch";
import Tutorial from './Tutorial';
import { useApiClient } from '../hooks/useApiClient'; // Import the hook itself if needed for other APIs in future
import { PanZoomState } from '../hooks/usePanZoomLogic'; // Import PanZoomState type
import { User } from '../api'; // Import User type
import { OtherUserCursorData, ActiveUser } from '../hooks/useBoardWebSocket'; // Ensure this is imported if not already

// interface ApiClients { // Commented out
//     todosApi: TodosApi;
//     categoriesApi: CategoriesApi;
// }

interface TodoCanvasProps {
    todos: Todo[];
    categories: Category[]; // Added categories prop
    // apiClients: ApiClients; // Commented out, will use useApiClient if specific APIs needed
    apiClient?: ReturnType<typeof useApiClient>; // Optional, if other APIs like auth are needed
    sendMessage?: (action: string, payload: any) => void; // Added for WebSocket
    isViewer?: boolean; // Added isViewer prop
    onUpdateTodo: (updatedTodo: Todo) => void;
    onAddTodo: (newTodo: Todo | Todo[]) => void;
    onDragStart: (id: number) => void;
    onDrag: (event: DraggableEvent, data: DraggableData) => void;
    onDragStop: (event: DraggableEvent, data: DraggableData, forceHoveredBin?: any) => void;
    onRequestDeleteTodo?: (id: number) => void;
    pendingDeleteId?: number | null;
    todoItemRefs: React.MutableRefObject<Map<number, HTMLDivElement | null>>;
    // Props from HomePage for lifted pan/zoom state
    transformState: PanZoomState;
    onTransformFromParent: (ref: any, state: { scale: number; positionX: number; positionY: number; }) => void;
    // canvasRefFromParent: React.RefObject<HTMLDivElement>; // Not needed if using forwardRef for the main div
    // Props for rendering cursors
    otherUsersCursors: Record<number, OtherUserCursorData>; 
    currentUser: User | null; // To filter own cursor if necessary
    activeUsers: ActiveUser[]; // Added activeUsers prop
}

interface ModalState {
    isOpen: boolean;
    viewportX: number;
    viewportY: number;
    relativeX: number;
    relativeY: number;
}

// Define node size (should match the base size in TodoItem.tsx)
const NODE_SIZE = 48;
// Define vertical gap for category label
const CATEGORY_LABEL_GAP = 10;

// First, let's update the Category interface to include our custom isCompleted property
// Since we can't directly modify the generated API types, we'll create a custom interface that extends Category
interface ExtendedCategory extends Category {
    is_completed?: boolean; // Use snake_case if this custom prop is related to backend fields
}

// Use forwardRef to pass the ref to the main div of TodoCanvas
const TodoCanvas = forwardRef<HTMLDivElement, TodoCanvasProps>((
    { 
        todos, 
        categories, 
        apiClient, 
        sendMessage, 
        isViewer, 
        onUpdateTodo, 
        onAddTodo, 
        onDragStart, 
        onDrag, 
        onDragStop, 
        onRequestDeleteTodo, 
        pendingDeleteId, 
        todoItemRefs,
        // Destructure new props
        transformState,
        onTransformFromParent,
        otherUsersCursors,
        currentUser,
        activeUsers, // Added activeUsers to destructuring
    }, 
    ref // This is the forwarded ref for the main div of TodoCanvas
): React.ReactElement | null => {
    const [modalState, setModalState] = useState<ModalState>({ 
        isOpen: false, viewportX: 0, viewportY: 0, relativeX: 0, relativeY: 0 
    });
    // const canvasRef = useRef<HTMLDivElement>(null); // Will use the forwarded ref
    const [categoryColorPreviews, setCategoryColorPreviews] = useState<Map<number, string>>(new Map());
    const [draggingNodeInfo, setDraggingNodeInfo] = useState<{ id: number; x: number; y: number } | null>(null);
    const [tutorialOpen, setTutorialOpen] = useState(false);
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
    const longPressDelay = 500; 
    const [expandAllNodes, setExpandAllNodes] = useState(false);
    
    // Use a local ref for internal calculations if needed, but the main div uses the forwarded ref
    const internalCanvasRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => internalCanvasRef.current as HTMLDivElement);

    // Check if it's the first visit and show tutorial automatically
    useEffect(() => {
        const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
        if (!hasSeenTutorial) {
            setTutorialOpen(true);
        }
    }, []);

    // Handle tutorial close and save preference
    const handleTutorialClose = () => {
        setTutorialOpen(false);
        localStorage.setItem('hasSeenTutorial', 'true');
    };

    // Calculate the set of unique category IDs currently in use by todos
    const activeCategoryIds = useMemo(() => {
        const ids = new Set<number>();
        todos.forEach(todo => {
            if (todo.category_id != null) { // Use snake_case
                ids.add(todo.category_id); // Use snake_case
            }
        });
        return Array.from(ids).sort((a, b) => a - b).join(','); 
    }, [todos]);

    // categoriesById now uses the categories prop
    const categoriesById = useMemo(() => new Map(categories.map(cat => [cat.id, cat])), [categories]);
    
    // getEffectiveCategoryColor uses categoriesById, which now correctly uses the prop
    const getEffectiveCategoryColor = useCallback((catId: number | null | undefined): string | undefined => {
        if (catId == null) return undefined;
        const previewColor = categoryColorPreviews.get(catId);
        if (previewColor) return previewColor;
        const category = categoriesById.get(catId);
        return category?.color ?? undefined;
    }, [categoriesById, categoryColorPreviews]);

    // --- Category Color Preview Handlers ---
    const handleColorPreview = (catId: number, previewColor: string) => {
        setCategoryColorPreviews(prev => new Map(prev).set(catId, previewColor));
    };

    const handleColorInteractionEnd = (catId: number) => {
        // Only clear the preview if we're not in the middle of a save operation
        // The preview will be cleared when the server response comes back
        const category = categoriesById.get(catId);
        if (!category) return; // Safety check
        
        // If the preview color matches the current category color, it means we're not in the middle of a save
        const previewColor = categoryColorPreviews.get(catId);
        if (previewColor === category.color) {
            setCategoryColorPreviews(prev => {
                const next = new Map(prev);
                next.delete(catId);
                return next;
            });
        }
    };
    // --- End Category Color Preview Handlers ---

    // --- CONTEXT MENU: Adjusted for Pan/Zoom --- 
    const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
        // Prevent context menu if user is only a viewer
        if (isViewer) {
            event.preventDefault();
            // toast.error("Viewers cannot create new tasks.");
            return;
        }
        event.preventDefault();
        const viewportX = event.clientX;
        const viewportY = event.clientY;
        if (!internalCanvasRef.current) return; // Use internal ref for getBoundingClientRect
        const canvasRect = internalCanvasRef.current.getBoundingClientRect();
        
        // Calculate canvas coordinates using external transformState and canvasRect
        const canvasClickX = (viewportX - canvasRect.left - transformState.positionX) / transformState.scale;
        const canvasClickY = (viewportY - canvasRect.top - transformState.positionY) / transformState.scale;

        setModalState({
            isOpen: true,
            viewportX: viewportX, 
            viewportY: viewportY,
            relativeX: canvasClickX, 
            relativeY: canvasClickY, 
        });
    };

    const handleCloseModal = () => {
        setModalState({ isOpen: false, viewportX: 0, viewportY: 0, relativeX: 0, relativeY: 0 });
    };

    // --- SAVE NEW TASK: Uses adjusted relative coords --- 
    const handleSaveNewTask = async (name: string): Promise<boolean> => {
        if (!name.trim()) return false;
        
        const centerX = modalState.relativeX;
        const centerY = modalState.relativeY;

        const newTodoData: TodoCreate = { // This TodoCreate is from our domain types now
            name: name || "New Task",
            position_x: centerX, // Use snake_case
            position_y: centerY, // Use snake_case
            // category_id can be added here if modal supports it
        };

        handleCloseModal();
        const loadingToastId = toast.loading('Creating task...');

        if (sendMessage) {
            sendMessage('create_todo', newTodoData);
            // Optimistic update
            const mockOptimisticTodo: Todo = {
                id: Date.now(), // Temporary ID, will be replaced by server ID
                name: newTodoData.name,
                description: newTodoData.description || null,
                position_x: newTodoData.position_x,
                position_y: newTodoData.position_y,
                is_completed: false, 
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                completed_at: null, 
                category_id: newTodoData.category_id || null,
                board_id: 0, // Placeholder, server will set this
            };
            onAddTodo(mockOptimisticTodo); 
            toast.success('Task created!', { id: loadingToastId });
            return true;
        } else {
            console.error("Failed to create todo: sendMessage not available.");
            toast.error("Failed to request task creation. Not connected.", { id: loadingToastId });
            return false;
        }
    };

    // Type predicate to ensure properties are numbers
    type TodoWithPositionAndCategory = Todo & { category_id: number; position_x: number; position_y: number }; // Use snake_case
    const hasPositionAndCategory = (todo: Todo): todo is TodoWithPositionAndCategory => {
        return typeof todo.category_id === 'number' && // Use snake_case
               typeof todo.position_x === 'number' && // Use snake_case
               typeof todo.position_y === 'number'; // Use snake_case
    }

    const positionedCategorizedTodos = useMemo(() => 
        todos.filter(hasPositionAndCategory)
    , [todos]);

    // --- Calculate Category Label Positions ---
    const categoryLabelPositions = useMemo(() => {
        const positions = new Map<number, { x: number; y: number; category: Category }>();
        const localCategoriesById = new Map(categories.map(cat => [cat.id, cat])); // Use local state 'categories'
        const todosByCategory = new Map<number, TodoWithPositionAndCategory[]>();

        // Create a map of current node positions (center coords), including the dragged node
        const currentNodePositions = new Map<number, { x: number; y: number }>();
        positionedCategorizedTodos.forEach(todo => {
            currentNodePositions.set(todo.id, { x: todo.position_x, y: todo.position_y });
        });
        if (draggingNodeInfo) {
            // Convert dragging info (top-left) back to center for calculations
            const dragCenterX = draggingNodeInfo.x + NODE_SIZE / 2;
            const dragCenterY = draggingNodeInfo.y + NODE_SIZE / 2;
            currentNodePositions.set(draggingNodeInfo.id, { x: dragCenterX, y: dragCenterY });
        }

        // Group todos by category ID (using original list for structure)
        positionedCategorizedTodos.forEach(todo => {
            if (!todosByCategory.has(todo.category_id)) {
                todosByCategory.set(todo.category_id, []);
            }
            todosByCategory.get(todo.category_id)!.push(todo);
        });

        // Find highest todo for each category and calculate label position using current positions
        todosByCategory.forEach((categoryTodos, categoryId) => {
            const category = localCategoriesById.get(categoryId);
            if (!category || categoryTodos.length === 0) return;

            let highestTodoId: number | null = null; // Store ID of highest todo
            let minCenterY = Infinity; 
            let sumCenterX = 0;

            // Filter for active nodes (non-completed)
            const activeTodos = categoryTodos.filter(todo => !todo.is_completed);
            
            if (activeTodos.length > 0) {
                activeTodos.forEach(todo => {
                const currentPos = currentNodePositions.get(todo.id); // Get current pos
                if (!currentPos) return; // Skip if position not found (shouldn't happen)

                // Find highest todo based on current center Y position
                if (currentPos.y < minCenterY) { 
                    minCenterY = currentPos.y;
                    highestTodoId = todo.id; // Store the ID
                }
                // Sum current center X positions for averaging
                sumCenterX += currentPos.x; 
            });

            // Get the original highestTodo data using the found ID
            const highestTodo = highestTodoId !== null 
                ? positionedCategorizedTodos.find(t => t.id === highestTodoId)
                : null;

            // Proceed only if highestTodo was found (which it should be if highestTodoId is not null)
                if (highestTodo) { 
                    const averageCenterX = sumCenterX / activeTodos.length;
                // @ts-ignore
                const labelWidthEstimate = highestTodo.name.length * 8 + 40; 
                let posX = averageCenterX - 80;
                posX += (NODE_SIZE * 0.8);
                // Use minCenterY calculated using current positions
                const posY = minCenterY - (NODE_SIZE / 2) - CATEGORY_LABEL_GAP - 100; 

                // Use highestTodo.categoryId, which is now guaranteed valid within this block
                positions.set(highestTodo.category_id, { 
                    x: posX,
                    y: posY,
                        category: category as Category
                    });
                }
            }
            
            // Now, compute separate label position for completed nodes in the same category
            const completedTodos = categoryTodos.filter(todo => todo.is_completed);
            
            if (completedTodos.length > 0) {
                let highestCompletedTodoId: number | null = null;
                let minCompletedCenterY = Infinity;
                let sumCompletedCenterX = 0;
                
                completedTodos.forEach(todo => {
                    const currentPos = currentNodePositions.get(todo.id);
                    if (!currentPos) return;
                    
                    if (currentPos.y < minCompletedCenterY) {
                        minCompletedCenterY = currentPos.y;
                        highestCompletedTodoId = todo.id;
                    }
                    sumCompletedCenterX += currentPos.x;
                });
                
                const highestCompletedTodo = highestCompletedTodoId !== null
                    ? positionedCategorizedTodos.find(t => t.id === highestCompletedTodoId)
                    : null;
                    
                if (highestCompletedTodo) {
                    const averageCompletedCenterX = sumCompletedCenterX / completedTodos.length;
                    let posX = averageCompletedCenterX - 120;
                    posX += (NODE_SIZE * 0.8);
                    const posY = minCompletedCenterY - (NODE_SIZE / 2) - CATEGORY_LABEL_GAP - 100;
                    
                    // Use a special key format to differentiate completed labels
                    positions.set(-highestCompletedTodo.category_id, {  // Negative ID to differentiate from active labels
                        x: posX,
                        y: posY,
                        category: {
                            ...category,
                            name: `Completed`, // Modify the name to show it's for completed tasks
                            is_completed: true // Set is_completed flag
                        } as Category
                    });
                }
            }
        });

        return positions;
    }, [positionedCategorizedTodos, categories, draggingNodeInfo]); 
    // --- End Calculate Category Label Positions ---

    // Calculate category label connections - add this after categoryLabelPositions memo
    const categoryLabelConnections = useMemo(() => {
        const connections: Array<{ 
            key: string; 
            startX: number; 
            startY: number; 
            endX: number; 
            endY: number; 
            color: string;
        }> = [];
        
        // Find pairs of active and completed labels for the same category
        Array.from(categoryLabelPositions.entries()).forEach(([categoryId, labelInfo]) => {
            if (categoryId > 0) { // This is an active label
                // Check if there's a corresponding completed label (negative ID)
                const completedLabelInfo = categoryLabelPositions.get(-categoryId);
                
                if (completedLabelInfo) {
                    // Get category color for the connection
                    const color = getEffectiveCategoryColor(categoryId) || '#a855f7';
                    
                    // Create a connection between these two labels
                    connections.push({
                        key: `category-connection-${categoryId}`,
                        startX: labelInfo.x + 80, // Approximate center point
                        startY: labelInfo.y + 20,
                        endX: completedLabelInfo.x + 80,
                        endY: completedLabelInfo.y + 20,
                        color: color
                    });
                }
            }
        });
        
        return connections;
    }, [categoryLabelPositions, getEffectiveCategoryColor]);

    // --- Drag Handlers (Wrap existing props to manage draggingNodeInfo) ---
    const handleInternalDragStart = useCallback((id: number) => {
        const initialTodo = todos.find(t => t.id === id);
        if (initialTodo && initialTodo.position_x != null && initialTodo.position_y != null) {
            setDraggingNodeInfo({
                id: id,
                x: initialTodo.position_x - NODE_SIZE / 2, 
                y: initialTodo.position_y - NODE_SIZE / 2, 
            });
        }
        onDragStart(id); // Call original prop
    }, [todos, onDragStart]);

    const handleInternalDrag = useCallback((event: DraggableEvent, data: DraggableData) => {
        setDraggingNodeInfo(prev => prev ? { ...prev, x: data.x, y: data.y } : null);
        onDrag(event, data); // Call original prop
    }, [onDrag]);

    const handleInternalDragStop = useCallback((event: DraggableEvent, data: DraggableData, forceHoveredBin?: any) => {
        setDraggingNodeInfo(null); // Clear dragging state
        data.x = data.x + NODE_SIZE / 2;
        data.y = data.y + NODE_SIZE / 2;
        onDragStop(event, data, forceHoveredBin); // Call original prop with the force parameter
    }, [onDragStop]);
    // --- End Drag Handlers ---

    // --- Calculate Connection Lines Data (Adjusted for drag info structure) ---
    const connectionLinesData = useMemo(() => {
        const lines: Array<ConnectionLineProps & { key: string }> = [];
        const activeNodes: Map<number, { x: number; y: number; category_id: number }> = new Map();
        const completedNodes: Map<number, { x: number; y: number; category_id: number }> = new Map();

        // Create a map of current node positions (center coords), including the dragged node
        positionedCategorizedTodos.forEach(todo => {
            if (todo.is_completed) {
                completedNodes.set(todo.id, {
                    x: todo.position_x,
                    y: todo.position_y,
                    category_id: todo.category_id
                });
            } else {
                activeNodes.set(todo.id, {
                    x: todo.position_x,
                    y: todo.position_y,
                    category_id: todo.category_id
                });
            }
        });

        if (draggingNodeInfo) {
            // Convert dragging info (top-left) back to center for calculations
            const dragCenterX = draggingNodeInfo.x + NODE_SIZE / 2;
            const dragCenterY = draggingNodeInfo.y + NODE_SIZE / 2;
            
            // Find the todo being dragged
            const draggedTodo = positionedCategorizedTodos.find(t => t.id === draggingNodeInfo.id);
            
            if (draggedTodo) {
                // Update or add to the appropriate map based on completion status
                if (draggedTodo.is_completed) {
                    completedNodes.set(draggingNodeInfo.id, {
                        x: dragCenterX,
                        y: dragCenterY,
                        category_id: draggedTodo.category_id
                    });
                } else {
                    activeNodes.set(draggingNodeInfo.id, {
                        x: dragCenterX,
                        y: dragCenterY,
                        category_id: draggedTodo.category_id
                    });
                }
            }
        }

        // Create a map of todos by category for active nodes
        const activeTodosByCategory = new Map<number, Array<{ id: number, x: number, y: number }>>();
        Array.from(activeNodes.entries()).forEach(([id, node]) => {
            if (!activeTodosByCategory.has(node.category_id)) {
                activeTodosByCategory.set(node.category_id, []);
            }
            activeTodosByCategory.get(node.category_id)!.push({ id, x: node.x, y: node.y });
        });

        // Create a map of todos by category for completed nodes
        const completedTodosByCategory = new Map<number, Array<{ id: number, x: number, y: number }>>();
        Array.from(completedNodes.entries()).forEach(([id, node]) => {
            if (!completedTodosByCategory.has(node.category_id)) {
                completedTodosByCategory.set(node.category_id, []);
            }
            completedTodosByCategory.get(node.category_id)!.push({ id, x: node.x, y: node.y });
        });

        // Generate lines for active nodes within the same category
        activeTodosByCategory.forEach((categoryTodos, categoryId) => {
            const effectiveColor = getEffectiveCategoryColor(categoryId);
            if (!effectiveColor || categoryTodos.length < 2) return;

            for (let i = 0; i < categoryTodos.length; i++) {
                for (let j = i + 1; j < categoryTodos.length; j++) {
                    const todoA = categoryTodos[i];
                    const todoB = categoryTodos[j];

                    const dx = todoA.x - todoB.x;
                    const dy = todoA.y - todoB.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 299) {
                        lines.push({
                            key: `line-active-${categoryId}-${todoA.id}-${todoB.id}`,
                            x1: todoA.x,
                            y1: todoA.y,
                            x2: todoB.x,
                            y2: todoB.y,
                            effectiveColor: effectiveColor,
                            isCompletedConnection: false
                        });
                    }
                }
            }
        });

        // Generate dotted lines for completed nodes within the same category
        completedTodosByCategory.forEach((categoryTodos, categoryId) => {
            const effectiveColor = getEffectiveCategoryColor(categoryId);
            if (!effectiveColor || categoryTodos.length < 2) return;

            for (let i = 0; i < categoryTodos.length; i++) {
                for (let j = i + 1; j < categoryTodos.length; j++) {
                    const todoA = categoryTodos[i];
                    const todoB = categoryTodos[j];
                    
                    const dx = todoA.x - todoB.x;
                    const dy = todoA.y - todoB.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 299) {
                        lines.push({
                            key: `line-completed-${categoryId}-${todoA.id}-${todoB.id}`,
                            x1: todoA.x,
                            y1: todoA.y,
                            x2: todoB.x,
                            y2: todoB.y,
                            effectiveColor: effectiveColor,
                            isCompletedConnection: true
                        });
                    }
                }
            }
        });

        // Note: We don't generate connections between active and completed nodes

        return lines;
    }, [positionedCategorizedTodos, getEffectiveCategoryColor, draggingNodeInfo]); 
    // --- End Calculate Connection Lines Data ---

    // Handle touch start - start long press timer for mobile
    const handleTouchStart = (e: React.TouchEvent) => {
        if (longPressTimer) clearTimeout(longPressTimer);
        
        const timer = setTimeout(() => {
            // This will trigger after longPressDelay ms
            if (internalCanvasRef.current) {
                const touch = e.touches[0];
                const rect = internalCanvasRef.current.getBoundingClientRect();
                
                // Get viewport touch position
                const viewportX = touch.clientX;
                const viewportY = touch.clientY;
                
                // Calculate canvas coordinates using external transformState and canvasRect
                const canvasClickX = (viewportX - rect.left - transformState.positionX) / transformState.scale;
                const canvasClickY = (viewportY - rect.top - transformState.positionY) / transformState.scale;
                
                setModalState({
                    isOpen: true,
                    viewportX: viewportX,
                    viewportY: viewportY,
                    relativeX: canvasClickX,
                    relativeY: canvasClickY,
                });
            }
        }, longPressDelay);
        
        setLongPressTimer(timer);
    };
    
    // Handle touch end/cancel - clear long press timer
    const handleTouchEnd = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
    };
    
    // Handle touch move - clear timer if user moves finger
    const handleTouchMove = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
    };

    // Render category labels
    const renderedCategoryLabels = useMemo(() => {
        return Array.from(categoryLabelPositions.entries()).map(([catId, posInfo]) => (
            <CategoryLabel 
                key={`catlabel-${catId}`} 
                category={posInfo.category} 
                position={{ x: posInfo.x, y: posInfo.y }} 
                sendMessage={sendMessage} 
                isViewer={isViewer} // Pass isViewer down
                onColorPreview={handleColorPreview}
                onColorInteractionEnd={handleColorInteractionEnd}
            />
        ));
    }, [categoryLabelPositions, sendMessage, isViewer, handleColorPreview, handleColorInteractionEnd]);

    // Render Todo items
    const renderedTodoItems = useMemo(() => {
        return todos.map((todo) => {
            const effectiveColor = getEffectiveCategoryColor(todo.category_id);
            return (
                <TodoItem 
                    key={todo.id} 
                    todo={todo} 
                    sendMessage={sendMessage}
                    isViewer={isViewer} // Pass isViewer down
                    effectiveColor={effectiveColor}
                    canvasScale={transformState.scale}
                    onUpdate={onUpdateTodo} 
                    onDragStartCallback={handleInternalDragStart}
                    onDragCallback={handleInternalDrag}
                    onDragStopCallback={handleInternalDragStop}
                    isPendingDelete={pendingDeleteId === todo.id}
                    forceExpanded={expandAllNodes}
                    onDeleteTodo={onRequestDeleteTodo}
                    onCompleteTodo={(id) => {
                        const originalTodo = todos.find(t => t.id === id);
                        if (originalTodo) {
                            const newCompletedStatus = !originalTodo.is_completed;
                            const updatedTodo = { ...originalTodo, is_completed: newCompletedStatus, completed_at: newCompletedStatus ? new Date().toISOString() : undefined };
                            onUpdateTodo(updatedTodo);
                            if (sendMessage) {
                                sendMessage('update_todo', { id: originalTodo.id, is_completed: newCompletedStatus });
                                toast.success(newCompletedStatus ? 'Completion request sent!' : 'Activation request sent!');
                            } else {
                                toast.error('Cannot send update: no connection.');
                            }
                        }
                    }}
                    setNodeRef={(node: HTMLDivElement | null) => {
                        if (node) {
                            todoItemRefs.current.set(todo.id, node);
                        } else {
                            todoItemRefs.current.delete(todo.id);
                        }
                    }}
                />
            );
        });
    }, [todos, sendMessage, isViewer, getEffectiveCategoryColor, transformState.scale, onUpdateTodo, handleInternalDragStart, handleInternalDrag, handleInternalDragStop, pendingDeleteId, expandAllNodes, onRequestDeleteTodo]);

    return (
        <div 
            ref={internalCanvasRef} // Assign the internal ref here. The parent will get this via forwardRef.
            className="w-full h-full relative overflow-hidden bg-gray-800/50"
            onContextMenu={handleContextMenu}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onTouchMove={handleTouchMove}
        >
            {/* Help Button */}
            <motion.button
                className="absolute top-4 right-4 z-50 bg-gray-900 border border-blue-500 text-blue-400 rounded-full w-12 h-12 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                whileHover={{ 
                    scale: 1.1, 
                    boxShadow: "0 0 15px rgba(59, 130, 246, 0.7)",
                    borderColor: "#8b5cf6",
                    color: "#a5b4fc"
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTutorialOpen(true)}
                aria-label="Open Tutorial"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </motion.button>

            {/* Illuminate Thoughts Button */}
            <motion.button
                className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 rounded-full w-12 h-12 flex items-center justify-center
                  ${expandAllNodes 
                    ? "bg-gradient-to-r from-purple-600 to-blue-500 border-purple-400" 
                    : "bg-gray-900 border-blue-500"} 
                  border shadow-[0_0_10px_rgba(59,130,246,0.5)]`}
                initial={false}
                animate={{ 
                    rotate: expandAllNodes ? 180 : 0,
                    scale: 1,
                    backgroundColor: expandAllNodes ? undefined : "#111827",
                }}
                whileHover={{ 
                    scale: 1.1, 
                    boxShadow: expandAllNodes 
                      ? "0 0 20px rgba(139, 92, 246, 0.7)" 
                      : "0 0 15px rgba(59, 130, 246, 0.7)",
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setExpandAllNodes(!expandAllNodes)}
                aria-label={expandAllNodes ? "Collapse Thoughts" : "Illuminate Thoughts"}
            >
                <motion.div
                    className="relative w-6 h-6 text-blue-400"
                    animate={{ 
                        color: expandAllNodes ? "#ffffff" : "#60a5fa"
                    }}
                >
                    {/* Star icon that transforms */}
                    <motion.svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth={1.5} 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className="absolute left-0 top-0 w-full h-full"
                        initial={false}
                        animate={{ 
                            opacity: 1,
                            scale: expandAllNodes ? [1, 1.2, 1] : 1,
                            transition: {
                                scale: expandAllNodes ? {
                                    duration: 1.5,
                                    repeat: Infinity,
                                    repeatType: "reverse"
                                } : undefined
                            }
                        }}
                    >
                        {expandAllNodes ? (
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        ) : (
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" strokeDasharray="64" strokeDashoffset="0" />
                        )}
                    </motion.svg>
                </motion.div>
            </motion.button>

            <TransformWrapper
                initialScale={1}
                initialPositionX={0}
                initialPositionY={0}
                minScale={0.2}
                maxScale={3}
                limitToBounds={false} // Allow panning beyond initial content
                panning={{ 
                    disabled: draggingNodeInfo !== null, // Disable pan when dragging node
                    velocityDisabled: true // Optional: smoother panning
                }}
                doubleClick={{ disabled: true }} // Disable double click zoom (conflicts with label edit)
                wheel={{ step: 0.1 }} // Adjust zoom sensitivity
                onTransformed={onTransformFromParent} // Directly use the callback from props
            >
                {() => ( 
                     <TransformComponent 
                         wrapperStyle={{ width: "100%", height: "100%" }} 
                     >
                        {/* Background Grid */}
                        <div 
                            className="absolute inset-0 bg-[radial-gradient(#4b5563_1px,transparent_1px)] [background-size:32px_32px] opacity-20 pointer-events-none"
                            style={{ 
                                width: '4000px', height: '4000px', 
                                left: 'calc(50% - 2000px)', top: 'calc(50% - 2000px)' 
                            }} 
                        ></div>
        
                        {/* Render Connection Lines */}
                        <AnimatePresence>
                            {connectionLinesData.map(lineProps => (
                                <ConnectionLine {...lineProps} />
                            ))}
                        </AnimatePresence>
                        
                        {/* Render Category Label Connection Lines */}
                        <AnimatePresence>
                            {categoryLabelConnections.map(conn => (
                                <motion.div
                                    key={conn.key}
                                    className="absolute left-0 top-0 w-full h-full pointer-events-none z-30"
                                    style={{ overflow: 'visible' }}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.7 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <svg
                                        width="100%"
                                        height="100%"
                                        style={{ overflow: 'visible' }}
                                    >
                                        <motion.path
                                            d={`M ${conn.startX} ${conn.startY} C ${conn.startX + 50} ${conn.startY + 100}, ${conn.endX - 50} ${conn.endY - 100}, ${conn.endX} ${conn.endY}`}
                                            stroke={conn.color}
                                            strokeWidth={2}
                                            fill="none"
                                            strokeDasharray="5,5"
                                            strokeLinecap="round"
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{ 
                                                pathLength: 1, 
                                                opacity: 0.6
                                            }}
                                            style={{ 
                                                filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.5))'
                                            }}
                                            transition={{ 
                                                pathLength: { duration: 0.8, ease: "easeInOut" },
                                                opacity: { duration: 0.3 }
                                            }}
                                        />
                                        <motion.circle 
                                            cx={conn.startX} 
                                            cy={conn.startY} 
                                            r={3} 
                                            fill={conn.color} 
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            style={{ 
                                                filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.5))'
                                            }}
                                        />
                                        <motion.circle 
                                            cx={conn.endX} 
                                            cy={conn.endY} 
                                            r={3} 
                                            fill={conn.color} 
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            style={{ 
                                                filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.5))'
                                            }}
                                        />
                                    </svg>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        
                        {/* Render Category Labels */}
                        <AnimatePresence>
                            {renderedCategoryLabels}
                        </AnimatePresence>
                        
                        {/* Render Todos */}
                        {renderedTodoItems}

                        {/* Render Other Users' Cursors INSIDE TransformComponent */}
                        {Object.values(otherUsersCursors).map(cursor => {
                            if (currentUser && cursor.user_id === currentUser.id) return null;
                            const userColor = cursor.color || '#FFFFFF'; // Default to white if no color
                            return (
                                <div 
                                    key={`cursor-${cursor.user_id}`} 
                                    className="absolute pointer-events-none z-[1000]"
                                    style={{
                                        left: `${cursor.x}px`, 
                                        top: `${cursor.y}px`,
                                    }}
                                    title={cursor.username}
                                >
                                    <svg 
                                        width="28" // Slightly smaller for less intrusion
                                        height="28"
                                        viewBox="0 0 24 24" 
                                        style={{ 
                                            fill: userColor,
                                            stroke: 'rgba(249, 250, 251, 0.5)', // gray-50 at 50% opacity for a subtle outline
                                            strokeWidth: 0.75,
                                            filter: `drop-shadow(0 0 6px ${userColor}) drop-shadow(0 0 3px ${userColor})` // Double drop shadow for stronger glow
                                        }}
                                    >
                                        <path d="M0 0v16l4-4 3 8 3-1-3-7 5-1z" />
                                    </svg>
                                    <span 
                                        className="absolute text-xs px-2 py-1 rounded-md whitespace-nowrap text-gray-100"
                                        style={{
                                            backgroundColor: "rgba(31, 41, 55, 0.85)", // gray-800 at 85% opacity
                                            top: '28px',  // Adjust based on new cursor size
                                            left: '4px', 
                                            pointerEvents: 'none', 
                                            border: `1px solid ${userColor}A0`, // Border with user color at ~60% opacity (A0 hex)
                                            boxShadow: `0 0 8px ${userColor}50`, // Subtle glow for the label box, matching user color at ~30% opacity
                                            textShadow: '0 0 3px rgba(0,0,0,0.7)' // Dark text shadow for readability
                                        }}
                                    >
                                        {cursor.username}
                                    </span>
                                </div>
                            );
                        })}
                    </TransformComponent>
                )}
            </TransformWrapper>
            
            {/* New Task Modal */}
            <AnimatePresence>
                 {modalState.isOpen && (
                     <NewTaskModal 
                         key="new-task-modal"
                         x={modalState.viewportX} // Use viewport coords for modal screen position
                         y={modalState.viewportY}
                         onSave={handleSaveNewTask} // Saves canvas coords
                         onClose={handleCloseModal}
                     />
                 )}
            </AnimatePresence>
            
            {/* Tutorial Component */}
            <Tutorial 
                isOpen={tutorialOpen}
                onClose={handleTutorialClose}
            />
        </div>
    );
});

export default TodoCanvas; 