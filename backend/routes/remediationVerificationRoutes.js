
const express = require("express");

const router = express.Router();

const {
  verifyRemediation,
} = require("../controllers/remediationVerificationController");

// Verify an AI remediation using a newer security scan
router.post(
  "/verify/:recommendationId",
  verifyRemediation
);

module.exports = router;
