const Scan = require("../models/Scan");
const Repository = require("../models/Repository");
const simpleGit = require("simple-git");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");


// ======================================================
// RUN COMMAND
// ======================================================

const runCommand = (command, cwd) => {
  return new Promise((resolve, reject) => {
    exec(
      command,
      {
        cwd,
        shell: true,
        maxBuffer: 20 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        console.log(`\nCommand: ${command}`);
        console.log(`stdout length: ${stdout?.length || 0}`);
        console.log(`stderr length: ${stderr?.length || 0}`);

        if (stderr) {
          console.log("stderr:", stderr.substring(0, 1000));
        }

        if (error) {
          reject(error);
          return;
        }

        resolve(stdout);
      }
    );
  });
};


// ======================================================
// RUN NPM AUDIT
// ======================================================

const runNpmAudit = async (repoPath) => {
  const packageLockPath = path.join(repoPath, "package-lock.json");

  try {
    // npm audit needs package-lock.json
    if (!fs.existsSync(packageLockPath)) {
      console.log("package-lock.json not found.");
      console.log("Generating package-lock.json...");

      await runCommand(
        "npm.cmd install --package-lock-only --ignore-scripts",
        repoPath
      );
    }

    console.log("Running npm audit...");

    return await new Promise((resolve, reject) => {
      exec(
        "npm.cmd audit --json",
        {
          cwd: repoPath,
          shell: true,
          maxBuffer: 20 * 1024 * 1024,
        },
        (error, stdout, stderr) => {
          /*
           * npm audit returns a non-zero exit code when
           * vulnerabilities are found.
           *
           * Therefore, we DO NOT treat every error as
           * a failed scan.
           */

          if (!stdout) {
            console.error("npm audit produced no stdout.");
            console.error(stderr);

            reject(
              new Error("npm audit did not return any JSON output.")
            );

            return;
          }

          try {
            const auditData = JSON.parse(stdout);

            // npm may return an error object instead of
            // normal audit data
            if (auditData.error) {
              reject(
                new Error(
                  auditData.error.summary ||
                    auditData.error.detail ||
                    "npm audit returned an error."
                )
              );

              return;
            }

            resolve(auditData);
          } catch (parseError) {
            console.error("Failed to parse npm audit JSON.");
            console.error(stdout.substring(0, 2000));

            reject(
              new Error("Invalid JSON returned by npm audit.")
            );
          }
        }
      );
    });
  } catch (error) {
    throw error;
  }
};


// ======================================================
// FIND ALL PACKAGE.JSON FILES
// ======================================================

const findPackageJsonFiles = (directory) => {
  const packagePaths = [];

  const ignoredDirectories = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    ".vite",
    "coverage",
  ]);

  const scanDirectory = (currentDirectory) => {
    let entries;

    try {
      entries = fs.readdirSync(currentDirectory, {
        withFileTypes: true,
      });
    } catch (error) {
      console.error(
        `Unable to read directory ${currentDirectory}:`,
        error.message
      );

      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(
        currentDirectory,
        entry.name
      );

      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) {
          scanDirectory(fullPath);
        }
      } else if (
        entry.isFile() &&
        entry.name === "package.json"
      ) {
        packagePaths.push(fullPath);
      }
    }
  };

  scanDirectory(directory);

  return packagePaths;
};


// ======================================================
// MAP NPM SEVERITY
// ======================================================

const mapSeverity = (severity) => {
  switch ((severity || "").toLowerCase()) {
    case "critical":
      return "CRITICAL";

    case "high":
      return "HIGH";

    case "moderate":
    case "medium":
      return "MEDIUM";

    case "low":
      return "LOW";

    default:
      return "LOW";
  }
};


// ======================================================
// GET FIX INFORMATION
// ======================================================

const getFixInformation = (fixAvailable) => {
  let hasFix = false;
  let fixVersion = "N/A";
  let fixIsMajor = false;

  if (fixAvailable === true) {
    hasFix = true;
  }

  if (
    fixAvailable &&
    typeof fixAvailable === "object"
  ) {
    hasFix = true;

    if (fixAvailable.version) {
      fixVersion = String(fixAvailable.version);
    }

    if (fixAvailable.isSemVerMajor === true) {
      fixIsMajor = true;
    }
  }

  return {
    hasFix,
    fixVersion,
    fixIsMajor,
  };
};


// ======================================================
// CREATE REMEDIATION MESSAGE
// ======================================================

const createRecommendation = ({
  packageName,
  hasFix,
  fixVersion,
  fixIsMajor,
}) => {
  if (hasFix && fixVersion !== "N/A") {
    if (fixIsMajor) {
      return `Upgrade ${packageName} to ${fixVersion}. npm reports that this fix may introduce a breaking change.`;
    }

    return `Upgrade ${packageName} to ${fixVersion} or later.`;
  }

  if (hasFix) {
    return `npm audit reports that a fix is available for ${packageName}. Upgrade to a secure version.`;
  }

  return `No automatic fix is currently reported by npm audit. Review the advisory and consider upgrading, replacing, or removing the dependency.`;
};


// ======================================================
// GET ADVISORY IDENTIFIER
// ======================================================

const getAdvisoryIdentifier = (
  advisory,
  packageName,
  vulnerability
) => {
  /*
   * Prefer npm's advisory source ID.
   */

  if (advisory?.source) {
    return `source:${advisory.source}`;
  }

  /*
   * Otherwise use CVE.
   */

  if (advisory?.cve) {
    return `cve:${advisory.cve}`;
  }

  /*
   * Otherwise use advisory URL.
   */

  if (advisory?.url) {
    return `url:${advisory.url}`;
  }

  /*
   * Last fallback for advisory objects that do not
   * contain source/CVE/URL.
   */

  return `title:${advisory?.title || "unknown"}|range:${
    advisory?.range || vulnerability?.range || "N/A"
  }|package:${packageName}`;
};


// ======================================================
// CONVERT NPM AUDIT RESULTS
// ======================================================

const convertAuditResults = (
  auditData,
  projectPath
) => {
  const findings = [];

  const vulnerabilities =
    auditData?.vulnerabilities || {};

  const projectName =
    path.basename(projectPath);

  /*
   * Prevent duplicate advisory records inside
   * the same project.
   */

  const seenFindings = new Set();

  for (const [
    packageName,
    vulnerability,
  ] of Object.entries(vulnerabilities)) {
    const severity = mapSeverity(
      vulnerability.severity
    );

    const affectedVersion =
      vulnerability.range || "N/A";

    const {
      hasFix,
      fixVersion,
      fixIsMajor,
    } = getFixInformation(
      vulnerability.fixAvailable
    );

    const via = Array.isArray(
      vulnerability.via
    )
      ? vulnerability.via
      : [];

    /*
     * npm's "via" can contain:
     *
     * 1. Advisory objects
     * 2. Strings representing dependency causes
     *
     * We only create security findings from
     * actual advisory objects.
     */

    const advisories = via.filter(
      (item) =>
        item &&
        typeof item === "object"
    );

    // ==================================================
    // REAL ADVISORY OBJECTS
    // ==================================================

    if (advisories.length > 0) {
      for (const advisory of advisories) {
        const advisoryId =
          getAdvisoryIdentifier(
            advisory,
            packageName,
            vulnerability
          );

        /*
         * Include project so that the same advisory
         * in two separate projects is not incorrectly
         * merged.
         */

        const findingKey =
          `${projectName}|${packageName}|${advisoryId}`;

        if (seenFindings.has(findingKey)) {
          continue;
        }

        seenFindings.add(findingKey);

        const advisoryUrl =
          advisory.url || "N/A";

        const cve =
          advisory.cve || "N/A";

        const score =
          advisory.cvss?.score ??
          vulnerability.cvss?.score ??
          0;

        const title =
          advisory.title ||
          `${packageName} has a security vulnerability`;

        const source =
          advisory.source
            ? String(advisory.source)
            : "N/A";

        const cwe = Array.isArray(
          advisory.cwe
        )
          ? advisory.cwe.map(String)
          : [];

        const recommendation =
          createRecommendation({
            packageName,
            hasFix,
            fixVersion,
            fixIsMajor,
          });

        findings.push({
          packageName,

          project: projectName,

          title,

          severity,

          cve,

          advisory: advisoryUrl,

          source,

          cwe,

          score,

          affectedVersion,

          fixAvailable: hasFix,

          fixVersion,

          fixIsMajor,

          recommendation,
        });
      }
    }

    // ==================================================
    // FALLBACK
    // ==================================================

    /*
     * Sometimes npm reports a vulnerable package
     * without an advisory object.
     *
     * We still keep the vulnerability because it
     * came from npm audit, but we do NOT invent
     * a CVE or advisory URL.
     */

    else {
      const fallbackKey =
        `${projectName}|${packageName}|${affectedVersion}`;

      if (seenFindings.has(fallbackKey)) {
        continue;
      }

      seenFindings.add(fallbackKey);

      const score =
        vulnerability.cvss?.score ?? 0;

      findings.push({
        packageName,

        project: projectName,

        title: `${packageName} has a security vulnerability`,

        severity,

        cve: "N/A",

        advisory: "N/A",

        source: "N/A",

        cwe: [],

        score,

        affectedVersion,

        fixAvailable: hasFix,

        fixVersion,

        fixIsMajor,

        recommendation:
          createRecommendation({
            packageName,
            hasFix,
            fixVersion,
            fixIsMajor,
          }),
      });
    }
  }

  return findings;
};


// ======================================================
// RUN SECURITY SCAN
// ======================================================

const runScan = async (req, res) => {
  const { repoId } = req.body;

  if (!repoId) {
    return res.status(400).json({
      message: "repoId is required",
    });
  }

  let tempDir;

  try {
    // ================================================
    // GET REPOSITORY
    // ================================================

    const repository =
      await Repository.findById(repoId);

    if (!repository) {
      return res.status(404).json({
        message: "Repository not found",
      });
    }

    // ================================================
    // CREATE TEMP DIRECTORY
    // ================================================

    tempDir = path.join(
      os.tmpdir(),
      `devsecops-scan-${Date.now()}`
    );

    console.log("\n=================================");
    console.log("STARTING SECURITY SCAN");
    console.log("Repository:", repository.repoUrl);
    console.log("Temp directory:", tempDir);
    console.log("=================================\n");

    // ================================================
    // CLONE REPOSITORY
    // ================================================

    await simpleGit().clone(
      repository.repoUrl,
      tempDir
    );

    console.log("Repository cloned successfully.");


    // ================================================
    // FIND PROJECTS
    // ================================================

    const packageJsonFiles =
      findPackageJsonFiles(tempDir);

    console.log(
      `Found ${packageJsonFiles.length} package.json file(s).`
    );

    // ================================================
    // NO NODE PROJECT
    // ================================================

    if (packageJsonFiles.length === 0) {
      const scan = await Scan.create({
        repoId: repository._id,

        repoName:
          repository.repoName,

        status: "completed",

        findings: [],
      });

      return res.status(200).json({
        message:
          "Scan completed. No package.json files found.",

        data: scan,
      });
    }


    // ================================================
    // RUN AUDIT FOR EACH PROJECT
    // ================================================

    let allFindings = [];

    let successfulAudits = 0;

    let failedAudits = 0;

    for (const packageJsonPath of packageJsonFiles) {
      const projectPath =
        path.dirname(packageJsonPath);

      console.log(
        "\n---------------------------------"
      );

      console.log(
        "Scanning project:",
        projectPath
      );

      console.log(
        "---------------------------------\n"
      );

      try {
        const auditData =
          await runNpmAudit(projectPath);

        const findings =
          convertAuditResults(
            auditData,
            projectPath
          );

        allFindings =
          allFindings.concat(findings);

        successfulAudits++;

        console.log(
          `Audit completed. Findings: ${findings.length}`
        );
      } catch (error) {
        failedAudits++;

        console.error(
          `Audit failed for ${projectPath}:`,
          error.message
        );
      }
    }


    // ================================================
    // ALL AUDITS FAILED
    // ================================================

    if (
      successfulAudits === 0 &&
      failedAudits > 0
    ) {
      const failedScan =
        await Scan.create({
          repoId: repository._id,

          repoName:
            repository.repoName,

          status: "failed",

          findings: [],
        });

      return res.status(500).json({
        message:
          "Security scan failed for all detected projects.",

        data: failedScan,
      });
    }


    // ================================================
    // SAVE SCAN
    // ================================================

    const scan =
      await Scan.create({
        repoId: repository._id,

        repoName:
          repository.repoName,

        status: "completed",

        findings: allFindings,
      });


    // ================================================
    // RESULT SUMMARY
    // ================================================

    const summary = {
      totalFindings:
        allFindings.length,

      critical:
        allFindings.filter(
          (f) => f.severity === "CRITICAL"
        ).length,

      high:
        allFindings.filter(
          (f) => f.severity === "HIGH"
        ).length,

      medium:
        allFindings.filter(
          (f) => f.severity === "MEDIUM"
        ).length,

      low:
        allFindings.filter(
          (f) => f.severity === "LOW"
        ).length,

      projectsScanned:
        successfulAudits,

      projectsFailed:
        failedAudits,
    };


    console.log("\n=================================");
    console.log("SCAN COMPLETED");
    console.log("Summary:", summary);
    console.log("=================================\n");


    return res.status(200).json({
      message: "Security scan completed successfully.",

      data: scan,

      summary,
    });
  } catch (error) {
    console.error(
      "Security scan error:",
      error
    );

    return res.status(500).json({
      message:
        "Security scan failed.",

      error:
        error.message,
    });
  } finally {
    // ================================================
    // CLEAN TEMP DIRECTORY
    // ================================================

    if (
      tempDir &&
      fs.existsSync(tempDir)
    ) {
      try {
        fs.rmSync(tempDir, {
          recursive: true,
          force: true,
        });

        console.log(
          "Temporary scan directory removed."
        );
      } catch (cleanupError) {
        console.error(
          "Failed to remove temp directory:",
          cleanupError.message
        );
      }
    }
  }
};


// ======================================================
// GET ALL SCANS
// ======================================================

const getScans = async (req, res) => {
  try {
    const scans =
      await Scan.find()
        .populate({
          path: "repoId",
          model: "Repository",
        })
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      message: "Scans fetched successfully.",

      data: scans,
    });
  } catch (error) {
    console.error(
      "Get scans error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch scans.",

      error:
        error.message,
    });
  }
};


// ======================================================
// SECURITY ANALYSIS
// ======================================================

const analyzeSecurity = async (req, res) => {
  try {
    const scans =
      await Scan.find({
        status: "completed",
      })
        .sort({
          createdAt: -1,
        });

    /*
     * Keep only the latest completed scan
     * for each repository.
     */

    const latestScansByRepo =
      new Map();

    for (const scan of scans) {
      const repoKey =
        scan.repoId?.toString();

      if (!repoKey) {
        continue;
      }

      if (
        !latestScansByRepo.has(repoKey)
      ) {
        latestScansByRepo.set(
          repoKey,
          scan
        );
      }
    }

    const latestScans =
      Array.from(
        latestScansByRepo.values()
      );

    const findings =
      latestScans.flatMap(
        (scan) =>
          scan.findings || []
      );

    const critical =
      findings.filter(
        (f) =>
          f.severity === "CRITICAL"
      );

    const high =
      findings.filter(
        (f) =>
          f.severity === "HIGH"
      );

    const medium =
      findings.filter(
        (f) =>
          f.severity === "MEDIUM"
      );

    const low =
      findings.filter(
        (f) =>
          f.severity === "LOW"
      );


    return res.status(200).json({
      message:
        "Security analysis completed.",

      data: {
        repositoriesScanned:
          latestScans.length,

        totalFindings:
          findings.length,

        severity: {
          critical:
            critical.length,

          high:
            high.length,

          medium:
            medium.length,

          low:
            low.length,
        },

        recommendations:
          findings
            .filter(
              (finding) =>
                finding.recommendation
            )
            .slice(0, 10)
            .map(
              (finding) => ({
                packageName:
                  finding.packageName,

                severity:
                  finding.severity,

                recommendation:
                  finding.recommendation,
              })
            ),
      },
    });
  } catch (error) {
    console.error(
      "Security analysis error:",
      error
    );

    return res.status(500).json({
      message:
        "Security analysis failed.",

      error:
        error.message,
    });
  }
};


module.exports = {
  runScan,
  getScans,
  analyzeSecurity,
};
