import { readBusinessSegments } from "./db.js";

export default async function businessSegmentController(req, res) {
  try {
    const result = await readBusinessSegments();

    if (!result) {
      throw new Error("Business Segment list not found");
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
