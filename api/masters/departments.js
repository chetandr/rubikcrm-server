import { getDB } from "../../db/connection/index.js";
export default async function getDepartments(req, res) {
    const {db, client} = await getDB()
    const collection = await db.collection("departments").find({});
    const departments = await collection.toArray();
    client.close();
    res
    .status(200)
    .json({ departments });
}