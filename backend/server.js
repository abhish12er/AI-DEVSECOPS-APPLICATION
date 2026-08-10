const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const repoRoutes = require("./routes/repoRoutes");
const scanRoutes = require("./routes/scanRoutes");

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/repos", repoRoutes);
app.use("/api/scans", scanRoutes);

app.get("/", (req, res) => {
  res.send("AI DevSecOps Backend Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});