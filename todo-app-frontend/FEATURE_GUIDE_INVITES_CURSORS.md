# Frontend Guide: Invitations & Cursor Broadcasting

This guide details two new features added to the backend: a board invitation system and real-time cursor position broadcasting.

## 1. Board Invitation System

Instead of directly adding members to a board, users are now invited via email. Invited users can then accept or decline these invitations.

### 1.1 Sending Invitations (Replaces Direct Add)

*   **Endpoint:** `POST /api/boards/{board_id}/members`
*   **Permissions:** The user making the request must be an **Editor** or **Owner** of the board (`{board_id}`).
*   **Request Body (`schemas.BoardInvitationCreate`):**
    ```json
    {
      "invited_user_email": "user_to_invite@example.com",
      "role": "viewer" 
    }
    ```
    *   `role`: The role (`viewer` or `editor`) the user will have if they accept. Defaults to `viewer` if omitted (though schema requires it).
*   **Response (`schemas.BoardInvitation`):**
    *   On success (status code 201), returns the created invitation object, including details like `id`, `board_id`, `invited_user_email`, `invited_by_user_id`, `role`, `status` (`pending`), timestamps, and potentially nested `inviter` and `board` info.
    *   **Error Responses:**
        *   `400 Bad Request`: If trying to invite yourself.
        *   `403 Forbidden`: If the performing user is not an Editor/Owner.
        *   `404 Not Found`: If the board doesn't exist (should be caught by permission dependency).
        *   `409 Conflict`: If the user is *already a member* of the board, OR if there is *already a pending invitation* for this user email on this board.

### 1.2 Managing Received Invitations (for the logged-in user)

*   **List My Pending Invitations:**
    *   **Endpoint:** `GET /api/users/me/invitations`
    *   **Permissions:** Requires logged-in user.
    *   **Response:** Returns a list of `schemas.BoardInvitation` objects where the user is the `invited_user_email` and the `status` is `pending`. Includes nested `inviter` and `board` details for context.
*   **Accept Invitation:**
    *   **Endpoint:** `POST /api/invitations/{invitation_id}/accept`
    *   **Permissions:** Requires logged-in user who matches the `invited_user_email` on the invitation.
    *   **Response (`schemas.BoardMembership`):** On success (status code 200), returns the newly created `BoardMembership` object for the user on that board.
    *   **Error Responses:**
        *   `403 Forbidden`: If the current user is not the invited user.
        *   `404 Not Found`: If the invitation doesn't exist or is not in `pending` status.
        *   `500 Internal Server Error`: If membership creation fails unexpectedly after invite acceptance.
*   **Decline Invitation:**
    *   **Endpoint:** `POST /api/invitations/{invitation_id}/decline`
    *   **Permissions:** Requires logged-in user who matches the `invited_user_email` on the invitation.
    *   **Response (`schemas.BoardInvitation`):** On success (status code 200), returns the invitation object with its status updated to `declined`.
    *   **Error Responses:** Similar to Accept (403, 404, 500).

### 1.3 Revoking Sent Invitations (for board admins)

*   **Endpoint:** `DELETE /api/invitations/{invitation_id}`
*   **Permissions:** Requires the performing user to be either the **original inviter** OR the **board owner**.
*   **Response:** `204 No Content` on success.
*   **Error Responses:**
    *   `400 Bad Request`: If the invitation is not currently `pending`.
    *   `403 Forbidden`: If the user is not the inviter or board owner.
    *   `404 Not Found`: If the invitation doesn't exist.

## 2. Real-time Cursor Broadcasting

This feature allows users on the same board to see each other's cursors in real-time. It operates purely over the established board WebSocket connection.

### 2.1 Sending Cursor Position (Client -> Server)

*   The frontend should periodically (e.g., on throttled mouse move events) send a WebSocket message with the current cursor position.
*   **Message Format:**
    ```json
    {
      "action": "update_cursor",
      "payload": {
        "x": 123.45,
        "y": 678.90 
      }
    }
    ```
    *   `x`, `y`: The current numerical coordinates of the user's cursor relative to the board area.
*   The server does not send an explicit success/failure response for these messages but may log errors internally.

### 2.2 Receiving Cursor Positions (Server -> Client)

*   Whenever a user sends an `update_cursor` message, the server broadcasts the position to all *other* users connected to the same board.
*   **Message Format:**
    ```json
    {
      "action": "cursor_update",
      "payload": {
        "user_id": 5,
        "username": "other_user",
        "color": "#123456",
        "x": 123.45,
        "y": 678.90
      }
    }
    ```
    *   `user_id`, `username`, `color`: Details of the user whose cursor moved. The `color` is their effective color for that board (board-specific override or user default).
    *   `x`, `y`: The coordinates received from that user.
*   The frontend should listen for these `cursor_update` messages and use the payload to display a visual representation (e.g., a named/colored cursor icon) of other users' cursors at the given positions.

This covers the frontend-relevant aspects of the new invitation and cursor broadcasting features. Remember to handle the WebSocket connection lifecycle and potential errors gracefully. 