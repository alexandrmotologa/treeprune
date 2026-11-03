import express from "express";
import { formatData } from "./utils/active_helper";

const app = express();

app.get("/api/users", (req, res) => {
  const data = formatData({ count: 10 });
  res.json(data);
});

app.post("/api/users", (req, res) => {
  res.json({ success: true });
});

// Zombie Endpoint: Declared on backend but frontend never calls it
app.delete("/api/orphan-route", (req, res) => {
  res.json({ deleted: true });
});

export default app;
