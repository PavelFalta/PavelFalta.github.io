import { useState, useEffect, useRef, useCallback } from 'react';
import { Todo, Category } from '../types/domain'; // Import our domain types
import { useAuth, User } from '../context/AuthContext'; // Import User type
import toast from '../utils/toast';
import { Role as ApiRole } from '../api'; // Import Role from API

// Define the structure for an active user based on backend payload
export interface ActiveUser {
    user_id: number;
    username: string;
    color: string;
    role: ApiRole;
    // Add cursor positions if they come with active_users, otherwise manage separately
    // x?: number; 
    // y?: number;
}

// Define cursor-related message structures
interface UpdateCursorPayload {
    x: number;
    y: number;
}

interface CursorUpdatePayload {
    user_id: number;
    username: string;
    color: string;
    x: number;
    y: number;
}

interface CursorUpdateMessage {
    action: 'cursor_update';
    payload: CursorUpdatePayload;
}

// Define the structure of the expected WebSocket messages (based on migration guide)
interface BoardDataUpdateMessage {
    action: 'board_data_update';
    payload: {
        board_id: number;
        todos: Todo[];
        categories: Category[];
        active_users: ActiveUser[];
        chat_history?: ChatMessage[]; // Optional: only in initial load
    };
}

// --- Chat Message Types ---
export interface ChatUser {
    id: number;
    username: string;
    color: string;
}

export interface ChatMessage {
    id: number;
    board_id: number;
    user_id: number;
    message: string;
    timestamp: string; // ISO 8601
    user: ChatUser;
}

interface ChatHistoryPayload {
    chat_history: ChatMessage[];
}

interface NewChatMessagePayload extends ChatMessage {}

interface NewChatMessage {
    action: 'new_chat_message';
    payload: NewChatMessagePayload;
}

export interface SendChatMessagePayload {
    message: string;
}
// --- End Chat Message Types ---

interface ErrorMessagePayload {
    message: string;
    status_code?: number;
}

interface ErrorMessage {
    action: 'error'; // Explicitly define action for error messages
    payload: ErrorMessagePayload;
}

// Add new interface for active users update
interface ActiveUsersUpdateMessage {
    action: 'active_users_update';
    payload: ActiveUser[];
}

// Update ReceivedMessage type to include the new message type
type ReceivedMessage = BoardDataUpdateMessage | ErrorMessage | CursorUpdateMessage | NewChatMessage | ActiveUsersUpdateMessage;

// Define a type for storing other users' cursor data
export interface OtherUserCursorData extends CursorUpdatePayload {}

// Hook definition
export const useBoardWebSocket = (boardId: number | null) => {
    const { token, user: authUser } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [todos, setTodos] = useState<Todo[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
    const [otherUsersCursors, setOtherUsersCursors] = useState<Record<number, OtherUserCursorData>>({});
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]); // State for chat messages
    const [error, setError] = useState<string | null>(null);
    const webSocketRef = useRef<WebSocket | null>(null);
    const isInitialBoardDataReceived = useRef(false); // Track if initial board data (with chat history) has been processed

    // Function to construct WebSocket URL
    const getWebSocketUrl = useCallback((currentBoardId: number, currentToken: string): string | null => {
        if (!currentBoardId || !currentToken) return null;
        
        // Determine protocol (ws or wss)
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Use window.location.host for host/port (works for dev and prod)
        // The backend endpoint is /ws/board/{board_id}/{token}
        // IMPORTANT: Ensure backend host/port are correct or use relative path if served from same origin
        // Assuming backend is running on same host/port for now or configured via proxy
        // Example: const backendHost = 'localhost:8000'; // Or get from config
        // Use relative path if same origin, otherwise specify full host
        // Correct path based on migration guide: /ws/board/{board_id}/{token}
        
        // Get backend base URL from config or environment variable
        // TODO: Get this from a config file like `../config.ts`
        const backendBaseWsUrl = `${proto}//${window.location.host}`; // Example: ws://localhost:5173 or wss://yourdomain.com
        
        // TODO: Remove /api if necessary, check backend setup
        // If backend WS is served from a different path/port adjust base url.
        // Example using the provided backend URL:
        const backendHost = 'todo-backend-production-df5a.up.railway.app'; 
        const baseWsUrl = `${proto}//${backendHost}`;

        return `${baseWsUrl}/ws/board/${currentBoardId}/${currentToken}`;
    }, []);

    // Effect to manage WebSocket connection
    useEffect(() => {
        if (boardId && token) {
            isInitialBoardDataReceived.current = false; // Reset for new connection
            const wsUrl = getWebSocketUrl(boardId, token);
            if (!wsUrl) return;

            console.log(`Connecting to WebSocket for board ${boardId}: ${wsUrl}`);
            const ws = new WebSocket(wsUrl);
            webSocketRef.current = ws;

            ws.onopen = () => {
                console.log(`WebSocket connected for board ${boardId}`);
                setIsConnected(true);
                setError(null);
                setTodos([]); 
                setCategories([]);
                setActiveUsers([]);
                setChatMessages([]); // Clear chat on new connection before history arrives
                setOtherUsersCursors({});
                // Backend might send board_data_update automatically, or require a client message like 'get_board_data'
                // Assuming it sends automatically based on the guide.
            };

            ws.onmessage = (event) => {
                try {
                    const message: ReceivedMessage = JSON.parse(event.data);
                    
                    if (message.action === 'board_data_update') {
                        const update = message as BoardDataUpdateMessage;
                        setTodos(update.payload.todos || []);
                        setCategories(update.payload.categories || []);
                        setActiveUsers(update.payload.active_users || []);
                        // Handle chat_history only on the first board_data_update
                        if (update.payload.chat_history && !isInitialBoardDataReceived.current) {
                            setChatMessages((update.payload.chat_history || []).slice().reverse()); // Reverse for chronological display
                            isInitialBoardDataReceived.current = true;
                        }
                    } else if (message.action === 'cursor_update') {
                        const cursorMessage = message as CursorUpdateMessage;
                        if (authUser && cursorMessage.payload.user_id === authUser.id) return;
                        setOtherUsersCursors(prevCursors => ({
                            ...prevCursors,
                            [cursorMessage.payload.user_id]: cursorMessage.payload
                        }));
                    } else if (message.action === 'active_users_update') {
                        const activeUsersMessage = message as ActiveUsersUpdateMessage;
                        console.log('Received active users update:', activeUsersMessage.payload);
                        setActiveUsers(activeUsersMessage.payload);
                    } else if (message.action === 'new_chat_message') {
                        const newChatMessage = message as NewChatMessage;
                        setChatMessages(prevMessages => [...prevMessages, newChatMessage.payload]);
                    } else if (message.action === 'error') {
                        const errorMessage = message as ErrorMessage;
                        console.error('WebSocket error message from server:', errorMessage.payload.message);
                        setError(errorMessage.payload.message);
                        toast.error(`Server Error: ${errorMessage.payload.message}`);
                    } else {
                        console.warn('Received unknown WebSocket message structure:', message);
                    }
                } catch (e) {
                    console.error('Failed to parse WebSocket message:', e);
                    setError('Received invalid data from server.');
                    toast.error('Received invalid data from server.');
                }
            };

            ws.onerror = (event) => {
                console.error('WebSocket error:', event);
                setError('WebSocket connection error.');
                setIsConnected(false);
                toast.error('WebSocket connection error.');
                // Optionally add retry logic here
            };

            ws.onclose = (event) => {
                console.log(`WebSocket disconnected for board ${boardId}. Code: ${event.code}, Reason: ${event.reason}`);
                setIsConnected(false);
                if (webSocketRef.current === ws) { 
                    webSocketRef.current = null;
                }
                if (event.code === 4001 || event.code === 4003) { 
                    toast.error('Board connection unauthorized. Please refresh.');
                    setError('Connection unauthorized.');
                }
                // Clear all board-specific data on close
                setTodos([]);
                setCategories([]);
                setActiveUsers([]);
                setOtherUsersCursors({});
                setChatMessages([]); 
                setError(null);
                isInitialBoardDataReceived.current = false;
            };

            // Cleanup function to close WebSocket when boardId/token changes or component unmounts
            return () => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    console.log(`Closing WebSocket connection for board ${boardId}`);
                    ws.close(1000, 'Client changing board or disconnecting');
                }
                // Ensure all state is reset if the effect re-runs due to boardId/token change before ws.onclose fires
                if (webSocketRef.current === ws) { // Only nullify if it's the same socket instance
                    webSocketRef.current = null;
                }
                setIsConnected(false);
                setTodos([]);
                setCategories([]);
                setActiveUsers([]);
                setOtherUsersCursors({});
                setChatMessages([]);
                setError(null);
                isInitialBoardDataReceived.current = false;
            };

        } else {
            // If no boardId or token, ensure connection is closed
            if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
                webSocketRef.current.close(1000, 'Client logged out or no board selected');
            }
            webSocketRef.current = null;
            setIsConnected(false);
            setTodos([]);
            setCategories([]);
            setActiveUsers([]);
            setOtherUsersCursors({});
            setChatMessages([]);
            setError(null);
            isInitialBoardDataReceived.current = false;
        }
    }, [boardId, token, getWebSocketUrl, authUser]); // Reconnect if boardId or token changes

    // Effect to prune cursors if users become inactive
    useEffect(() => {
        const activeUserIds = new Set(activeUsers.map(u => u.user_id));
        setOtherUsersCursors(prevCursors => {
            const nextCursors: Record<number, OtherUserCursorData> = {};
            for (const userIdStr in prevCursors) {
                const userId = parseInt(userIdStr, 10);
                if (activeUserIds.has(userId)) {
                    nextCursors[userId] = prevCursors[userId];
                }
            }
            return nextCursors;
        });
    }, [activeUsers]); // Rerun when activeUsers list changes

    // Function to send messages/actions
    const sendMessage = useCallback((action: string, payload: any) => {
        if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
            const message = JSON.stringify({ action, payload });
            console.log('Sending WebSocket message:', message);
            webSocketRef.current.send(message);
        } else {
            console.error('WebSocket not connected. Cannot send message.');
            toast.error('Not connected to board. Cannot perform action.');
        }
    }, []);

    return { isConnected, todos, categories, activeUsers, otherUsersCursors, chatMessages, error, sendMessage, currentUser: authUser }; // Expose chatMessages and authUser
}; 