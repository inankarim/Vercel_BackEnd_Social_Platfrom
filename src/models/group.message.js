import mongoose from "mongoose";

const groupMessageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model (the sender of the message)
      required: true
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group", // Reference to the Group model (the group the message was sent to)
      required: true
    },
    text: {
      type: String,
      required: false // Text message (optional)
    },
    image: {
      type: String,
      required: false // Optional image URL
    }
  },
  { timestamps: true } // Automatically add createdAt and updatedAt fields
);

const GroupMessage = mongoose.model("GroupMessage", groupMessageSchema);

export default GroupMessage;
