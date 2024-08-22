import { Router } from "express";
import { verifyAccessToken } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  createPost,
  deletePost,
  getAllPosts,
  getPostById,
  updatePost,
} from "../controllers/post.controller.js";
const router = Router();

router.route("/").get(getAllPosts);
router.route("/:postId").get(getPostById);

router.use(verifyAccessToken);
router.route("/create").post(upload.single("featuredImage"), createPost);
router
  .route("/update/:postId")
  .patch(upload.single("featuredImage"), updatePost);
router.route("/delete/:postId").delete(deletePost);

export default router;
