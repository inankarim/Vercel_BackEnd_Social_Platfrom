import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },
      // University information
    universityName: {
      type: String,
      default: "",
    },
    // Experience level
    Job: {
      type: String,
      default: ''
    },
    
    // lastActive field
    lastActive: {
      type: Date,
      default: Date.now
    }

  },
  { timestamps: true }
);
// Update lastActive whenever the user logs in or interacts
userSchema.pre('save', function(next) {
  if (this.isModified('lastActive')) {
    this.lastActive = Date.now();
  }
  next();
});

const User = mongoose.model("User", userSchema);

export default User;
