import { Router } from "express";
import getSalesReport from "./salesReport.js";
import getSalesSummaryReport from "./salesSummaryReport.js";

const reportRouter = Router();

//login
reportRouter.post("/sales", getSalesReport);
reportRouter.post("/salesSummary", getSalesSummaryReport);

export default reportRouter;