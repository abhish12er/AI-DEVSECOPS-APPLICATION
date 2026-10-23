
const dotenv = require("dotenv");

// Load environment variables before importing routes or services
dotenv.config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");


const repoRoutes = require("./routes/repoRoutes");
const scanRoutes = require("./routes/scanRoutes");
const pipelineRoutes = require("./routes/pipelineRoutes");

const aiRemediationRoutes = require("./routes/aiRemediationRoutes");
connectDB();

const remediationVerificationRoutes = require("./routes/remediationVerificationRoutes");

const app = express();

// Middleware MUST come before routes
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/repos", repoRoutes);
app.use("/api/scans", scanRoutes);
app.use("/api/pipelines", pipelineRoutes);

app.use("/api/ai-remediation", aiRemediationRoutes);

app.use("/api/ai-remediation", remediationVerificationRoutes);

app.get("/", (req, res) => {
  res.send("AI DevSecOps Backend Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});