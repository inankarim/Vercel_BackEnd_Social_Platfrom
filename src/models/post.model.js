// models/post.model.js
import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String, // Cloudinary URL
    required: false
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // Reaction counts for quick access
  reactionCounts: {
    love: { type: Number, default: 0 },
    like: { type: Number, default: 0 },
    funny: { type: Number, default: 0 },
    horror: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  // Comment count for quick access
  commentCount: {
    type: Number,
    default: 0
  }
});

// Update updatedAt on save
postSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Post = mongoose.model("Post", postSchema);
export default Post;