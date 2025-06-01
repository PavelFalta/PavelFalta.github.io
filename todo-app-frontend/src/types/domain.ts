// src/types/domain.ts

// Based on migration guide and common existing fields
export interface Category {
  id: number;
  name: string;
  color: string | null;
  board_id: number;
  is_completed?: boolean; // Optional property for completed labels
  // Add other fields if they exist and are relevant from old Category model
}

export interface Todo {
  id: number;
  name: string;
  description?: string | null;
  position_x: number;
  position_y: number;
  is_completed: boolean;
  created_at: string; // Assuming ISO string format
  updated_at: string; // Assuming ISO string format
  completed_at?: string | null; // Assuming ISO string format
  category_id?: number | null;
  board_id: number;
  // Add other fields if they exist and are relevant from old Todo model
  // Example: due_date, order, etc.
}

// For updating todos, usually a subset of fields
export interface TodoUpdate {
  name?: string;
  description?: string | null;
  position_x?: number;
  position_y?: number;
  is_completed?: boolean;
  category_id?: number | null;
  // board_id is usually not part of update as it's board-specific via WebSocket
}

// Renamed from TodoCreatePayload to TodoCreate
export interface TodoCreate {
  name: string;
  position_x: number;
  position_y: number;
  description?: string | null;
  category_id?: number | null;
}

// For creating categories via WebSocket (payload)
// board_id is implicit from WebSocket connection
export interface CategoryCreatePayload {
  name: string;
  color?: string | null;
}

// For updating categories via WebSocket (payload)
export interface CategoryUpdatePayload {
    name?: string;
    color?: string | null;
}

// Structure for BoardMemberInfo as described in migration guide (used in Board.members)
export interface BoardMemberInfo {
  user_id: number;
  username: string;
  role: 'owner' | 'editor' | 'viewer';
  color: string; // User's color
} 