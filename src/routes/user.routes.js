import { Router } from "express";
import { verifyAccessToken } from "../middlewares/auth.middleware.js";
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  renewAccessToken,
} from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);

router.use(verifyAccessToken);
router.route("/logout").post(logoutUser);
router.route("/getCurrentUser").post(getCurrentUser);
router.route("/refreshToken").post(renewAccessToken);

export default router;
