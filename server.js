import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";

import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";

import Week from "./models/Week.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable("x-powered-by");

app.use(helmet());
app.use(compression());
// app.use(mongoSanitize());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const MONGODB_URI = process.env.MONGODB_URI || "";
if (!MONGODB_URI) {
  console.warn("⚠️  MONGODB_URI is not set. Set it in .env");
}
mongoose
  .connect(MONGODB_URI, { dbName: process.env.MONGODB_DB || undefined })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// API
app.get("/api/tasks/:weekKey", async (req, res, next) => {
  try {
    const doc = await Week.findOne({ weekKey: req.params.weekKey }).lean();
    res.json(doc?.days || {});
  } catch (e) { next(e); }
});

app.post("/api/tasks/:weekKey", async (req, res, next) => {
  try {
    const { weekKey } = req.params;
    const { days } = req.body;
    if (typeof days !== "object" || Array.isArray(days)) {
      return res.status(400).json({ error: "Invalid payload: 'days' must be an object" });
    }
    const updated = await Week.findOneAndUpdate(
      { weekKey },
      { days, updatedAt: new Date() },
      { upsert: true, new: true }
    ).lean();
    res.json({ success: true, weekKey, days: updated.days });
  } catch (e) { next(e); }
});

app.delete("/api/tasks/:weekKey", async (req, res, next) => {
  try {
    await Week.deleteOne({ weekKey: req.params.weekKey });
    res.json({ cleared: true });
  } catch (e) { next(e); }
});

// Pages (render existing ejs files if present)
import axios from "axios"; // make sure this is at the top with other imports

app.get("/", async (req, res) => {
  try {
    const response = await axios.get("https://api.api-ninjas.com/v1/quotes", {
      headers: { "X-Api-Key": process.env.API },
    });

    const data = response.data[0]; // API returns array with one quote
    res.render("index.ejs", { content: data });
  } 
  catch (error) {
    console.error(error);
    res.render("index.ejs", {
      content: { quote: "Failed to load quote 😢", author: "Unknown" },
    });
  }
});
app.get("/weekly", (req, res) => res.render("weekly"));
app.get("/login", (req, res) => res.render("login"));
app.get("/modify", (req, res) => res.render("modify"));
app.get("/notes", (req, res) => res.render("notes"));
app.get("/solution", (req, res) => res.render("solution"));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
