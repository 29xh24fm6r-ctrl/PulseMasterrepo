import express from "express";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

const getBaseUrl = (req) => {
  return (
    process.env.BASE_URL ||
    `${req.headers["x-forwarded-proto"] || "https"}://${req.headers["x-forwarded-host"] || req.headers.host}`
  );
};

app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "pulse-mcp",
    message: "MCP is alive",
  });
});

const oauthAuthServer = (req, res) => {
  const BASE_URL = getBaseUrl(req);
  res.status(200).json({
    issuer: BASE_URL,
    authorization_endpoint: `${BASE_URL}/authorize`,
    token_endpoint: `${BASE_URL}/token`,
    registration_endpoint: `${BASE_URL}/register`,
    response_types_supported: ["token"],
    grant_types_supported: ["client_credentials"],
    token_endpoint_auth_methods_supported: ["none"],
  });
};

const oauthProtectedResource = (req, res) => {
  const BASE_URL = getBaseUrl(req);
  res.status(200).json({
    resource: BASE_URL,
    authorization_servers: [BASE_URL],
  });
};

// support both variants just in case
app.get("/.well-known/oauth-authorization-server", oauthAuthServer);
app.get("/well-known/oauth-authorization-server", oauthAuthServer);

app.get("/.well-known/oauth-protected-resource", oauthProtectedResource);
app.get("/well-known/oauth-protected-resource", oauthProtectedResource);

app.post("/register", (req, res) => {
  res.status(200).json({
    client_id: "claude",
    token_endpoint_auth_method: "none",
    grant_types: ["client_credentials"],
  });
});

app.post("/", (req, res) => {
  res.status(200).json({ status: "ok", received: req.body });
});

app.listen(PORT, () => {
  console.log(`Pulse MCP listening on port ${PORT}`);
});
