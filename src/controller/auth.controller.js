import { generateToken } from "../lib/utli.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });

    if (user) return res.status(400).json({ message: "Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    if (newUser) {
      // Generate JWT token
      const token = generateToken(newUser._id, res);
      await newUser.save();

      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic,
        universityName: newUser.universityName,
        Job: newUser.Job,
        createdAt: newUser.createdAt,
        token, // Send the token in the response to be used on the frontend
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      universityName: user.universityName,
      Job: user.Job,
      createdAt: user.createdAt,
      token, // Send the token in the response
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// FIXED UPDATE PROFILE FUNCTION
export const updateProfile = async (req, res) => {
  try {
    const { profilePic, fullName, universityName, Job } = req.body;
    const userId = req.user._id;
    const updateData = {};

    // Handle profile picture upload if provided
    if (profilePic) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(profilePic);
        updateData.profilePic = uploadResponse.secure_url;
      } catch (uploadError) {
        console.log("Cloudinary upload error:", uploadError);
        return res.status(400).json({ message: "Failed to upload image" });
      }
    }

    // Handle other fields
    if (fullName !== undefined) updateData.fullName = fullName;
    if (universityName !== undefined) updateData.universityName = universityName;
    if ( Job!== undefined) updateData.Job = Job;

    // Update user data
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the updated user data with all necessary fields
    res.status(200).json({
      _id: updatedUser._id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      profilePic: updatedUser.profilePic,
      universityName: updatedUser.universityName,
      Job: updatedUser.Job,
      totalPoints: updatedUser.totalPoints,
      badgeCount: updatedUser.badgeCount,
      createdAt: updatedUser.createdAt,
    });
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    const user = req.user;
    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      universityName: user.universityName,
      Job: user.Job,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get active users count in the last 30 minutes

export const getActiveUsersCount = async (req, res) => {
  try {
    const activeUsersCount = await User.countDocuments({
      lastActive: { $gte: new Date(Date.now() - 3600000) } // Active in the last 1 hour
    });
    res.status(200).json({ activeUsersCount });
  } catch (error) {
    console.log("Error in getting active users count:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
