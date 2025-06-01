import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApiClient } from '../../hooks/useApiClient';
import { useAuth } from '../../context/AuthContext';
import { Board, BoardsApi, ResponseError, Role, BoardMembership } from '../../api';
import TodoListView from '../../components/TodoListView';
import ConstellationBackground from '../../components/ConstellationBackground';
import Header from '../../components/Header';
import { Toaster } from 'react-hot-toast';
import toast from '../../utils/toast';
import { useBoardWebSocket, ActiveUser, OtherUserCursorData } from '../../hooks/useBoardWebSocket';
import { usePanZoomLogic, PanZoomState } from '../../hooks/usePanZoomLogic';
import { throttle } from 'lodash';
import { ReactZoomPanPinchRef, ReactZoomPanPinchState } from 'react-zoom-pan-pinch';
import ChatPanel from '../../components/ChatPanel';
import Notifications from '../../components/Notifications';
import BoardSelectionScreen from '../../components/BoardSelectionScreen';
import GlobalLoadingIndicator from '../../components/GlobalLoadingIndicator';
import { motion } from 'framer-motion';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

// Extended BoardMembership type that includes last_disconnect_time
interface ExtendedBoardMembership extends BoardMembership {
    last_disconnect_time?: string | null;
}

function HomePage(): React.ReactElement {
    const { user, isAuthenticated, isLoading: authLoading, logout, token } = useAuth();
    const apiClient = useApiClient();
    const boardsApi = apiClient?.boardsApi;

    const [boards, setBoards] = useState<Board[]>([]);
    const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
    const [currentUserRoleOnBoard, setCurrentUserRoleOnBoard] = useState<Role | null>(null);
    const [currentBoardMembership, setCurrentBoardMembership] = useState<ExtendedBoardMembership | null>(null);
    const [isLoadingBoards, setIsLoadingBoards] = useState<boolean>(true);
    const [errorLoadingBoards, setErrorLoadingBoards] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [justCreatedBoardId, setJustCreatedBoardId] = useState<number | null>(null);

    const { 
        isConnected: isBoardConnected, 
        error: boardWsError,
        todos: boardTodos, 
        categories: boardCategories, 
        activeUsers: boardActiveUsers,
        otherUsersCursors,
        sendMessage: sendBoardMessage,
        chatMessages,
        currentUser: wsCurrentUser
    } = useBoardWebSocket(selectedBoard?.id ?? null);
    const todoCanvasRef = useRef<HTMLDivElement>(null);

    const {
        transformState,
        onTransform,
        screenToCanvasCoordinates,
    } = usePanZoomLogic();

    const throttledSendCursor = useCallback(
        throttle((x: number, y: number) => {
            if (sendBoardMessage && isBoardConnected) {
                sendBoardMessage('update_cursor', { x, y });
            }
        }, 100),
        [sendBoardMessage, isBoardConnected]
    );

    const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        if (todoCanvasRef.current && selectedBoard && isBoardConnected) {
            const rect = todoCanvasRef.current.getBoundingClientRect();
            const { x: canvasX, y: canvasY } = screenToCanvasCoordinates(event.clientX, event.clientY, rect);
            throttledSendCursor(canvasX, canvasY);
        }
    };

    const handleCanvasTransform = useCallback((passedRef: ReactZoomPanPinchRef, state: { scale: number; positionX: number; positionY: number; }) => {
        onTransform(passedRef, state as ReactZoomPanPinchState);
    }, [onTransform]);

    const fetchBoards = useCallback(async () => {
        if (user && token && boardsApi) {
            setIsLoadingBoards(true);
            try {
                const response = await boardsApi.listUserBoardsApiBoardsGet();
                setBoards(response);
                
                const lastSelectedBoardIdString = localStorage.getItem('lastSelectedBoardId');
                let boardToSelectInitially: Board | undefined | null = null;

                if (lastSelectedBoardIdString) {
                    const lastSelectedBoardId = parseInt(lastSelectedBoardIdString, 10);
                    boardToSelectInitially = response.find((b: Board) => b.id === lastSelectedBoardId);
                }

                if (boardToSelectInitially) {
                    setSelectedBoard(boardToSelectInitially);
                } else if (response.length > 0 && !lastSelectedBoardIdString) {
                    setSelectedBoard(null); 
                } else if (response.length === 0) {
                    setSelectedBoard(null); 
                }
                setErrorLoadingBoards(null);
            } catch (err: any) {
                console.error('Error fetching boards:', err);
                setErrorLoadingBoards('Failed to fetch boards. Please try again later.');
                setSelectedBoard(null);
                if (err.status === 401 || (err.response && err.response.status === 401)) {
                    toast.error('Session expired. Please log in again.');
                    logout();
                }
            } finally {
                setIsLoadingBoards(false);
            }
        } else {
            setIsLoadingBoards(false);
            setBoards([]);
            setSelectedBoard(null);
        }
    }, [user, token, boardsApi, logout]);

    useEffect(() => {
        fetchBoards();
    }, [fetchBoards]);

    useEffect(() => {
        if (selectedBoard && user && boardsApi) {
            setCurrentUserRoleOnBoard(null);
            setCurrentBoardMembership(null);
            console.log(`Fetching members for board ID: ${selectedBoard.id}`);
            boardsApi.listBoardMembersApiBoardsBoardIdMembersGet({ boardId: selectedBoard.id })
                .then((memberships: BoardMembership[]) => {
                    console.log(`Members for board ${selectedBoard.name}:`, memberships);
                    const currentUserMembership = memberships.find(m => m.userId === user.id);
                    if (currentUserMembership) {
                        setCurrentUserRoleOnBoard(currentUserMembership.role);
                        setCurrentBoardMembership(currentUserMembership as ExtendedBoardMembership);
                        console.log(`Current user (ID: ${user.id}) role on board ${selectedBoard.name}: ${currentUserMembership.role}`);
                    } else {
                        console.warn(`Current user (ID: ${user.id}) not found in members list for board ${selectedBoard.name}. Assuming no specific role / default permissions.`);
                        setCurrentUserRoleOnBoard(null);
                        setCurrentBoardMembership(null);
                    }
                })
                .catch((err: ResponseError | any) => {
                    console.error("Failed to fetch board members or determine user role:", err);
                    toast.error("Could not determine your role for this board. Permissions may be restricted.");
                    setCurrentUserRoleOnBoard(null);
                    setCurrentBoardMembership(null);
                });
        } else if (!selectedBoard) {
            setCurrentUserRoleOnBoard(null);
            setCurrentBoardMembership(null);
        }
    }, [selectedBoard, user, boardsApi]);

    useEffect(() => {
        if (selectedBoard) {
            localStorage.setItem('lastSelectedBoardId', selectedBoard.id.toString());
        } else {
            localStorage.removeItem('lastSelectedBoardId');
        }
    }, [selectedBoard]);

    const handleSelectBoard = useCallback((boardId: number) => {
        const boardToSelect = boards.find(b => b.id === boardId);
        if (boardToSelect) {
            setSelectedBoard(boardToSelect);
        } else {
            toast.error("Selected board not found. It might have been deleted or an error occurred.");
            setSelectedBoard(null);
        }
    }, [boards, setSelectedBoard]);

    const handleCreateBoard = async (name: string) => {
        if (!boardsApi || !user) {
            toast.error("Cannot create board: API or user not available.");
            return;
        }
        try {
            const newBoard = await boardsApi.createNewBoardApiBoardsPost({ boardCreate: { name } });
            setBoards(prevBoards => [...prevBoards, newBoard]);
            setJustCreatedBoardId(newBoard.id);
            toast.success(`Board "${newBoard.name}" created!`);
        } catch (error) {
            console.error("Failed to create board:", error);
            if (error instanceof ResponseError) {
                const errorBody = await error.response.json();
                toast.error(`Failed to create board: ${errorBody.detail || error.message}`);
            } else {
                toast.error("Failed to create board. Please try again.");
            }
        }
    };

    useEffect(() => {
        if (justCreatedBoardId) {
            handleSelectBoard(justCreatedBoardId);
            setJustCreatedBoardId(null);
        }
    }, [justCreatedBoardId, handleSelectBoard]);

    const handleEditBoard = async (boardId: number, newName: string) => {
        if (!boardsApi) {
            toast.error("Cannot update board: API not available.");
            return;
        }
        try {
            const updatedBoardData = await boardsApi.updateBoardDetailsApiBoardsBoardIdPut({ boardId, boardUpdate: { name: newName } });
            setBoards(prevBoards => prevBoards.map(b => b.id === boardId ? { ...b, ...updatedBoardData } : b));
            if (selectedBoard && selectedBoard.id === boardId) {
                setSelectedBoard(prev => prev ? { ...prev, ...updatedBoardData } : null);
            }
            toast.success(`Board "${updatedBoardData.name}" updated!`);
        } catch (error) {
            console.error("Failed to update board:", error);
            if (error instanceof ResponseError) {
                const errorBody = await error.response.json();
                toast.error(`Failed to update board: ${errorBody.detail || error.message}`);
            } else {
                toast.error("Failed to update board. Please try again.");
            }
        }
    };
    
    const handleDeleteBoard = async (boardId: number) => {
        if (!boardsApi) {
            toast.error("Cannot delete board: API not available.");
            return;
        }
        const originalBoards = [...boards];
        const boardToDelete = boards.find(b => b.id === boardId);
        if (!boardToDelete) return;

        setBoards(prevBoards => prevBoards.filter(b => b.id !== boardId));
        if (selectedBoard && selectedBoard.id === boardId) {
            setSelectedBoard(null); 
            localStorage.removeItem('lastSelectedBoardId');
        }

        try {
            await boardsApi.deleteSpecificBoardApiBoardsBoardIdDelete({ boardId });
            toast.success(`Board "${boardToDelete.name}" deleted.`);
        } catch (error) {
            setBoards(originalBoards);
            if (selectedBoard && selectedBoard.id === boardId) { 
                setSelectedBoard(boardToDelete); 
                localStorage.setItem('lastSelectedBoardId', boardId.toString());
            }
            console.error("Failed to delete board:", error);
            if (error instanceof ResponseError) {
                const errorBody = await error.response.json();
                toast.error(`Failed to delete board: ${errorBody.detail || error.message}`);
            } else {
                toast.error("Failed to delete board. Please try again.");
            }
        }
    };

    const handleBoardCreated = (newBoard: Board) => {
        setBoards(prevBoards => [...prevBoards, newBoard]);
        setJustCreatedBoardId(newBoard.id);
    };

    const handleBoardUpdated = (updatedBoard: Board) => {
        setBoards(prevBoards => prevBoards.map(b => b.id === updatedBoard.id ? updatedBoard : b));
        if (selectedBoard && selectedBoard.id === updatedBoard.id) {
            setSelectedBoard(updatedBoard);
        }
    };

    const handleBoardDeleted = (boardId: number) => {
        setBoards(prevBoards => prevBoards.filter(b => b.id !== boardId));
        if (selectedBoard && selectedBoard.id === boardId) {
            if (boards.length > 1) {
                const newSelectedBoard = boards.find(b => b.id !== boardId);
                setSelectedBoard(newSelectedBoard || null);
            } else {
                setSelectedBoard(null);
            }
        }
    };

    const handleInvitationAccepted = () => {
        fetchBoards();
    };

    const displayError = errorLoadingBoards || error;
    const isLoading = authLoading || (isAuthenticated && isLoadingBoards) || (boards.length === 0 && !displayError);

    const handleUserUpdated = () => {
        console.log("User profile updated, Header received onUserUpdated callback.");
    };

    const handleAccountDeactivated = () => {
        logout();
        toast.success("Account deactivated. You have been logged out.", { 
            icon: '👋',
        }); 
    };

    const handleReturnToBoardSelection = () => {
        setSelectedBoard(null);
    };

    // Determine Global Loading State and Message
    let globalLoadingMessage: string | undefined = undefined;
    let isGlobalLoadingActive: boolean = false;

    if (authLoading) {
        isGlobalLoadingActive = true;
        globalLoadingMessage = "Authenticating...";
    } else if (isLoadingBoards && !selectedBoard && boards.length === 0) {
        // Show general loading only if no board is selected and we are fetching initial board list
        isGlobalLoadingActive = true;
        globalLoadingMessage = "Loading ThoughtSpaces...";
    } else if (selectedBoard && !isBoardConnected && !boardWsError) {
        // Show connecting to board only if a board is selected, not yet connected, and no WebSocket error
        isGlobalLoadingActive = true;
        globalLoadingMessage = `Connecting to ${selectedBoard.name || 'board'}...`;
    }

    // Early returns for critical states not covered by GlobalLoadingIndicator
    if (!isAuthenticated && !authLoading) {
        // This state implies user needs to login, typically handled by ProtectedRoute, but as a fallback UI.
        return (
            <div className="min-h-screen h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center text-white">
                <p className="text-xl">Redirecting to login...</p>
            </div>
        );
    }

    if (errorLoadingBoards && !isLoadingBoards && boards.length === 0) { // Show full page error if initial board load fails
        return (
            <div className="min-h-screen h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center text-white p-4">
                <ExclamationCircleIcon className="w-16 h-16 text-red-500/70 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-red-400 mb-2">Error Loading Boards</h2>
                <p className="text-gray-400 mb-6 max-w-md">{errorLoadingBoards}</p>
                <button 
                    onClick={fetchBoards} 
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg shadow-md hover:brightness-110 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center p-0 overflow-hidden" onMouseMove={selectedBoard ? handleMouseMove : undefined}>
            <GlobalLoadingIndicator isLoading={isGlobalLoadingActive} message={globalLoadingMessage} />
            <Toaster
                position="top-left"
                reverseOrder={true}
                gutter={12}
                containerStyle={{
                    top: 80,
                    left: 20,
                    maxWidth: '90%',
                    textAlign: 'left'
                }}
                toastOptions={{
                    duration: 4000,
                    className: 'toast-override',
                    success: {
                        iconTheme: {
                            primary: '#10B981',
                            secondary: '#0F172A',
                        },
                        style: {
                            background: 'rgba(15, 23, 42, 0.95)',
                            color: '#E5E7EB',
                            border: '1px solid #10B981',
                            boxShadow: '0 0 15px rgba(16, 185, 129, 0.5)',
                            borderRadius: '8px',
                            backdropFilter: 'blur(8px)',
                            fontSize: '0.9rem',
                            padding: '12px 16px',
                            maxWidth: '350px',
                            textAlign: 'left'
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#EF4444',
                            secondary: '#0F172A',
                        },
                        style: {
                            background: 'rgba(15, 23, 42, 0.95)',
                            color: '#E5E7EB',
                            border: '1px solid #EF4444',
                            boxShadow: '0 0 15px rgba(239, 68, 68, 0.5)',
                            borderRadius: '8px',
                            backdropFilter: 'blur(8px)',
                            fontSize: '0.9rem',
                            padding: '12px 16px',
                            maxWidth: '350px',
                            textAlign: 'left'
                        },
                        duration: 5000,
                    },
                    loading: {
                        style: {
                            background: 'rgba(15, 23, 42, 0.95)',
                            color: '#E5E7EB',
                            border: '1px solid #3B82F6',
                            boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)',
                            borderRadius: '8px',
                            backdropFilter: 'blur(8px)',
                            fontSize: '0.9rem',
                            padding: '12px 16px',
                            maxWidth: '350px',
                            textAlign: 'left'
                        },
                    },
                }}
            />
            <Header 
                currentBoardName={selectedBoard?.name || null}
                currentUser={user}
                onLogout={logout}
                selectedBoardId={selectedBoard?.id ?? null}
                currentUserRole={currentUserRoleOnBoard}
                onUserUpdated={handleUserUpdated}
                onAccountDeactivated={handleAccountDeactivated}
                onReturnToBoardSelection={selectedBoard ? handleReturnToBoardSelection : undefined}
                onInvitationAccepted={handleInvitationAccepted}
            />

            {/* Render main content if not in a critical loading/error state already handled by early return */}
            {isAuthenticated && (
                selectedBoard && isBoardConnected ? (
                    <main className="flex-grow w-full h-full relative overflow-hidden" ref={todoCanvasRef}>
                        <ConstellationBackground />
                        <TodoListView
                            board={selectedBoard}
                            todos={boardTodos}
                            categories={boardCategories}
                            activeUsers={boardActiveUsers}
                            otherUsersCursors={otherUsersCursors}
                            sendMessage={sendBoardMessage}
                            isBoardConnected={isBoardConnected}
                            boardWsError={boardWsError}
                            currentUserRole={currentUserRoleOnBoard}
                            onBoardUpdated={handleBoardUpdated}
                            onBoardDeleted={handleBoardDeleted}
                            onPanZoomTransform={handleCanvasTransform} 
                            initialTransform={transformState}
                            currentUser={user}
                        />
                        {wsCurrentUser && (
                            <ChatPanel 
                                chatMessages={chatMessages} 
                                currentUser={wsCurrentUser}
                                sendMessage={sendBoardMessage} 
                                boardId={selectedBoard.id}
                                lastDisconnectTime={currentBoardMembership?.last_disconnect_time || null}
                            />
                        )}
                    </main>
                ) : !selectedBoard && !isGlobalLoadingActive && !errorLoadingBoards ? (
                    // Show BoardSelectionScreen only if no board is selected AND global loading is not active (for initial board list) AND no error
                    <BoardSelectionScreen 
                        boards={boards}
                        onSelectBoard={handleSelectBoard}
                        onCreateBoard={handleCreateBoard}
                        currentUser={user}
                        onEditBoard={handleEditBoard}
                        onDeleteBoard={handleDeleteBoard}
                    />
                ) : null // If selectedBoard is set but not connected, GlobalLoadingIndicator handles it.
                       // If errorLoadingBoards is true but boards.length > 0, it's a non-critical error, allow navigation.
            )}
            {/* <Notifications onInvitationAccepted={handleInvitationAccepted} /> */}
            {/* Notifications is now rendered and managed by Header.tsx */}
        </div>
    );
}

export default HomePage;