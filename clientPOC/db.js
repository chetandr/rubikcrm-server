import { getDB } from "../db/connection/index.js";

export async function readClientPOCs() {
  try {
    const { db, client } = await getDB();
    const consultants = await db.collection("clientPOC").find().toArray();
    client.close();
    return consultants;
  } catch (e) {
    console.error(e);
  }
}
