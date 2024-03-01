import { Router } from "express";
import controller from "./controller.js";
const router = Router();

/* GET home page. */
router.get("/", controller);

export default router;
