// controllers/post.controller.js
import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import Reaction from "../models/react.model.js";
import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";
import mongoose from "mongoose";

// ============ POST CONTROLLERS ============
const USER_PUBLIC_FIELDS = "fullName profilePic email Job universityName";
export const createPost = async (req, res) => {
  try {
    const { text, image } = req.body;
    const senderId = req.user._id;

    if (!text && !image) {
      return res.status(400).json({ error: "Post must contain either text or image" });
    }

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newPost = new Post({
      text,
      senderId,
      image: imageUrl,
    });

    await newPost.save();

    const populatedPost = await Post.findById(newPost._id)
      .populate("senderId", USER_PUBLIC_FIELDS)
      .lean();

    res.status(201).json(populatedPost);
  } catch (error) {
    console.error("Error in createPost controller: ", error.message);
    res.status(500).json({ error: "Internal server error12" });
  }
};

export const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const currentUserId = req.user._id;

    const posts = await Post.find()
      .populate("senderId", USER_PUBLIC_FIELDS)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get user reactions for these posts
    const postIds = posts.map(post => post._id);
    const userReactions = await Reaction.find({
      targetId: { $in: postIds },
      targetType: 'post',
      userId: currentUserId
    }).lean();

    const userReactionMap = {};
    userReactions.forEach(reaction => {
      userReactionMap[reaction.targetId.toString()] = reaction.type;
    });

    const postsWithReactions = posts.map(post => ({
      ...post,
      userReaction: userReactionMap[post._id.toString()] || null
    }));

    const totalPosts = await Post.countDocuments();
    const totalPages = Math.ceil(totalPosts / limit);

    res.status(200).json({
      posts: postsWithReactions,
      currentPage: page,
      totalPages,
      totalPosts,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    });
  } catch (error) {
    console.error("Error in getPosts controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const post = await Post.findById(id)
      .populate("senderId", USER_PUBLIC_FIELDS)
      .lean();

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Get user's reaction
    const userReaction = await Reaction.findOne({
      targetId: id,
      targetType: 'post',
      userId: currentUserId
    });

    res.status(200).json({
      ...post,
      userReaction: userReaction ? userReaction.type : null
    });
  } catch (error) {
    console.error("Error in getPostById controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const currentUserId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const posts = await Post.find({ senderId: userId })
      .populate("senderId", USER_PUBLIC_FIELDS)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get user reactions
    const postIds = posts.map(post => post._id);
    const userReactions = await Reaction.find({
      targetId: { $in: postIds },
      targetType: 'post',
      userId: currentUserId
    }).lean();

    const userReactionMap = {};
    userReactions.forEach(reaction => {
      userReactionMap[reaction.targetId.toString()] = reaction.type;
    });

    const postsWithReactions = posts.map(post => ({
      ...post,
      userReaction: userReactionMap[post._id.toString()] || null
    }));

    const totalPosts = await Post.countDocuments({ senderId: userId });
    const totalPages = Math.ceil(totalPosts / limit);

    res.status(200).json({
      posts: postsWithReactions,
      currentPage: page,
      totalPages,
      totalPosts,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    });
  } catch (error) {
    console.error("Error in getUserPosts controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, image } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "You can only edit your own posts" });
    }

    let imageUrl = post.image;
    if (image && image !== post.image) {
      // Delete old image if exists
      if (post.image) {
        const publicId = post.image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      }
      // Upload new image
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    post.text = text || post.text;
    post.image = imageUrl;
    await post.save();

    const updatedPost = await Post.findById(id)
      .populate("senderId", USER_PUBLIC_FIELDS)
      .lean();

    res.status(200).json(updatedPost);
  } catch (error) {
    console.error("Error in updatePost controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "You can only delete your own posts" });
    }

    // Delete image from cloudinary
    if (post.image) {
      const publicId = post.image.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    }

    // Delete all comments and reactions related to this post
    await Comment.deleteMany({ postId: id });
    await Reaction.deleteMany({ targetId: id, targetType: 'post' });
    await Post.findByIdAndDelete(id);

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error in deletePost controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ============ COMMENT CONTROLLERS ============

export const createComment = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const { text, image, parentCommentId } = req.body;
    const userId = req.user._id;

    if (!text && !image) {
      return res.status(400).json({ error: "Comment must contain either text or image" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // If it's a reply, check if parent comment exists
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({ error: "Parent comment not found" });
      }
    }

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newComment = new Comment({
      text,
      image: imageUrl,
      userId,
      postId,
      parentCommentId: parentCommentId || null
    });

    await newComment.save();

    // Update post comment count
    post.commentCount += 1;
    await post.save();

    // Update parent comment reply count if it's a reply
    if (parentCommentId) {
      await Comment.findByIdAndUpdate(parentCommentId, {
        $inc: { replyCount: 1 }
      });
    }

    const populatedComment = await Comment.findById(newComment._id)
      .populate("senderId", USER_PUBLIC_FIELDS)
      .lean();

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error("Error in createComment controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getComments = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const currentUserId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Get top-level comments only (not replies)
    const comments = await Comment.find({ 
      postId, 
      parentCommentId: null 
    })
      .populate("userId", "fullName profilePic email Job universityName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get user reactions for these comments
    const commentIds = comments.map(comment => comment._id);
    const userReactions = await Reaction.find({
      targetId: { $in: commentIds },
      targetType: 'comment',
      userId: currentUserId
    }).lean();

    const userReactionMap = {};
    userReactions.forEach(reaction => {
      userReactionMap[reaction.targetId.toString()] = reaction.type;
    });

    const commentsWithReactions = comments.map(comment => ({
      ...comment,
      userReaction: userReactionMap[comment._id.toString()] || null
    }));

    const totalComments = await Comment.countDocuments({ 
      postId, 
      parentCommentId: null 
    });
    const totalPages = Math.ceil(totalComments / limit);

    res.status(200).json({
      comments: commentsWithReactions,
      currentPage: page,
      totalPages,
      totalComments,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    });
  } catch (error) {
    console.error("Error in getComments controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getReplies = async (req, res) => {
  try {
    const { commentId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const currentUserId = req.user._id;

    const parentComment = await Comment.findById(commentId);
    if (!parentComment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    const replies = await Comment.find({ parentCommentId: commentId })
      .populate("senderId", USER_PUBLIC_FIELDS)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get user reactions for replies
    const replyIds = replies.map(reply => reply._id);
    const userReactions = await Reaction.find({
      targetId: { $in: replyIds },
      targetType: 'comment',
      userId: currentUserId
    }).lean();

    const userReactionMap = {};
    userReactions.forEach(reaction => {
      userReactionMap[reaction.targetId.toString()] = reaction.type;
    });

    const repliesWithReactions = replies.map(reply => ({
      ...reply,
      userReaction: userReactionMap[reply._id.toString()] || null
    }));

    const totalReplies = await Comment.countDocuments({ parentCommentId: commentId });
    const totalPages = Math.ceil(totalReplies / limit);

    res.status(200).json({
      replies: repliesWithReactions,
      currentPage: page,
      totalPages,
      totalReplies,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    });
  } catch (error) {
    console.error("Error in getReplies controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { text, image } = req.body;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (comment.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "You can only edit your own comments" });
    }

    let imageUrl = comment.image;
    if (image && image !== comment.image) {
      if (comment.image) {
        const publicId = comment.image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      }
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    comment.text = text || comment.text;
    comment.image = imageUrl;
    await comment.save();

    const updatedComment = await Comment.findById(commentId)
      .populate("senderId", USER_PUBLIC_FIELDS)
      .lean();

    res.status(200).json(updatedComment);
  } catch (error) {
    console.error("Error in updateComment controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (comment.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "You can only delete your own comments" });
    }

    // Delete image from cloudinary
    if (comment.image) {
      const publicId = comment.image.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    }

    // Delete all replies and reactions to this comment
    await Comment.deleteMany({ parentCommentId: commentId });
    await Reaction.deleteMany({ targetId: commentId, targetType: 'comment' });

    // Update post comment count
    await Post.findByIdAndUpdate(comment.postId, {
      $inc: { commentCount: -1 }
    });

    // Update parent comment reply count if it's a reply
    if (comment.parentCommentId) {
      await Comment.findByIdAndUpdate(comment.parentCommentId, {
        $inc: { replyCount: -1 }
      });
    }

    await Comment.findByIdAndDelete(commentId);

    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error in deleteComment controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ============ REACTION CONTROLLERS ============

// ============ REACTION CONTROLLERS (fixed) ============

export const addOrUpdateReaction = async (req, res) => {
  try {
    const targetId = req.params.id || req.params.commentId;   // <- works for both routes
    const { type, targetType } = req.body;                    // 'post' | 'comment'
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ error: "Invalid target id" });
    }

    const validTypes = ["love", "like", "funny", "horror"];
    const validTargets = ["post", "comment"];
    if (!validTypes.includes(type)) return res.status(400).json({ error: "Invalid reaction type" });
    if (!validTargets.includes(targetType)) return res.status(400).json({ error: "Invalid target type" });

    const TargetModel = targetType === "post" ? Post : Comment;
    const target = await TargetModel.findById(targetId);
    if (!target) return res.status(404).json({ error: `${targetType} not found` });

    let reaction = await Reaction.findOne({ userId, targetId, targetType });

    if (reaction) {
      if (reaction.type === type) {
        // same reaction -> remove
        await Reaction.findByIdAndDelete(reaction._id);
        await updateReactionCounts(targetId, targetType);
        const counts = await getReactionCounts(targetId, targetType);
        return res.status(200).json({ message: "Reaction removed", userReaction: null, reactionCounts: counts });
      }
      // change reaction
      reaction.type = type;
      await reaction.save();
    } else {
      // add new
      await new Reaction({ userId, targetId, targetType, type }).save();
    }

    await updateReactionCounts(targetId, targetType);
    const counts = await getReactionCounts(targetId, targetType);
    return res.status(reaction ? 200 : 201).json({
      message: `${reaction ? "Reaction changed to" : "Added"} ${type}`,
      userReaction: type,
      reactionCounts: counts,
    });
  } catch (err) {
    console.error("addOrUpdateReaction error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removeReaction = async (req, res) => {
  try {
    const targetId = req.params.id || req.params.commentId;
    const { targetType } = req.body; // 'post' | 'comment'
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ error: "Invalid target id" });
    }
    const validTargets = ["post", "comment"];
    if (!validTargets.includes(targetType)) return res.status(400).json({ error: "Invalid target type" });

    const deleted = await Reaction.findOneAndDelete({ userId, targetId, targetType });
    if (!deleted) return res.status(404).json({ error: "No reaction found to remove" });

    await updateReactionCounts(targetId, targetType);
    const counts = await getReactionCounts(targetId, targetType);
    res.status(200).json({ message: "Reaction removed successfully", userReaction: null, reactionCounts: counts });
  } catch (err) {
    console.error("removeReaction error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getReactions = async (req, res) => {
  try {
    const targetId = req.params.id || req.params.commentId;
    const { targetType, type } = req.query; // targetType required

    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ error: "Invalid target id" });
    }
    const validTargets = ["post", "comment"];
    if (!validTargets.includes(targetType)) return res.status(400).json({ error: "Invalid target type" });

    const query = { targetId, targetType };
    if (type && ["love", "like", "funny", "horror"].includes(type)) query.type = type;

    const reactions = await Reaction.find(query)
     .populate("senderId", USER_PUBLIC_FIELDS)
      .sort({ createdAt: -1 })
      .lean();

    const reactionsByType = { love: [], like: [], funny: [], horror: [] };
    reactions.forEach(r => {
      reactionsByType[r.type].push({ user: r.userId, reactedAt: r.createdAt });
    });

    const reactionCounts = await getReactionCounts(targetId, targetType);

    res.status(200).json({
      targetId,
      targetType,
      reactionCounts,
      reactionsByType,
      totalReactions: reactions.length,
    });
  } catch (err) {
    console.error("getReactions error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ============ HELPER FUNCTIONS ============

const updateReactionCounts = async (targetId, targetType) => {
  try {
    const counts = await Reaction.aggregate([
      { $match: { targetId: new mongoose.Types.ObjectId(targetId), targetType } },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 }
        }
      }
    ]);

    const reactionCounts = {
      love: 0,
      like: 0,
      funny: 0,
      horror: 0,
      total: 0
    };

    counts.forEach(item => {
      reactionCounts[item._id] = item.count;
      reactionCounts.total += item.count;
    });

    const Model = targetType === 'post' ? Post : Comment;
    await Model.findByIdAndUpdate(targetId, { reactionCounts });
    
    return reactionCounts;
  } catch (error) {
    console.error("Error updating reaction counts:", error);
  }
};

const getReactionCounts = async (targetId, targetType) => {
  try {
    const Model = targetType === 'post' ? Post : Comment;
    const target = await Model.findById(targetId);
    return target ? target.reactionCounts : null;
  } catch (error) {
    console.error("Error getting reaction counts:", error);
    return null;
  }
};