
const express = require("express");

const router = express.Router();

const {
  runScan,
  getScans,
  analyzeSecurity,
} = require("../controllers/scanController");

const {
  runTrivyRepositoryScan,
} = require("../controllers/trivyController");


const {
  getSonarProjectResults,
} = require("../controllers/sonarController");


// Existing npm audit scanner
router.post("/run", runScan);

// New Trivy vulnerability scanner
router.post("/trivy/run", runTrivyRepositoryScan);


// Retrieve existing SonarQube analysis results
router.get("/sonar/results", getSonarProjectResults);


// Existing scan history
router.get("/", getScans);

// Existing security analysis
router.post("/analyze", analyzeSecurity);

module.exports = router;
