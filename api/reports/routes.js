import { Router } from "express";
import getSalesReport from "./salesReport.js";
import getSalesSummaryReport from "./salesSummaryReport.js";

const reportRouter = Router();

//login
reportRouter.get("/sales", getSalesReport);
reportRouter.get("/salesSummary", getSalesSummaryReport);

export default reportRouter;