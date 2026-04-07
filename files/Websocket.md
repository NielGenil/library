# WebSocket Integration: Django + React

A complete, step-by-step guide to implementing real-time WebSocket communication between a Django backend and a React frontend.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Data Models](#data-models)
   - [accounts/models.py — CustomUser & FriendRequest](#accountsmodelspy--customuser--friendrequest)
   - [chats/models.py — Conversation & Message](#chatsmodelspy--conversation--message)
   - [notifications/models.py — Notification](#notificationsmodelspy--notification)
   - [How the Models Relate](#how-the-models-relate)
3. [Backend Setup — Django](#backend-setup--django)
   - [Install Dependencies](#1-install-dependencies)
   - [Configure Django Settings](#2-configure-django-settings)
   - [Set Up ASGI](#3-set-up-asgi)
   - [Create a Consumer](#4-create-a-consumer)
   - [Configure WebSocket Routing](#5-configure-websocket-routing)
   - [Run with Daphne or Uvicorn](#6-run-with-daphne-or-uvicorn)
4. [Frontend Setup — React](#frontend-setup--react)
   - [Build the WebSocket Hook](#1-build-the-websocket-hook)
   - [Build the Chat Component](#2-build-the-chat-component)
5. [Database Operations Inside Consumers](#database-operations-inside-consumers)
   - [Why You Need database_sync_to_async](#why-you-need-database_sync_to_async)
   - [The Core Pattern](#the-core-pattern)
   - [Writing DB Helper Methods](#writing-db-helper-methods)
   - [Calling Helpers from receive()](#calling-helpers-from-receive)
   - [Handling Multiple Event Types](#handling-multiple-event-types)
   - [User-Level Groups vs Room Groups](#user-level-groups-vs-room-groups)
   - [Heartbeat — Detecting Dead Connections](#heartbeat--detecting-dead-connections)
   - [Common Mistakes](#common-mistakes)
6. [Channel Layers — Redis (Production)](#channel-layers--redis-production)
7. [Authentication Over WebSocket](#authentication-over-websocket)
8. [Common Errors & Fixes](#common-errors--fixes)
9. [Full Flow Summary](#full-flow-summary)

---

## Project Structure

```
project/
├── backend/
│   ├── myproject/
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── asgi.py           ← ASGI entry point
│   │   └── urls.py
│   ├── chat/
│   │   ├── __init__.py
│   │   ├── consumers.py      ← WebSocket logic lives here
│   │   └── routing.py        ← WebSocket URL routing
│   ├── requirements.txt
│   └── manage.py
│
└── frontend/
    ├── src/
    │   ├── hooks/
    │   │   └── useWebSocket.js   ← Reusable WebSocket hook
    │   ├── components/
    │   │   └── Chat.jsx          ← Chat UI component
    │   └── App.jsx
    └── package.json
```

---

## Data Models

These are the three Django apps whose models power the WebSocket features in this guide. Understanding the shape of the data makes it much easier to follow what the consumer's DB helpers are doing.

---

### `accounts/models.py` — CustomUser & FriendRequest

```python
# accounts/models.py

import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser


def user_profile_path(instance, filename):
    """Generates a unique filename to avoid collisions in the media folder."""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return f"profile_pictures/{filename}"


class CustomUser(AbstractUser):
    # ── Auth ────────────────────────────────────────────────────
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, blank=True, null=True)

    USERNAME_FIELD = 'email'   # Login with email instead of username
    REQUIRED_FIELDS = ['username']

    # ── Profile ─────────────────────────────────────────────────
    first_name = models.CharField(max_length=50, blank=True, null=True)
    last_name = models.CharField(max_length=50, blank=True, null=True)
    profile_picture = models.ImageField(
        upload_to=user_profile_path,
        blank=True,
        null=True
    )

    # ── Presence ─────────────────────────────────────────────────
    # Tracked via WebSocket connect/disconnect.
    # Updated with .update() (not .save()) to avoid race conditions.
    is_online = models.BooleanField(default=False)

    # ── Social graph ─────────────────────────────────────────────
    # Symmetrical ManyToMany — adding A→B also adds B→A automatically.
    friends = models.ManyToManyField('self', blank=True)

    def __str__(self):
        return self.email


class FriendRequest(models.Model):
    STATUS_CHOICES = (
        ("pending",  "Pending"),   # Sent, awaiting response
        ("accepted", "Accepted"),  # Accepted — friendship created
        ("declined", "Declined"),  # Declined — can be re-sent later
    )

    sender = models.ForeignKey(
        CustomUser,
        related_name="sent_friend_requests",
        on_delete=models.CASCADE
    )
    receiver = models.ForeignKey(
        CustomUser,
        related_name="received_friend_requests",
        on_delete=models.CASCADE
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="pending"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Prevents duplicate requests between the same pair of users.
        # get_or_create relies on this constraint.
        unique_together = ("sender", "receiver")
```

**Key design decisions to keep in mind:**

- `USERNAME_FIELD = 'email'` — JWT tokens use `email` as the identity field, not `username`. Your token auth middleware must look up users by `email` or by `user_id` from the token payload.
- `is_online` is updated using `.update()` on the queryset, not `.save()` on the instance. This avoids overwriting other fields if two connections modify the user simultaneously.
- `friends = ManyToManyField('self')` is **symmetrical** by default. When you call `user_a.friends.add(user_b)`, Django automatically adds `user_b.friends.add(user_a)` — you do not need to do both manually.
- `unique_together = ("sender", "receiver")` on `FriendRequest` means you can safely use `get_or_create(sender=..., receiver=...)` without fear of duplicate rows.

---

### `chats/models.py` — Conversation & Message

```python
# chats/models.py

from django.db import models
from accounts.models import CustomUser


class Conversation(models.Model):
    CONVERSATION_TYPES = (
        ("private", "Private"),  # Exactly 2 participants — created on friend accept
        ("group",   "Group"),    # 3+ participants — created manually by a user
    )

    # Used only for group conversations. Empty string for private chats.
    name = models.CharField(max_length=255, blank=True)

    type = models.CharField(
        max_length=10,
        choices=CONVERSATION_TYPES,
        default="private"
    )

    # All users who can send and receive messages in this conversation.
    participants = models.ManyToManyField(
        CustomUser,
        related_name='conversations'
    )

    # Only set for group conversations — tracks who created the group.
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="group_creator"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Conversation {self.id}"


class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    # False by default. Flipped to True when the recipient calls mark_read.
    is_read = models.BooleanField(default=False)

    class Meta:
        # Messages are always returned oldest-first.
        ordering = ["timestamp"]
```

**Key design decisions to keep in mind:**

- A private `Conversation` is created when a friend request is accepted — not when messaging begins. Check for an existing conversation first with `.filter(...).first()` before creating, to avoid duplicates.
- `participants` is a `ManyToManyField`. To check if a user belongs to a conversation, use `Conversation.objects.get(id=..., participants=self.user)` — this is both a lookup and an ownership check in one query.
- `Message.is_read` is updated in bulk using `.update(is_read=True)` for all unread messages in a conversation, excluding those sent by the reading user (`.exclude(sender=self.user)`).
- `ordering = ["timestamp"]` on `Message` means you can always do `conversation.messages.all()` and get chronological order without an extra `.order_by()`.

**How to look up a private conversation between two users:**

```python
# Finds the private conversation shared by sender and receiver, if it exists.
# Using two chained .filter() calls is the correct way to do AND on M2M fields.
conversation = (
    Conversation.objects
    .filter(type="private", participants=sender)
    .filter(participants=receiver)
    .first()
)
```

> Using a single `.filter(participants=sender, participants=receiver)` does **not** work — Django cannot use the same field name twice in one filter call. Chain two separate `.filter()` calls instead.

---

### `notifications/models.py` — Notification

```python
# notifications/models.py

from django.db import models
from accounts.models import CustomUser


class Notification(models.Model):
    # The user who triggered the notification (e.g. the friend request sender).
    sender = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='sender_notifications'
    )

    # The user who should see this notification in their feed.
    recipient = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='recipient_notifications'
    )

    # Identifies what kind of notification this is.
    # Common values: "friend_request", "friend_request_accepted",
    #                "friend_request_declined", "create_group_chat"
    notification_type = models.CharField(max_length=50)

    # Human-readable description shown in the UI.
    text = models.TextField()

    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Most recent notifications appear first.
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.recipient.username} - {self.notification_type} - {self.id}"
```

**Key design decisions to keep in mind:**

- `notification_type` is a plain string field. Keep a consistent set of values across your codebase — it's what the React frontend uses to decide how to render each notification (e.g. show "Accept / Decline" buttons only for `"friend_request"` type).
- `is_read` is flipped via the `mark_read_notification` consumer event. Marking it read via WebSocket (rather than a REST endpoint) means the UI updates in real time without a page reload.
- `ordering = ['-created_at']` means the newest notification is always at index 0 when you query `user.recipient_notifications.all()`.

---

### How the Models Relate

```
CustomUser ──────────────────────────────────────────────────────────
    │                                                               │
    │ friends (M2M self)         sent_friend_requests (FK)         │
    │                            received_friend_requests (FK)     │
    │                                    │                         │
    │                               FriendRequest                  │
    │                              (pending→accepted→declined)      │
    │                                    │                         │
    │                      on accept: create Conversation          │
    │                                    │                         │
    ├──── conversations (M2M) ───── Conversation ─── messages ──── Message
    │                               (private/group)    (FK)        (sender FK)
    │
    ├──── sender_notifications ─── Notification ─── recipient_notifications
    │                               (type, text,
    └───────────────────────────────is_read)
```

**The full lifecycle of a friend request:**

```
1. User A sends friend request
   → FriendRequest(sender=A, receiver=B, status="pending") created
   → Notification(recipient=B, type="friend_request") created
   → Both sent to B via WebSocket: group_send("user_B", ...)

2. User B accepts
   → FriendRequest.status = "accepted"
   → A.friends.add(B)  /  B.friends.add(A)  (both sides — M2M symmetrical)
   → Conversation(type="private") created with A and B as participants
   → Notification(recipient=A, type="friend_request_accepted") created
   → Conversation sent to both A and B via WebSocket
   → Notification sent only to A via WebSocket

3. User B declines
   → FriendRequest.status = "declined"
   → Notification(recipient=A, type="friend_request_declined") created
   → Notification sent to A via WebSocket
   → A can re-send the request later (status check allows this)
```

---

## Backend Setup — Django

### 1. Install Dependencies

```bash
pip install django djangorestframework channels channels-redis daphne
```

Save to `requirements.txt`:

```txt
django>=4.2
djangorestframework>=3.14
channels>=4.0
channels-redis>=4.1
daphne>=4.0
```

---

### 2. Configure Django Settings

Open `myproject/settings.py` and make the following changes:

```python
# settings.py

INSTALLED_APPS = [
    # Django defaults
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party
    "channels",       # ← Add this
    "rest_framework", # ← Add this

    # Your apps
    "chat",           # ← Your app
]

# Switch Django to ASGI mode
ASGI_APPLICATION = "myproject.asgi.application"

# ─── Channel Layer ──────────────────────────────────────────────
# For development, use the in-memory layer (no Redis needed)
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

# For production, switch to Redis (see the Redis section below)
```

---

### 3. Set Up ASGI

Replace the default `myproject/asgi.py` with the following:

```python
# myproject/asgi.py

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import chat.routing  # ← Import your app's WebSocket routes

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "myproject.settings")

application = ProtocolTypeRouter({
    # Standard HTTP requests are handled by Django as usual
    "http": get_asgi_application(),

    # WebSocket requests are routed through channels
    "websocket": AuthMiddlewareStack(
        URLRouter(
            chat.routing.websocket_urlpatterns
        )
    ),
})
```

---

### 4. Create a Consumer

A **Consumer** is the WebSocket equivalent of a Django view. Create `chat/consumers.py`:

```python
# chat/consumers.py

import json
from channels.generic.websocket import AsyncWebsocketConsumer


class ChatConsumer(AsyncWebsocketConsumer):
    """
    Handles a single WebSocket connection for a chat room.
    Each room is identified by a `room_name` from the URL.
    """

    async def connect(self):
        """Called when a client opens a WebSocket connection."""
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_name}"

        # Join the channel group for this room
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )

        # Accept the WebSocket connection
        await self.accept()

    async def disconnect(self, close_code):
        """Called when the client disconnects."""
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name,
        )

    async def receive(self, text_data):
        """Called when the server receives a message from the client."""
        data = json.loads(text_data)
        message = data.get("message", "")
        username = data.get("username", "Anonymous")

        # Broadcast the message to all clients in the room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",   # Maps to the method below
                "message": message,
                "username": username,
            },
        )

    async def chat_message(self, event):
        """
        Handler for the "chat_message" group event.
        Sends the message down to the WebSocket client.
        """
        await self.send(text_data=json.dumps({
            "message": event["message"],
            "username": event["username"],
        }))
```

> **Note:** The `type` key in `group_send` maps directly to a method name on the consumer. `chat_message` maps to `async def chat_message(self, event)`. Underscores replace dots in the method name.

---

### 5. Configure WebSocket Routing

Create `chat/routing.py`:

```python
# chat/routing.py

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # ws://localhost:8000/ws/chat/<room_name>/
    re_path(r"^ws/chat/(?P<room_name>\w+)/$", consumers.ChatConsumer.as_asgi()),
]
```

---

### 6. Run with Daphne or Uvicorn

**Option A — Daphne (recommended for Django Channels):**

```bash
daphne -b 0.0.0.0 -p 8000 myproject.asgi:application
```

**Option B — Uvicorn:**

```bash
pip install uvicorn
uvicorn myproject.asgi:application --host 0.0.0.0 --port 8000 --reload
```

> **Do not use `python manage.py runserver`** for WebSocket connections in production — it runs on WSGI and does not support WebSockets. You can use it in development with `DJANGO_SETTINGS_MODULE` set if `channels` is installed, but prefer Daphne/Uvicorn.

---

## Frontend Setup — React

### 1. Build the WebSocket Hook

Create a reusable hook at `src/hooks/useWebSocket.js`:

```javascript
// src/hooks/useWebSocket.js

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * useWebSocket
 *
 * A reusable hook that manages a WebSocket connection lifecycle.
 *
 * @param {string} url - The WebSocket server URL (e.g., "ws://localhost:8000/ws/chat/general/")
 * @returns {{ messages, sendMessage, connectionStatus }}
 */
export function useWebSocket(url) {
  const socketRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");

  useEffect(() => {
    // Open the WebSocket connection
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnectionStatus("Connected");
      console.log("WebSocket connected:", url);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, data]);
    };

    socket.onerror = (error) => {
      setConnectionStatus("Error");
      console.error("WebSocket error:", error);
    };

    socket.onclose = (event) => {
      setConnectionStatus("Disconnected");
      console.log("WebSocket closed. Code:", event.code);
    };

    // Cleanup: close the socket when the component unmounts
    return () => {
      socket.close();
    };
  }, [url]); // Re-run if the URL changes

  const sendMessage = useCallback((payload) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    } else {
      console.warn("WebSocket is not open. Message not sent.");
    }
  }, []);

  return { messages, sendMessage, connectionStatus };
}
```

---

### 2. Build the Chat Component

Create `src/components/Chat.jsx`:

```jsx
// src/components/Chat.jsx

import React, { useState, useRef, useEffect } from "react";
import { useWebSocket } from "../hooks/useWebSocket";

const WS_URL = "ws://localhost:8000/ws/chat/general/";

export default function Chat({ username = "Guest" }) {
  const { messages, sendMessage, connectionStatus } = useWebSocket(WS_URL);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    sendMessage({ message: trimmed, username });
    setInputValue("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>💬 General Chat</h2>
        <span style={styles.status(connectionStatus)}>{connectionStatus}</span>
      </div>

      {/* Message List */}
      <div style={styles.messageList}>
        {messages.length === 0 && (
          <p style={styles.placeholder}>No messages yet. Say hello!</p>
        )}
        {messages.map((msg, index) => (
          <div key={index} style={styles.message}>
            <strong>{msg.username}: </strong>
            <span>{msg.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={styles.inputRow}>
        <input
          style={styles.input}
          type="text"
          placeholder="Type a message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          style={styles.button}
          onClick={handleSend}
          disabled={connectionStatus !== "Connected"}
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ─── Inline Styles ───────────────────────────────────────────────────────────

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    width: "480px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    overflow: "hidden",
    fontFamily: "sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    background: "#1a73e8",
    color: "#fff",
  },
  status: (status) => ({
    fontSize: "12px",
    padding: "3px 8px",
    borderRadius: "12px",
    background:
      status === "Connected"
        ? "#34a853"
        : status === "Error"
        ? "#ea4335"
        : "#fbbc04",
    color: "#fff",
  }),
  messageList: {
    flex: 1,
    height: "360px",
    overflowY: "auto",
    padding: "12px 16px",
    background: "#f9f9f9",
  },
  placeholder: {
    color: "#aaa",
    textAlign: "center",
    marginTop: "40px",
  },
  message: {
    marginBottom: "8px",
    padding: "8px 12px",
    background: "#fff",
    borderRadius: "6px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  inputRow: {
    display: "flex",
    padding: "10px 12px",
    borderTop: "1px solid #eee",
    background: "#fff",
    gap: "8px",
  },
  input: {
    flex: 1,
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "14px",
    outline: "none",
  },
  button: {
    padding: "8px 20px",
    background: "#1a73e8",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
  },
};
```

---

## Database Operations Inside Consumers

This is the most critical concept when building real-world consumers. Django's ORM is **synchronous** — it uses blocking I/O. But `AsyncWebsocketConsumer` runs in an **async** event loop. Calling the ORM directly inside an `async` method will either crash or block the entire event loop, freezing all connected clients.

The solution is `database_sync_to_async` from `channels.db`.

---

### Why You Need `database_sync_to_async`

```
Async Event Loop
┌─────────────────────────────────────────────────────────────┐
│  consumer.receive()  ←── async, non-blocking                │
│                                                             │
│  ❌ Message.objects.create(...)  ←── BLOCKS the loop        │
│     (freezes ALL other connections until query finishes)    │
│                                                             │
│  ✅ await self.save_message()   ←── runs ORM in a           │
│     @database_sync_to_async         separate thread pool,  │
│     def save_message(self): ...     releases the loop      │
└─────────────────────────────────────────────────────────────┘
```

**Rule:** Any code that touches the Django ORM, filesystem, or any blocking I/O must be wrapped in `@database_sync_to_async` and `await`-ed from your async methods.

---

### The Core Pattern

```python
# chat/consumers.py

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async  # ← the key import


class ChatConsumer(AsyncWebsocketConsumer):

    # ── Async layer: handles WebSocket events ────────────────────

    async def receive(self, text_data):
        data = json.loads(text_data)
        content = data.get("content", "").strip()
        conversation_id = data.get("conversation_id")

        # ✅ Await the DB helper — never call ORM directly here
        result = await self.save_message(conversation_id, content)
        if not result:
            return

        message, participant_ids = result

        # Broadcast to every participant's personal group
        for pid in participant_ids:
            await self.channel_layer.group_send(
                f"user_{pid}",
                {"type": "chat_message", "message": message}
            )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "type": "chat_message",
            "message": event["message"],
        }))

    # ── Sync layer: all ORM work lives here ──────────────────────

    @database_sync_to_async
    def save_message(self, conversation_id, content):
        """
        Runs in a thread pool. Safe to use the ORM here.
        Returns serialized message + participant IDs, or None on failure.
        """
        from .models import Conversation, Message
        from .serializers import MessageSerializer

        try:
            conversation = Conversation.objects.get(
                id=conversation_id,
                participants=self.user  # ownership check
            )
            message = Message.objects.create(
                conversation=conversation,
                sender=self.user,
                content=content,
            )
            participant_ids = list(
                conversation.participants.values_list("id", flat=True)
            )
            return MessageSerializer(message).data, participant_ids

        except Conversation.DoesNotExist:
            return None
```

**Key takeaways from this pattern:**

- `@database_sync_to_async` wraps a regular `def` method — the method itself is synchronous.
- You `await` the wrapped method from your `async` methods.
- Return serialized data (plain dicts/lists) from DB helpers, not model instances — model instances are lazy and can trigger additional DB queries outside the thread pool.
- Always do ownership/permission checks inside the DB helper (e.g. `participants=self.user`).

---

### Writing DB Helper Methods

Each DB helper should do **one focused job**. Here are the common patterns you will encounter:

#### Create a record and return serialized data

```python
@database_sync_to_async
def create_message(self, conversation_id, content):
    from .models import Conversation, Message
    from .serializers import MessageSerializer

    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            participants=self.user
        )
        message = Message.objects.create(
            conversation=conversation,
            sender=self.user,
            content=content,
        )
        # ✅ Serialize inside the helper — not outside
        return MessageSerializer(message).data
    except Conversation.DoesNotExist:
        return None
```

#### Bulk update records

```python
@database_sync_to_async
def mark_messages_read(self, conversation_id):
    from .models import Conversation, Message

    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            participants=self.user  # ownership check
        )
        # ✅ Use .update() for bulk changes — more efficient than looping
        Message.objects.filter(
            conversation=conversation,
            is_read=False,
        ).exclude(sender=self.user).update(is_read=True)

    except Conversation.DoesNotExist:
        return
```

#### Create related records atomically

When you need multiple DB writes to succeed or fail together, use `transaction.atomic()`:

```python
@database_sync_to_async
def accept_friend_request(self, friend_request_id):
    from django.db import transaction
    from .models import FriendRequest, Conversation
    from notifications.models import Notification
    from .serializers import ConversationSerializer
    from notifications.serializers import NotificationSerializer

    try:
        with transaction.atomic():
            friend_request = FriendRequest.objects.get(
                id=friend_request_id,
                receiver=self.user  # only the recipient can accept
            )

            if friend_request.status == "accepted":
                return None  # already handled — avoid duplicate work

            sender = friend_request.sender
            receiver = friend_request.receiver

            # 1. Update the request status
            friend_request.status = "accepted"
            friend_request.save()

            # 2. Create mutual friendship
            receiver.friends.add(sender)
            sender.friends.add(receiver)

            # 3. Create the notification
            notification = Notification.objects.create(
                sender=self.user,
                recipient=sender,
                notification_type="friend_request_accepted",
                text=f"{self.user.username} accepted your friend request"
            )

            # 4. Create or reuse the private conversation
            conversation = (
                Conversation.objects
                .filter(type="private", participants=sender)
                .filter(participants=receiver)
                .first()
            )
            if not conversation:
                conversation = Conversation.objects.create(type="private")
                conversation.participants.add(sender, receiver)

            # ✅ Return plain serialized data — not model instances
            return {
                "notification": NotificationSerializer(notification).data,
                "conversation": ConversationSerializer(conversation).data,
                "sender_id": sender.id,
            }

    except FriendRequest.DoesNotExist:
        return None
```

> **Why `transaction.atomic()`?** If `notification` creation succeeds but `conversation` creation fails, you would have a broken state without the transaction. With `atomic()`, either all writes commit or none do.

#### get_or_create safely

```python
@database_sync_to_async
def send_friend_request(self, receiver_id):
    from .models import FriendRequest
    from .serializers import FriendRequestSerializer

    try:
        receiver = self.user.__class__.objects.get(id=receiver_id)

        friend_request, created = FriendRequest.objects.get_or_create(
            sender=self.user,
            receiver=receiver,
            defaults={"status": "pending"}
        )

        if not created and friend_request.status != "declined":
            return None  # Already pending — do nothing

        if not created:
            # Re-send a previously declined request
            friend_request.status = "pending"
            friend_request.save()

        return FriendRequestSerializer(friend_request).data

    except self.user.__class__.DoesNotExist:
        return None
```

---

### Calling Helpers from `receive()`

The `receive()` method acts as the **event dispatcher**. It reads the `type` field from the incoming message and routes to the correct DB helper, then broadcasts the result.

```python
async def receive(self, text_data):
    data = json.loads(text_data)
    event_type = data.get("type")

    # ── Routing by event type ─────────────────────────────────

    if event_type == "send_message":
        content = data.get("content", "").strip()
        conversation_id = data.get("conversation_id")
        if not content:
            return

        result = await self.save_message(conversation_id, content)
        if not result:
            return

        message, participant_ids = result
        for pid in participant_ids:
            await self.channel_layer.group_send(
                f"user_{pid}",
                {"type": "chat_message", "message": message}
            )

    elif event_type == "mark_read":
        try:
            conversation_id = int(data.get("conversation_id"))
        except (TypeError, ValueError):
            return
        await self.mark_messages_read(conversation_id)

    elif event_type == "accept_friend_request":
        try:
            friend_request_id = int(data.get("friend_request_id"))
        except (TypeError, ValueError):
            return

        result = await self.accept_friend_request(friend_request_id)
        if not result:
            return

        # Notify the original sender
        await self.channel_layer.group_send(
            f"user_{result['sender_id']}",
            {
                "type": "friend_request_accepted_event",
                "notification": result["notification"],
                "conversation": result["conversation"],
            }
        )

    elif event_type == "pong":
        # Heartbeat reply from client
        self._pong_received = True

    # Always validate event_type — ignore unknown types silently
```

---

### Handling Multiple Event Types

As your app grows, the `receive()` method can become large. A clean way to organize it is with a **dispatch table**:

```python
class ChatConsumer(AsyncWebsocketConsumer):

    # Maps incoming event type strings to handler methods
    HANDLERS = {
        "send_message":           "handle_send_message",
        "mark_read":              "handle_mark_read",
        "typing":                 "handle_typing",
        "send_friend_request":    "handle_friend_request",
        "accept_friend_request":  "handle_accept_friend_request",
        "decline_friend_request": "handle_decline_friend_request",
        "pong":                   "handle_pong",
    }

    async def receive(self, text_data):
        data = json.loads(text_data)
        event_type = data.get("type")

        handler_name = self.HANDLERS.get(event_type)
        if not handler_name:
            return  # Unknown event — ignore

        handler = getattr(self, handler_name)
        await handler(data)

    async def handle_send_message(self, data):
        content = data.get("content", "").strip()
        conversation_id = data.get("conversation_id")
        if not content:
            return

        result = await self.save_message(conversation_id, content)
        if not result:
            return

        message, participant_ids = result
        for pid in participant_ids:
            await self.channel_layer.group_send(
                f"user_{pid}",
                {"type": "chat_message", "message": message}
            )

    async def handle_mark_read(self, data):
        try:
            conversation_id = int(data["conversation_id"])
        except (KeyError, TypeError, ValueError):
            return
        await self.mark_messages_read(conversation_id)

    async def handle_pong(self, data):
        self._pong_received = True

    # ... other handlers
```

---

### User-Level Groups vs Room Groups

The guide's introductory example used **room-level groups** (all users in a room share one group). Real apps often need **user-level groups** so you can target messages to a specific person regardless of what room they are in.

```
Room Groups (simple chat):            User Groups (real apps):
─────────────────────────             ───────────────────────────
 group: "chat_general"                 group: "user_42"
   ├── Alice's channel                  └── Alice's channel (wherever she is)
   ├── Bob's channel
   └── Carol's channel                 group: "user_99"
                                        └── Bob's channel
```

**When to use which:**

| Pattern | Use when |
|---|---|
| Room group | All members of a room need the same broadcast (e.g. a public chat message) |
| User group | You need to target a specific person (e.g. a notification, a friend request) |

**Setting up user-level groups in `connect()`:**

```python
async def connect(self):
    self.user = self.scope["user"]

    if self.user.is_anonymous:
        await self.close()
        return

    # ✅ Each user joins their own personal group on connect
    self.user_group = f"user_{self.user.id}"
    await self.channel_layer.group_add(self.user_group, self.channel_name)

    await self.accept()
    await self.set_online_status(True)

async def disconnect(self, close_code):
    if hasattr(self, "user_group"):
        await self.set_online_status(False)
        await self.channel_layer.group_discard(self.user_group, self.channel_name)
```

**Sending to a specific user from anywhere:**

```python
# Target user 42 — even from a different consumer or a Celery task
await channel_layer.group_send(
    "user_42",
    {
        "type": "friend_request_event",
        "friend_request": serialized_data,
    }
)
```

---

### Heartbeat — Detecting Dead Connections

TCP connections can silently die (NAT timeout, phone switching from WiFi to mobile data, etc.). A heartbeat loop detects these ghost connections and closes them.

```python
import asyncio

class ChatConsumer(AsyncWebsocketConsumer):
    HEARTBEAT_INTERVAL = 30  # seconds between pings
    PONG_TIMEOUT = 10        # seconds to wait for pong before closing

    async def connect(self):
        # ... existing connect logic ...
        self._pong_received = False
        self._heartbeat_task = asyncio.ensure_future(self._heartbeat())

    async def disconnect(self, close_code):
        # ✅ Always cancel the task to avoid a dangling coroutine
        if hasattr(self, "_heartbeat_task"):
            self._heartbeat_task.cancel()
        # ... rest of disconnect ...

    async def _heartbeat(self):
        """
        Every 30s: send ping → wait 10s for pong → close if no reply.
        Client must reply with { "type": "pong" } when it receives a ping.
        """
        while True:
            await asyncio.sleep(self.HEARTBEAT_INTERVAL)

            self._pong_received = False
            await self.send(text_data=json.dumps({"type": "ping"}))

            await asyncio.sleep(self.PONG_TIMEOUT)

            if not self._pong_received:
                await self.close()
                break  # Exit the loop after closing

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data.get("type") == "pong":
            self._pong_received = True
            return
        # ... rest of receive ...
```

**React side — respond to pings:**

```javascript
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "ping") {
    // Acknowledge the heartbeat immediately
    socket.send(JSON.stringify({ type: "pong" }));
    return;
  }

  // Handle all other message types normally
  dispatch(data);
};
```

---

### Common Mistakes

| Mistake | Problem | Fix |
|---|---|---|
| Calling `Model.objects.create()` directly inside `async def receive()` | Blocks the event loop, can crash or freeze all connections | Wrap in `@database_sync_to_async` |
| Returning a model instance from a DB helper | Accessing lazy fields outside the thread pool raises `SynchronousOnlyOperation` | Return serialized dicts instead (`ModelSerializer(instance).data`) |
| Forgetting `await` on a DB helper | The coroutine is created but never executed — DB write silently never happens | Always `await self.my_db_helper()` |
| No ownership check in DB helpers | Any authenticated user can read/write any record | Always filter with `participants=self.user` or equivalent |
| No `transaction.atomic()` on multi-step writes | Partial writes leave the database in an inconsistent state | Wrap related writes in `with transaction.atomic()` |
| Not cancelling the heartbeat task on disconnect | Coroutine keeps running after the socket closes, leaking memory | `self._heartbeat_task.cancel()` in `disconnect()` |
| Importing models at the module top level inside `consumers.py` | Can cause circular imports in complex projects | Import inside the DB helper method body |

---

## Channel Layers — Redis (Production)

The `InMemoryChannelLayer` only works within a **single server process**. For production (multiple workers, horizontal scaling), switch to **Redis**.

### Install Redis and the adapter

```bash
pip install channels-redis
```

Make sure Redis is running:

```bash
# macOS
brew install redis && brew services start redis

# Ubuntu
sudo apt install redis-server && sudo systemctl start redis
```

### Update `settings.py`

```python
# settings.py

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("127.0.0.1", 6379)],
        },
    }
}
```

With Redis, messages sent by one consumer (on worker A) can be received by a different consumer (on worker B) because Redis acts as the shared message broker.

---

## Authentication Over WebSocket

To identify the logged-in user during a WebSocket connection, use token authentication in the URL query string.

### Backend — Token Auth Middleware

Create `chat/middleware.py`:

```python
# chat/middleware.py

from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_key):
    try:
        token = AccessToken(token_key)
        return User.objects.get(id=token["user_id"])
    except Exception:
        return AnonymousUser()


class TokenAuthMiddleware:
    """
    Reads a JWT from the WebSocket URL query string:
    ws://localhost:8000/ws/chat/general/?token=<access_token>
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        query_string = parse_qs(scope["query_string"].decode())
        token = query_string.get("token", [None])[0]

        scope["user"] = (
            await get_user_from_token(token) if token else AnonymousUser()
        )

        return await self.inner(scope, receive, send)
```

### Update `asgi.py`

```python
# myproject/asgi.py

from chat.middleware import TokenAuthMiddleware

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": TokenAuthMiddleware(
        URLRouter(chat.routing.websocket_urlpatterns)
    ),
})
```

### Access the user in a consumer

```python
async def connect(self):
    user = self.scope["user"]
    if user.is_anonymous:
        await self.close()  # Reject unauthenticated connections
        return

    self.username = user.username
    # ... rest of connect logic
```

### Frontend — Pass token in the URL

```javascript
// src/hooks/useWebSocket.js

const token = localStorage.getItem("access_token");
const url = `ws://localhost:8000/ws/chat/general/?token=${token}`;

const { messages, sendMessage } = useWebSocket(url);
```

---

## Common Errors & Fixes

| Error | Likely Cause | Fix |
|---|---|---|
| `WebSocket connection failed` | Backend not running on ASGI | Use Daphne or Uvicorn, not `runserver` alone |
| `CORS / 403 error` | CORS headers not set | Install `django-cors-headers` and add to `MIDDLEWARE` |
| `Connection refused` | Redis not running | Start Redis: `redis-server` |
| `Group send has no effect` | Still using `InMemoryChannelLayer` in multi-worker setup | Switch to `RedisChannelLayer` |
| `Consumer never receives messages` | `type` key mismatch in `group_send` | Ensure `type` maps exactly to a method name (use underscores) |
| `React WebSocket reconnects in loop` | `url` changes on every render | Pass a stable string or memoize the URL |
| `Message received twice` | Consumer added to group multiple times | Ensure `group_add` is only called once per connection |

---

## Full Flow Summary

```
React Client                     Django Channels Server
─────────────                    ──────────────────────
  │                                        │
  │──── WebSocket Handshake (HTTP Upgrade) ──────────────▶│
  │                                        │
  │                               consumer.connect()
  │                               group_add(room_group)
  │◀─────────────── connection accepted ───│
  │                                        │
  │──── send({ message: "Hello" }) ───────▶│
  │                                        │
  │                              consumer.receive()
  │                              channel_layer.group_send()
  │                                        │
  │                              (broadcast to all in group)
  │                                        │
  │◀──── { message: "Hello", username } ───│ (all group members receive this)
  │                                        │
  │──── WebSocket Close ──────────────────▶│
  │                                        │
  │                              consumer.disconnect()
  │                              group_discard(room_group)
```

---

*Built with Django Channels 4.x · React 18 · Redis 7*
