import fs from "fs";
import path from "path";

// Use /tmp directory for data storage on Vercel
const DATA_DIR = "/tmp";
const DATA_FILE = path.join(DATA_DIR, "registeredUsers.json");

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === "GET") {
      // Get registered users
      if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, "utf8");
        res.status(200).json(JSON.parse(data || "[]"));
      } else {
        res.status(200).json([]);
      }
    } else if (req.method === "POST") {
      // Save registered users
      const data = req.body;

      if (data && Array.isArray(data)) {
        // Ensure directory exists
        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        res
          .status(200)
          .json({ success: true, message: "Data saved successfully" });
      } else {
        res.status(400).json({ error: "Invalid data format" });
      }
    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
