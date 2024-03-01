import { readClientPOCs } from "./db.js";

export default async function ClientPOCController(req, res) {
  try {
    const result = await readClientPOCs();

    if (!result) {
      throw new Error("Client POC list not found");
    }

    return res.status(200).json({
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message || "something went wrong",
    });
  }
}
