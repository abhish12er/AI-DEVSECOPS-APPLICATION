
const Pipeline = require("../models/Pipeline");
const Repository = require("../models/Repository");
const Scan = require("../models/Scan");

const {
  getSonarResults,
  getQualityGateStatus,
} = require("../services/sonarService");

// Count findings from a vulnerability scan
const countFindings = (scan) => {
  const counts = {
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  if (!scan || !Array.isArray(scan.findings)) {
    return counts;
  }

  scan.findings.forEach((finding) => {
    counts.total++;

    switch (finding.severity?.toUpperCase()) {
      case "CRITICAL":
        counts.critical++;
        break;
      case "HIGH":
        counts.high++;
        break;
      case "MEDIUM":
        counts.medium++;
        break;
      case "LOW":
        counts.low++;
        break;
    }
  });

  return counts;
};

// Run Pipeline
const runPipeline = async (req, res) => {
  let pipeline;

  try {
    const { repoId } = req.body || {};

    if (!repoId) {
      return res.status(400).json({
        message: "repoId is required.",
      });
    }

    const repository = await Repository.findById(repoId);

    if (!repository) {
      return res.status(404).json({
        message: "Repository not found.",
      });
    }

    const startTime = new Date();

    // Create pipeline execution record
    pipeline = await Pipeline.create({
      repoId: repository._id,
      repoName: repository.repoName,
      status: "running",
      startedAt: startTime,
    });

    // Retrieve latest completed npm audit and Trivy scans
    const [npmAuditScan, trivyScan] = await Promise.all([
      Scan.findOne({
        repoId: repository._id,
        status: "completed",
        scanner: "npm-audit",
      }).sort({ createdAt: -1 }),

      Scan.findOne({
        repoId: repository._id,
        status: "completed",
        scanner: "trivy",
      }).sort({ createdAt: -1 }),
    ]);

    // Calculate individual scanner findings
    const npmCounts = countFindings(npmAuditScan);
    const trivyCounts = countFindings(trivyScan);

    // Combined findings (not necessarily unique vulnerabilities)
    const vulnerabilities = {
      total: npmCounts.total + trivyCounts.total,
      critical: npmCounts.critical + trivyCounts.critical,
      high: npmCounts.high + trivyCounts.high,
      medium: npmCounts.medium + trivyCounts.medium,
      low: npmCounts.low + trivyCounts.low,
    };

    // npm audit security gate
    const npmPassed =
      Boolean(npmAuditScan) &&
      npmCounts.critical === 0 &&
      npmCounts.high === 0;

    // Trivy security gate
    const trivyPassed =
      Boolean(trivyScan) &&
      trivyCounts.critical === 0 &&
      trivyCounts.high === 0;

    // Save vulnerability results
    pipeline.vulnerabilities = vulnerabilities;

    pipeline.scannerResults = {
      npmAudit: {
        status: !npmAuditScan
          ? "skipped"
          : npmPassed
          ? "passed"
          : "failed",
        total: npmCounts.total,
        critical: npmCounts.critical,
        high: npmCounts.high,
      },

      trivy: {
        status: !trivyScan
          ? "skipped"
          : trivyPassed
          ? "passed"
          : "failed",
        total: trivyCounts.total,
        critical: trivyCounts.critical,
        high: trivyCounts.high,
      },

      sonarQube: {
        status: "skipped",
        qualityGate: "UNKNOWN",
        bugs: 0,
        vulnerabilities: 0,
        securityHotspots: 0,
        codeSmells: 0,
      },
    };

    // SonarQube integration
    // Current test setup supports this SonarQube project only.
    const sonarProjectKey = "blog-app-mern";

    let sonarPassed = false;

    try {
      const [sonarMetrics, sonarGate] = await Promise.all([
        getSonarResults(sonarProjectKey),
        getQualityGateStatus(sonarProjectKey),
      ]);

      sonarPassed = sonarGate.status === "OK";

      pipeline.scannerResults.sonarQube = {
        status: sonarPassed ? "passed" : "failed",
        qualityGate: sonarGate.status,
        bugs: sonarMetrics.bugs,
        vulnerabilities: sonarMetrics.vulnerabilities,
        securityHotspots: sonarMetrics.securityHotspots,
        codeSmells: sonarMetrics.codeSmells,
      };
    } catch (sonarError) {
      console.error("SonarQube pipeline error:", sonarError.message);

      // Fail closed when SonarQube results cannot be retrieved
      pipeline.scannerResults.sonarQube = {
        status: "failed",
        qualityGate: "UNKNOWN",
        bugs: 0,
        vulnerabilities: 0,
        securityHotspots: 0,
        codeSmells: 0,
      };
    }

    // All three security checks must pass
    const securityPassed =
      npmPassed && trivyPassed && sonarPassed;

    pipeline.auditStatus = securityPassed
      ? "passed"
      : "failed";

    // Build and deployment are not executed at this stage
    pipeline.buildStatus = "skipped";
    pipeline.deploymentStatus = "skipped";

    // Existing schema uses success for a passed security gate.
    // Real build execution will be added later.
    pipeline.status = securityPassed ? "success" : "failed";

    pipeline.completedAt = new Date();
    pipeline.duration =
      pipeline.completedAt.getTime() - startTime.getTime();

    await pipeline.save();

    return res.status(201).json({
      message: securityPassed
        ? "Security gate passed. Build and deployment not executed."
        : "Pipeline blocked by security gate.",
      data: pipeline,
    });
  } catch (error) {
    console.error("Pipeline Error:", error);

    if (pipeline) {
      try {
        pipeline.status = "failed";
        pipeline.auditStatus = "failed";
        pipeline.buildStatus = "skipped";
        pipeline.deploymentStatus = "skipped";
        pipeline.completedAt = new Date();

        if (pipeline.startedAt) {
          pipeline.duration =
            pipeline.completedAt.getTime() -
            pipeline.startedAt.getTime();
        }

        await pipeline.save();
      } catch (saveError) {
        console.error(
          "Failed to save pipeline error state:",
          saveError.message
        );
      }
    }

    return res.status(500).json({
      message: "Pipeline execution failed.",
      error: error.message,
    });
  }
};

// Get Pipeline History
const getPipelines = async (req, res) => {
  try {
    const pipelines = await Pipeline.find()
      .populate("repoId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Pipelines fetched successfully.",
      data: pipelines,
    });
  } catch (error) {
    console.error("Get Pipelines Error:", error);

    return res.status(500).json({
      message: "Failed to fetch pipelines.",
      error: error.message,
    });
  }
};

module.exports = {
  runPipeline,
  getPipelines,
};
