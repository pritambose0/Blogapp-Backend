import { Router } from "express";
import { verifyAccessToken } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { createPost, getAllPosts } from "../controllers/post.controller.js";
const router = Router();

router.use(verifyAccessToken);
router.route("/").get(getAllPosts);
router.route("/create").post(upload.single("featuredImage"), createPost);

export default router;
