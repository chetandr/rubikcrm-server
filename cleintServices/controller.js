import { readClientServices } from "./db.js";

export default async function ClientServicesController(req, res) {
  try {
    const result = await readClientServices();

    if (!result) {
      throw new Error("Client Services list not found");
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
