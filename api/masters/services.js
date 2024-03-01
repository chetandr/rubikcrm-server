import { ObjectId } from "mongodb";
import { getDB } from "../../db/connection/index.js";
export default async function getServices(req, res) {
  const departmentQuery = req.query.department;
  const serviceCriteria =
    departmentQuery && departmentQuery == "All"
      ? {}
      : { DEPARTMENT: new ObjectId(departmentQuery) };
  const { db, client } = await getDB();
  const collection = await db
    .collection("services")
    .find(serviceCriteria)
    .project(["_id", "SERVICE"]);
  const services = await collection.toArray();
  client.close();
  res.status(200).json({ services });
}
