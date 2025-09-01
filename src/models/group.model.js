import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Reference to User model
        required: true
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to User model (group creator)
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }
);

const Group = mongoose.model("Group", groupSchema);

export default Group;
