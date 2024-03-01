import businessSegmentRouter from "./businessSegment/index.js";
import cleintServices from "./cleintServices/index.js";
import clientPOCRouter from "./clientPOC/index.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import logger from "morgan";
import loginRouter from "./api/login/routes.js"
import masterRouter from "./api/masters/routes.js";
import reportRouter from "./api/reports/routes.js";
dotenv.config();

const app = express();

app.use(logger("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/clientPOCs", clientPOCRouter);
app.use("/businessSegments", businessSegmentRouter);
app.use("/clientServices", cleintServices);
app.use('/api/login', loginRouter)
app.use('/api/report', reportRouter)
app.use('/api/masters', masterRouter)
export default app;
