## Frontend Guide: Implementing Board Chat

This guide outlines how to integrate the new real-time chat feature into the board interface. The backend has been updated to support sending and receiving chat messages over the existing WebSocket connection.

**Key Concepts:**

1.  **Receiving Initial Chat History:** When a user connects to a board via WebSocket, the initial `board_data_update` message they receive will now include a `chat_history` array in its payload.
2.  **Sending a Chat Message:** To send a message, the client emits a WebSocket message with `action: "send_chat_message"`.
3.  **Receiving New Chat Messages:** New messages from any user on the board (including messages sent by the current user) will be broadcast by the server with `action: "new_chat_message"`.
4.  **Error Handling:** If an action (like sending a malformed chat message) results in an error, the server will send a message with `action: "error"` specifically to the user who triggered it.

**1. Handling Initial Board Data (with Chat History)**

When your WebSocket connection is established and you receive the first `board_data_update` message (typically handled when the client sends a `get_board_data` message or similar upon connection), its payload will now look like this:

```json
{
  "action": "board_data_update",
  "payload": {
    "board_id": 123,
    "todos": [ /* ... list of todos ... */ ],
    "categories": [ /* ... list of categories ... */ ],
    "active_users": [ /* ... list of active users ... */ ],
    "chat_history": [ // NEW: Array of recent chat messages
      {
        "id": 101,
        "board_id": 123,
        "user_id": 5,
        "message": "Welcome to the board!",
        "timestamp": "2023-10-27T10:00:00Z",
        "user": { "id": 5, "username": "Alice", "color": "#FF0000" }
      },
      {
        "id": 102,
        "board_id": 123,
        "user_id": 7,
        "message": "Glad to be here.",
        "timestamp": "2023-10-27T10:01:30Z",
        "user": { "id": 7, "username": "Bob", "color": "#0000FF" }
      }
      // ... more messages, up to 50, newest first by timestamp
    ]
  }
}
```

*   `chat_history`: An array of chat message objects.
    *   Each message object contains `id`, `board_id`, `user_id`, `message` text, `timestamp` (ISO 8601 string), and a nested `user` object (`id`, `username`, `color`).
    *   The messages are **ordered newest first** (by timestamp descending) as they come from the server. You will likely want to **reverse this array on the client-side** to display them in chronological order (oldest message at the top, newest at the bottom).
*   Store this `chat_history` in your frontend state to render the initial chat view.

**2. Sending a Chat Message**

To send a chat message, the client should emit a WebSocket message in the following format:

```json
{
  "action": "send_chat_message",
  "payload": {
    "message": "This is my new chat message!"
  }
}
```

*   `action`: Must be `"send_chat_message"`.
*   `payload`: An object containing:
    *   `message`: (String) The content of the chat message. It should be between 1 and 1000 characters.

The server will save this message to the database and then broadcast it to all users on the board (including the sender) via the `new_chat_message` action (see below).

**3. Receiving New Chat Messages**

Listen for WebSocket messages with `action: "new_chat_message"`. These will be sent whenever any user (including the current one) posts a new message to the board.

```json
{
  "action": "new_chat_message",
  "payload": { // This is a single ChatMessage object
    "id": 105,
    "board_id": 123,
    "user_id": 5,
    "message": "This is my new chat message!",
    "timestamp": "2023-10-27T10:05:00Z",
    "user": { "id": 5, "username": "Alice", "color": "#FF0000" }
  }
}
```

*   The `payload` is a single chat message object, identical in structure to those found in the `chat_history` array.
*   When you receive this, append it to your local list of chat messages in your frontend state to update the UI. Since these arrive in real-time, they should naturally appear at the end of your chronologically ordered message list.

**4. Handling Board Data Updates (General)**

Subsequent `board_data_update` messages (e.g., after a todo is created, a user changes their color, or another user joins/leaves) will **not** contain the full `chat_history` again to save bandwidth. They will continue to provide updates for `todos`, `categories`, and `active_users`. Your chat message list should be managed independently by appending `new_chat_message` payloads and initializing from `chat_history` only on the first load.

**5. Handling Errors**

If the server encounters an issue processing a WebSocket message sent by the client (e.g., invalid payload for `send_chat_message`), it will send an error message *specifically to that client*.

```json
{
  "action": "error",
  "payload": {
    "message": "Chat message cannot be empty.",
    "status_code": 400 // Optional: an HTTP-like status code
  }
}
```

*   `action`: Will be `"error"`.
*   `payload`: Contains:
    *   `message`: (String) A description of the error.
    *   `status_code`: (Integer, Optional) An indicative status code.
*   You should display this error to the user appropriately (e.g., a toast notification).

**UI Implementation Notes:**

*   Create a chat panel or area within the board interface.
*   Display messages chronologically. Remember to reverse the initial `chat_history` array.
*   For each message, display the `user.username`, the `message` content, and the `timestamp` (formatted nicely). You can use the `user.color` to visually distinguish messages from different users (e.g., color the username or add a colored dot).
*   Provide a text input field for users to type their messages and a "Send" button.
*   When the "Send" button is clicked, construct and send the `send_chat_message` WebSocket message.
*   Consider auto-scrolling the chat view to the latest message when new messages arrive or are sent.

This should cover the frontend integration for the new chat feature. Let me know if any part is unclear! 