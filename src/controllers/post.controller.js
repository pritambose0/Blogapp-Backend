import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Post } from "../models/post.model.js";
import { uploadOnCloudinary } from "../utils/clodinary.js";
import mongoose from "mongoose";

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

const createPost = asyncHandler(async (req, res) => {
  const { title, slug, content, status } = req.body;
  console.log("req.body", req.body);
  if ([title, slug, content].some((field) => !field)) {
    throw new ApiError(401, "All fields are required");
  }

  const featuredImageLocalPath = req.file?.path;
  if (!featuredImageLocalPath) {
    throw new ApiError(401, "Featured Image is required");
  }

  const featuredImageUrl = await uploadOnCloudinary(featuredImageLocalPath);
  if (!featuredImageUrl) {
    throw new ApiError(500, "Error while uploading the image");
  }

  const post = await Post.create({
    title,
    slug,
    content,
    featuredImage: {
      url: featuredImageUrl.url,
      publicId: featuredImageUrl.public_id,
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

export { getAllPosts, createPost };
