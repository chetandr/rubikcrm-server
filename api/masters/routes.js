import { Router } from "express";
import getDepartments from "./departments.js";
import getServices from "./services.js";

const masterRouter = Router();

//login
masterRouter.get("/departments", getDepartments);
masterRouter.get("/services", getServices);

export default masterRouter;