import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String, // Cloudinary URL for comment images
    required: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    required: true
  },
  // For nested comments (replies)
  parentCommentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment",
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  reactionCounts: {
    love: { type: Number, default: 0 },
    like: { type: Number, default: 0 },
    funny: { type: Number, default: 0 },
    horror: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  // Reply count for parent comments
  replyCount: {
    type: Number,
    default: 0
  }
});

// Update updatedAt on save
commentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;