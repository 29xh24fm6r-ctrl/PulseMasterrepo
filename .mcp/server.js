import express from "express";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "pulse-mcp",
    message: "MCP is alive"
  });
});

app.post("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    received: req.body
  });
});

app.listen(PORT, () => {
  console.log(`Pulse MCP listening on port ${PORT}`);
});
