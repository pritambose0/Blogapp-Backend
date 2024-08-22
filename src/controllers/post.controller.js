import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Post } from "../models/post.model.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/clodinary.js";
import mongoose, { isValidObjectId } from "mongoose";

const getAllPosts = asyncHandler(async (req, res) => {
  const {
    query = "",
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortType = "asc",
  } = req.query;
  const skip = (page - 1) * limit;

  const posts = await Post.aggregate([
    {
      $match: {
        title: { $regex: query, $options: "i" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [{ $project: { fullName: 1 } }],
      },
    },
    {
      $unwind: "$owner",
    },
    {
      $project: {
        title: 1,
        slug: 1,
        content: 1,
        featuredImage: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        owner: 1,
      },
    },
    {
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    },
    { $limit: limit * 1 },
    { $skip: skip },
  ]);
  //   console.log("posts", posts);

  return res
    .status(200)
    .json(new ApiResponse(200, posts, "Posts fetched successfully"));
});

const getPostById = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  if (!postId) {
    throw new ApiError(401, "Post Id is required");
  }

  const post = await Post.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(postId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [{ $project: { fullName: 1 } }],
      },
    },
    {
      $unwind: "$owner",
    },
    {
      $project: {
        title: 1,
        slug: 1,
        content: 1,
        "featuredImage.url": 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        owner: 1,
      },
    },
  ]);

  if (!post) {
    throw new ApiError(404, "Post not found");
  }
  console.log(post);

  return res
    .status(200)
    .json(new ApiResponse(200, post, "Post fetched successfully"));
});

const createPost = asyncHandler(async (req, res) => {
  const { title, slug, content, status } = req.body;
  // console.log("req.body", req.body);
  if ([title, slug, content].some((field) => !field)) {
    throw new ApiError(401, "All fields are required");
  }

  const featuredImageLocalPath = req.file?.path;
  if (!featuredImageLocalPath) {
    throw new ApiError(401, "Featured Image is required");
  }

  const featuredImage = await uploadOnCloudinary(featuredImageLocalPath);
  if (!featuredImage) {
    throw new ApiError(500, "Error while uploading the image");
  }

  const post = await Post.create({
    title,
    slug,
    content,
    featuredImage: {
      url: featuredImage.url,
      publicId: featuredImage.public_id,
    },
    status,
    owner: new mongoose.Types.ObjectId(req.user?._id),
  });

  if (!post) {
    throw new ApiError(500, "Error while creating the post");
  }
  console.log("post", post);

  return res
    .status(200)
    .json(new ApiResponse(200, post, "Post created successfully"));
});

const updatePost = asyncHandler(async (req, res) => {
  const { title, slug, content, status } = req.body;

  const { postId } = req.params;
  if (!postId || !isValidObjectId(postId)) {
    throw new ApiError(400, "Post id is not valid");
  }

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  if (req.user?._id.toString() !== post?.owner._id.toString()) {
    throw new ApiError(
      401,
      "You do not have permission to perform this action"
    );
  }

  const featuredImageLocalPath = req.file?.path;

  const featuredImage =
    featuredImageLocalPath &&
    (await uploadOnCloudinary(featuredImageLocalPath));

  if (featuredImageLocalPath) {
    if (!featuredImage) {
      throw new ApiError(500, "Error while uploading the image");
    }
  }

  const updatedPost = await Post.findByIdAndUpdate(
    postId,
    {
      $set: {
        title: title || post.title,
        slug: slug || post.slug,
        content: content || post.content,
        featuredImage: featuredImage
          ? {
              url: featuredImage.url,
              publicId: featuredImage.public_id,
            }
          : post?.featuredImage,
        status,
      },
    },
    { new: true }
  );

  if (!updatedPost) {
    throw new ApiError(400, "Error while updating post");
  }

  const oldFeaturedImage = post?.featuredImage?.publicId;
  if (!oldFeaturedImage) {
    throw new ApiError(400, "Featured Image is not found");
  }

  const deleteFeaturedImage = await deleteFromCloudinary(oldFeaturedImage);
  if (!deleteFeaturedImage) {
    throw new ApiError(
      500,
      "Error while deleting featured image from cloudinary"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedPost, "Post updated successfully"));
});

const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!postId) {
    throw new ApiError(400, "Post id is not valid");
  }

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  if (req.user?._id.toString() !== post?.owner?._id.toString()) {
    throw new ApiError(
      401,
      "You do not have permission to perform this action"
    );
  }

  const deletedPost = await Post.findByIdAndDelete(postId);
  if (!deletedPost) {
    throw new ApiError(400, "Error while deleting post");
  }

  const deletedFeaturedImage = await deleteFromCloudinary(
    post.featuredImage?.publicId
  );

  if (!deletedFeaturedImage) {
    throw new ApiError(500, "Error while deleting image");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Post deleted successfully"));
});

export { getAllPosts, createPost, updatePost, deletePost, getPostById };
