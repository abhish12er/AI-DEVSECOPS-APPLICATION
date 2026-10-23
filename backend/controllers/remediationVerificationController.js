const mongoose = require("mongoose");
const path = require("path");
const Scan = require("../models/Scan");
const AIRecommendation = require("../models/AIRecommendation");

const clean = (value) => String(value ?? "").trim().toLowerCase();
const known = (value) => !["", "n/a", "unknown", "none", "null"].includes(clean(value));
const projectKey = (value) => clean(value).replace(/\\/g, "/");
const isNpmScan = (scan) => (scan.scanner || "npm-audit") === "npm-audit";

function matchingAdvisory(original, current) {
  return ["source", "cve", "advisory"].some(
    (key) => known(original[key]) && known(current[key]) &&
      clean(original[key]) === clean(current[key])
  );
}

// Older scans stored only the final folder name (e.g. "server").
// Only resolve that legacy name if it identifies exactly one audited project.
function resolveAuditedProject(originalProject, auditedProjects) {
  const key = projectKey(originalProject);
  if (!key) return null;

  const normalized = auditedProjects.map(projectKey);
  if (normalized.includes(key)) return key;

  // A legacy basename is unsafe when multiple nested projects share that name.
  if (key.includes("/")) return null;
  const candidates = normalized.filter((candidate) =>
    path.posix.basename(candidate) === key
  );
  return candidates.length === 1 ? candidates[0] : null;
}

async function verifyRemediation(req, res) {
  try {
    const { recommendationId } = req.params;
    const { verificationScanId } = req.body || {};

    if (!mongoose.isValidObjectId(recommendationId) ||
        !mongoose.isValidObjectId(verificationScanId)) {
      return res.status(400).json({
        message: "Valid recommendationId and verificationScanId are required",
      });
    }

    const recommendation = await AIRecommendation.findById(recommendationId);
    if (!recommendation) {
      return res.status(404).json({ message: "AI recommendation not found" });
    }

    const [originalScan, verificationScan] = await Promise.all([
      Scan.findById(recommendation.scanId),
      Scan.findById(verificationScanId),
    ]);
    if (!originalScan || !verificationScan) {
      return res.status(404).json({ message: "Original or verification scan not found" });
    }

    const repoId = String(recommendation.repoId);
    if (String(originalScan.repoId) !== repoId ||
        String(verificationScan.repoId) !== repoId) {
      return res.status(400).json({
        message: "Both scans must belong to the recommendation's repository",
      });
    }

    const originalDate = new Date(originalScan.createdAt).getTime();
    const verificationDate = new Date(verificationScan.createdAt).getTime();
    if (!Number.isFinite(originalDate) || !Number.isFinite(verificationDate) ||
        verificationDate <= originalDate) {
      return res.status(400).json({
        message: "Verification scan must be newer than the original scan",
      });
    }

    const originalFinding = originalScan.findings.id(recommendation.findingId);
    if (!originalFinding) {
      return res.status(404).json({ message: "Original vulnerability finding not found" });
    }

    let status = "inconclusive";
    let reason = "";

    const coverage = verificationScan.scanCoverage;
    const auditedProjects = coverage?.auditedProjects || [];
    const project = resolveAuditedProject(originalFinding.project, auditedProjects);

    if (!isNpmScan(originalScan) || !isNpmScan(verificationScan)) {
      reason = "Verification currently supports npm-audit scans only.";
    } else if (originalScan.status !== "completed" ||
               verificationScan.status !== "completed") {
      reason = "Both scans must have completed successfully.";
    } else if (coverage?.complete !== true ||
               coverage?.projectsFailed !== 0 ||
               coverage?.projectsScanned < 1 ||
               auditedProjects.length !== coverage.projectsScanned) {
      reason = "Newer scan has incomplete or unconfirmed project coverage.";
    } else if (!known(originalFinding.packageName) || !known(originalFinding.project)) {
      reason = "Original package or project identity is missing.";
    } else if (!project) {
      reason = "Original project cannot be uniquely matched to an audited project.";
    } else {
      const packageFindings = (verificationScan.findings || []).filter(
        (finding) => projectKey(finding.project) === project &&
          clean(finding.packageName) === clean(originalFinding.packageName)
      );

      if (packageFindings.length === 0) {
        status = "verified";
        reason = "The newer complete npm audit of the same project reports no findings for this package. This is scan-based evidence, not proof of a specific code change.";
      } else if (packageFindings.some((finding) => matchingAdvisory(originalFinding, finding))) {
        status = "still_vulnerable";
        reason = "The same advisory is still reported for this package and project.";
      } else {
        reason = "The package still has findings, but the original advisory cannot be reliably identified as present or absent.";
      }
    }

    recommendation.verification = {
      status,
      verificationScanId: verificationScan._id,
      checkedAt: new Date(),
      reason,
    };
    recommendation.status = status === "verified" ? "verified" : "generated";
    await recommendation.save();

    return res.status(200).json({
      message: "Remediation verification completed",
      recommendationId: recommendation._id,
      originalScanId: originalScan._id,
      verificationScanId: verificationScan._id,
      packageName: originalFinding.packageName,
      originalSeverity: originalFinding.severity,
      verification: recommendation.verification,
      status: recommendation.status,
    });
  } catch (error) {
    console.error("Remediation verification error:", error.message);
    return res.status(500).json({ message: "Failed to verify remediation" });
  }
}

module.exports = { verifyRemediation };
