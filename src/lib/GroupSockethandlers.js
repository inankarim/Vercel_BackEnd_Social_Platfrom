// src/lib/GroupSockethandlers.js

// We keep a reference to io so controllers (HTTP side) can emit events
let ioRef = null;

/**
 * Attach all group-related socket listeners for a connected socket.
 * Also binds the io instance on first call so helpers work from controllers.
 *
 * @param {import("socket.io").Socket} socket
 * @param {import("socket.io").Server} io
 * @param {Record<string,string>} userSocketMap - { [userId]: socketId }
 */
export function handleGroupSocketEvents(socket, io, userSocketMap) {
  // Bind the io instance once so helpers can emit from controllers
  if (!ioRef) {
    ioRef = io;
    console.log("IO reference bound for group socket helpers");
  }

  /**
   * Client joins a group room to receive group events
   * Frontend call: socket.emit("joinGroup", groupId)
   */
  socket.on("joinGroup", (groupId) => {
    console.log(`Socket ${socket.id} attempting to join group: ${groupId}`);
    
    if (!groupId) {
      console.log("No groupId provided for joinGroup");
      socket.emit("error", { message: "Group ID is required" });
      return;
    }

    try {
      const roomName = `group_${groupId}`;
      socket.join(roomName);
      console.log(`Socket ${socket.id} joined room: ${roomName}`);
      
      // Send acknowledgment
      socket.emit("joinedGroup", { groupId, roomName });
    } catch (error) {
      console.error("Error joining group:", error);
      socket.emit("error", { message: "Failed to join group" });
    }
  });

  /**
   * Client leaves a group room
   * Frontend call: socket.emit("leaveGroup", groupId)
   */
  socket.on("leaveGroup", (groupId) => {
    console.log(`Socket ${socket.id} attempting to leave group: ${groupId}`);
    
    if (!groupId) {
      console.log("No groupId provided for leaveGroup");
      return;
    }

    try {
      const roomName = `group_${groupId}`;
      socket.leave(roomName);
      console.log(`Socket ${socket.id} left room: ${roomName}`);
      
      // Send acknowledgment
      socket.emit("leftGroup", { groupId, roomName });
    } catch (error) {
      console.error("Error leaving group:", error);
      socket.emit("error", { message: "Failed to leave group" });
    }
  });

  /**
   * Handle real-time group message sending
   * Frontend call: socket.emit("sendGroupMessage", { groupId, text, image })
   */
  socket.on("sendGroupMessage", (payload = {}) => {
    const { groupId, text, image } = payload || {};
    console.log(`Socket ${socket.id} sending group message:`, { groupId, text: text?.substring(0, 50), hasImage: !!image });
    
    if (!groupId || (!text && !image)) {
      console.log("Invalid group message payload");
      socket.emit("error", { message: "Group ID and message content are required" });
      return;
    }

    if (!socket.userId) {
      console.log("No userId found on socket for group message");
      socket.emit("error", { message: "User not authenticated" });
      return;
    }

    try {
      // Create message object for real-time broadcast
      const messageData = {
        _id: `temp_${Date.now()}_${socket.id}`, // Temporary ID for optimistic updates
        groupId,
        senderId: socket.userId,
        text: text || "",
        image: image || null,
        createdAt: new Date().toISOString(),
        optimistic: true, // Mark as optimistic for UI handling
      };

      // Broadcast to all users in the group room
      const roomName = `group_${groupId}`;
      io.to(roomName).emit("newGroupMessage", messageData);
      console.log(`Broadcast message to room ${roomName}:`, messageData._id);

      // Send acknowledgment to sender
      socket.emit("messageSent", { 
        tempId: messageData._id, 
        groupId,
        success: true 
      });

    } catch (error) {
      console.error("Error sending group message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  /**
   * Handle typing indicators for groups
   */
  socket.on("groupTyping", ({ groupId, isTyping }) => {
    if (!groupId || !socket.userId) return;
    
    const roomName = `group_${groupId}`;
    socket.to(roomName).emit("userTyping", {
      groupId,
      userId: socket.userId,
      isTyping
    });
  });

  console.log("All group socket events attached successfully");
}

/**
 * Helpers your HTTP controllers can import via ../lib/socket.js
 * socket.js re-exports these so controllers can: emitToGroup(...), notifyGroupMembers(...)
 */
export const groupSocketHelpers = {
  /**
   * Emit an event to all sockets in a specific group room.
   * @param {string} groupId
   * @param {string} event
   * @param {any} payload
   */
  emitToGroup(groupId, event, payload) {
    if (!ioRef || !groupId) {
      console.log("Cannot emit to group - missing ioRef or groupId:", { hasIo: !!ioRef, groupId });
      return false;
    }
    
    const roomName = `group_${groupId}`;
    console.log(`Emitting ${event} to room ${roomName}`);
    ioRef.to(roomName).emit(event, payload);
    return true;
  },

  /**
   * Emit an event to a single user (personal room).
   * @param {string} userId
   * @param {string} event
   * @param {any} payload
   */
  emitToUser(userId, event, payload) {
    if (!ioRef || !userId) {
      console.log("Cannot emit to user - missing ioRef or userId:", { hasIo: !!ioRef, userId });
      return false;
    }
    
    const roomName = `user_${userId}`;
    console.log(`Emitting ${event} to user room ${roomName}`);
    ioRef.to(roomName).emit(event, payload);
    return true;
  },

  /**
   * Emit an event to multiple users (array of memberIds).
   * Useful for notifying all members after group creation or member add.
   * @param {string[]} memberIds
   * @param {string} event
   * @param {any} payload
   */
  notifyGroupMembers(memberIds = [], event, payload) {
    if (!ioRef || !Array.isArray(memberIds)) {
      console.log("Cannot notify group members - missing ioRef or invalid memberIds:", { 
        hasIo: !!ioRef, 
        isArray: Array.isArray(memberIds),
        memberIds 
      });
      return false;
    }
    
    let notifiedCount = 0;
    memberIds.forEach((id) => {
      if (id) {
        const roomName = `user_${id}`;
        ioRef.to(roomName).emit(event, payload);
        notifiedCount++;
      }
    });
    
    console.log(`Notified ${notifiedCount} group members with event ${event}`);
    return notifiedCount;
  },

  /**
   * Get IO reference for direct access if needed
   */
  getIO() {
    return ioRef;
  },

  /**
   * Check if IO is initialized
   */
  isIOReady() {
    return !!ioRef;
  }
};