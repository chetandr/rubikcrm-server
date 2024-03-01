import { getDB } from "../db/connection/index.js";

export async function readClientServices() {
  try {
    const { db, client } = await getDB();
    const consultants = await db.collection("services").find().toArray();
    client.close();
    return consultants;
  } catch (e) {
    console.error(e);
  }
}
