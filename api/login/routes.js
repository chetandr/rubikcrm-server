import {
    getGToken,
    getGoogleAuthUrl,
    refreshToken,
    verifyToken,
} from "./index.js";

import { Router } from "express";

const loginRouter = Router();

//login
loginRouter.post("/url", getGoogleAuthUrl);

loginRouter.post("/info", getGToken);

loginRouter.post("/verify", verifyToken);

loginRouter.post("/refresh", refreshToken);

export default loginRouter;