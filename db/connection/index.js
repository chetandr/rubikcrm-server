import { MongoClient } from "mongodb";

export async function getDB() {
  //
  const mongoURL = process.env.MONGODB_URI ?? "";
  const mongoClient = new MongoClient(mongoURL);
  const clientPromise = mongoClient.connect();
  const client = await clientPromise;
  return { db: client.db("crm"), client };
}

export async function getDBClient() {
  //
  const mongoURL = process.env.MONGODB_URI ?? "";
  const mongoClient = new MongoClient(mongoURL);
  const clientPromise = mongoClient.connect();
  return clientPromise;
}
