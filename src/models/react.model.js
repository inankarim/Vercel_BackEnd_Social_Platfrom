// models/reaction.model.js
import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  // Can be either post or comment
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  targetType: {
    type: String,
    enum: ['post', 'comment'],
    required: true
  },
  type: {
    type: String,
    enum: ['love', 'like', 'funny', 'horror'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure one user can have only one reaction per target (post/comment)
reactionSchema.index({ userId: 1, targetId: 1, targetType: 1 }, { unique: true });

// Update updatedAt on save
reactionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Reaction = mongoose.model("Reaction", reactionSchema);
export default Reaction;