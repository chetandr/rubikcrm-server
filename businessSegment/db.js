import { getDB } from "../db/connection/index.js";

export async function readBusinessSegments() {
  try {
    const { db, client } = await getDB();
    const consultants = await db
      .collection("businessSegments")
      .find()
      .toArray();
    client.close();
    return consultants;
  } catch (e) {
    console.error(e);
  }
}
