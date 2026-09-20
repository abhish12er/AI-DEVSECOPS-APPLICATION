const express = require("express");

const router = express.Router();

const {
  runScan,
  getScans,
  analyzeSecurity,
} = require("../controllers/scanController");

router.post("/run", runScan);

router.get("/", getScans);

router.post("/analyze", analyzeSecurity);

module.exports = router;