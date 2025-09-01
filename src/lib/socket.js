import { Server } from "socket.io";
import http from "http";
import express from "express";
// 🔧 Fixed: Added .js extension for ES modules
import { handleGroupSocketEvents, groupSocketHelpers } from "./GroupSockethandlers.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { 
    origin: ["http://localhost:5173", "http://localhost:3000"], 
    credentials: true,
    methods: ["GET", "POST"]
  },
});

const userSocketMap = {}; // { userId: socketId }

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  console.log("User ID from handshake:", userId);

  if (userId && userId !== "undefined") {
    userSocketMap[userId] = socket.id;
    socket.userId = userId;
    // Join user's personal room
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined personal room: user_${userId}`);
  }

  // Emit updated online users list
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Handle group events
  try {
    handleGroupSocketEvents(socket, io, userSocketMap);
    console.log("Group socket events attached successfully");
  } catch (error) {
    console.error("Error attaching group socket events:", error);
  }

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    if (userId && userId !== "undefined") {
      delete userSocketMap[userId];
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }
  });

  // Add error handling for socket
  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });
});

// Export helpers
export const { emitToGroup, emitToUser, notifyGroupMembers } = groupSocketHelpers;
export { io, app, server };