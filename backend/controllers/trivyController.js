
const fs = require("fs");
const os = require("os");
const path = require("path");
const simpleGit = require("simple-git");

const Repository = require("../models/Repository");
const Scan = require("../models/Scan");
const { runTrivyScan } = require("../services/trivyService");

const runTrivyRepositoryScan = async (req, res) => {
  const { repoId } = req.body || {};
  let tempDir;

  if (!repoId) {
    return res.status(400).json({
      message: "repoId is required",
    });
  }

  try {
    const repository = await Repository.findById(repoId);

    if (!repository) {
      return res.status(404).json({
        message: "Repository not found",
      });
    }

    // Create an isolated temporary directory.
    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "devsecops-trivy-")
    );

    console.log("Starting Trivy repository scan");
    console.log("Repository:", repository.repoName);

    // Clone the connected repository.
    await simpleGit().clone(
      repository.repoUrl,
      tempDir
    );

    // Execute Trivy and parse findings.
    const rawFindings = await runTrivyScan(tempDir);

    // Match the existing MongoDB severity enum.

const allowedSeverities = new Set([
  "UNKNOWN",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

const findings = rawFindings.map((finding) => ({
  ...finding,
  severity: allowedSeverities.has(finding.severity)
    ? finding.severity
    : "UNKNOWN",
}));


    const scan = await Scan.create({
      repoId: repository._id,
      repoName: repository.repoName,
      scanner: "trivy",
      status: "completed",
      findings,
    });

   
const summary = {
  totalFindings: findings.length,
  critical: findings.filter(
    (f) => f.severity === "CRITICAL"
  ).length,
  high: findings.filter(
    (f) => f.severity === "HIGH"
  ).length,
  medium: findings.filter(
    (f) => f.severity === "MEDIUM"
  ).length,
  low: findings.filter(
    (f) => f.severity === "LOW"
  ).length,
  unknown: findings.filter(
    (f) => f.severity === "UNKNOWN"
  ).length,
};


    return res.status(200).json({
      message: "Trivy scan completed successfully.",
      data: scan,
      summary,
    });
  } catch (error) {
    console.error("Trivy scan error:", error);

    return res.status(500).json({
      message: "Trivy repository scan failed.",
      error: error.message,
    });
  } finally {
    if (tempDir) {
      try {
        fs.rmSync(tempDir, {
          recursive: true,
          force: true,
        });
      } catch (cleanupError) {
        console.error(
          "Temporary directory cleanup failed:",
          cleanupError.message
        );
      }
    }
  }
};

module.exports = { runTrivyRepositoryScan };
