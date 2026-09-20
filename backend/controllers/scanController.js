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
    console.log(`Running command: ${command}`);
    console.log(`Directory: ${cwd}`);

    exec(
      command,
      {
        cwd,
        shell: true,
        maxBuffer: 20 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (stdout) {
          console.log("Command stdout:");
          console.log(stdout);
        }

        if (stderr) {
          console.log("Command stderr:");
          console.log(stderr);
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
  console.log("----------------------------------------");
  console.log(`Starting npm audit in: ${repoPath}`);

  try {
    // --------------------------------------------------
    // CHECK FOR PACKAGE LOCK
    // --------------------------------------------------

    const lockFile = path.join(
      repoPath,
      "package-lock.json"
    );

    if (!fs.existsSync(lockFile)) {
      console.log(
        "package-lock.json not found."
      );

      console.log(
        "Generating package-lock.json..."
      );

      try {
        await runCommand(
          "npm.cmd install --package-lock-only --ignore-scripts",
          repoPath
        );

        console.log(
          "package-lock.json generated successfully."
        );
      } catch (installError) {
        console.error(
          "Failed to generate package-lock.json:"
        );

        console.error(
          installError.message
        );

        throw new Error(
          "Could not generate package-lock.json"
        );
      }
    } else {
      console.log(
        "package-lock.json already exists."
      );
    }


    // --------------------------------------------------
    // RUN NPM AUDIT
    // --------------------------------------------------

    console.log(
      "Running npm audit..."
    );

    return await new Promise(
      (resolve, reject) => {

        exec(
          "npm.cmd audit --json",
          {
            cwd: repoPath,
            shell: true,
            maxBuffer: 20 * 1024 * 1024,
          },

          (error, stdout, stderr) => {

            console.log(
              `npm audit finished in: ${repoPath}`
            );

            console.log(
              "Exit error:",
              error?.message || "none"
            );

            if (stderr) {
              console.log(
                "npm audit stderr:"
              );

              console.log(stderr);
            }

            console.log(
              "npm audit stdout length:",
              stdout?.length || 0
            );


            // ------------------------------------------------
            // NO OUTPUT
            // ------------------------------------------------

            if (
              !stdout ||
              !stdout.trim()
            ) {
              reject(
                new Error(
                  stderr?.trim() ||
                  error?.message ||
                  "npm audit returned no output"
                )
              );

              return;
            }


            // ------------------------------------------------
            // PARSE JSON
            // ------------------------------------------------

            try {

              const result =
                JSON.parse(stdout);


              // npm may return an error object
              // instead of actual audit results.

              if (
                result.error &&
                result.error.code
              ) {
                reject(
                  new Error(
                    result.error.summary ||
                    result.error.detail ||
                    result.error.code
                  )
                );

                return;
              }


              console.log(
                "npm audit JSON parsed successfully"
              );

              resolve(result);

            } catch (parseError) {

              console.error(
                "Unable to parse npm audit JSON."
              );

              console.error(
                "Raw output:"
              );

              console.error(stdout);

              reject(
                new Error(
                  "Unable to parse npm audit results"
                )
              );
            }
          }
        );
      }
    );

  } catch (error) {

    console.error(
      `npm audit failed in ${repoPath}:`,
      error.message
    );

    throw error;
  }
};


// ======================================================
// FIND PACKAGE.JSON FILES
// ======================================================

const findPackageJsonFiles = (directory) => {

  const packageDirectories = [];

  const ignoredFolders = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    ".vite",
    "coverage",
  ]);


  const scanDirectory = (
    currentDirectory
  ) => {

    let entries;

    try {

      entries = fs.readdirSync(
        currentDirectory,
        {
          withFileTypes: true,
        }
      );

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

        if (
          ignoredFolders.has(
            entry.name
          )
        ) {
          continue;
        }

        scanDirectory(fullPath);
      }


      if (
        entry.isFile() &&
        entry.name.toLowerCase() ===
          "package.json"
      ) {

        packageDirectories.push(
          path.dirname(fullPath)
        );
      }
    }
  };


  scanDirectory(directory);

  return packageDirectories;
};



// ======================================================
// CONVERT AUDIT RESULTS
// ======================================================

const convertAuditResults = (
  auditData,
  projectPath
) => {
  const findings = [];

  if (
    !auditData ||
    !auditData.vulnerabilities
  ) {
    return findings;
  }

  const vulnerabilities =
    auditData.vulnerabilities;

  Object.entries(
    vulnerabilities
  ).forEach(
    ([packageName, vulnerability]) => {

      // --------------------------------------------------
      // SEVERITY
      // --------------------------------------------------

      let severity = "LOW";

      const npmSeverity =
        vulnerability.severity?.toLowerCase();

      if (npmSeverity === "critical") {
        severity = "CRITICAL";
      } else if (npmSeverity === "high") {
        severity = "HIGH";
      } else if (
        npmSeverity === "moderate" ||
        npmSeverity === "medium"
      ) {
        severity = "MEDIUM";
      } else if (npmSeverity === "low") {
        severity = "LOW";
      }


      // --------------------------------------------------
      // PROJECT NAME
      // --------------------------------------------------

      const projectName =
        path.basename(projectPath);


      // --------------------------------------------------
      // FIX INFORMATION
      // --------------------------------------------------

      const fixAvailable =
        vulnerability.fixAvailable;

      let hasFix = false;
      let fixVersion = "N/A";

      if (
        fixAvailable === true
      ) {
        hasFix = true;
      }

      if (
        typeof fixAvailable === "object" &&
        fixAvailable !== null
      ) {
        hasFix = true;

        if (
          fixAvailable.version
        ) {
          fixVersion =
            fixAvailable.version;
        }
      }


      // --------------------------------------------------
      // VULNERABLE VERSION
      // --------------------------------------------------

      const affectedVersion =
        vulnerability.range ||
        "N/A";


      // --------------------------------------------------
      // VIA / ADVISORIES
      // --------------------------------------------------

      const via =
        Array.isArray(
          vulnerability.via
        )
          ? vulnerability.via
          : [];


      const advisories =
        via.filter(
          (item) =>
            typeof item === "object" &&
            item !== null
        );


      // --------------------------------------------------
      // CREATE FINDINGS
      // --------------------------------------------------

      if (
        advisories.length > 0
      ) {

        advisories.forEach(
          (advisory) => {

            const advisoryUrl =
              advisory.url ||
              "N/A";

            const cve =
              advisory.cve ||
              "N/A";

            const score =
              advisory.cvss?.score ??
              vulnerability.cvss?.score ??
              0;

            const title =
              advisory.title ||
              `${packageName} has a security vulnerability`;

            let recommendation =
              `Update ${packageName} to a secure version.`;

            if (
              hasFix &&
              fixVersion !== "N/A"
            ) {
              recommendation =
                `Update ${packageName} to version ${fixVersion} or later.`;
            } else if (
              hasFix
            ) {
              recommendation =
                `Update ${packageName} to the latest secure version.`;
            }

            findings.push({
              packageName,

              project:
                projectName,

              title,

              severity,

              cve,

              advisory:
                advisoryUrl,

              score,

              affectedVersion,

              fixAvailable:
                hasFix,

              fixVersion,

              recommendation,
            });
          }
        );


      // --------------------------------------------------
      // FALLBACK WHEN NO ADVISORY OBJECT EXISTS
      // --------------------------------------------------

      } else {

        let recommendation =
          `Update ${packageName} to a secure version.`;

        if (
          hasFix &&
          fixVersion !== "N/A"
        ) {
          recommendation =
            `Update ${packageName} to version ${fixVersion} or later.`;
        } else if (
          hasFix
        ) {
          recommendation =
            `Update ${packageName} to the latest secure version.`;
        }

        findings.push({
          packageName,

          project:
            projectName,

          title:
            `${packageName} has a security vulnerability`,

          severity,

          cve: "N/A",

          advisory: "N/A",

          score:
            vulnerability.cvss?.score ??
            0,

          affectedVersion,

          fixAvailable:
            hasFix,

          fixVersion,

          recommendation,
        });
      }
    }
  );

  return findings;
};




// ======================================================
// RUN SECURITY SCAN
// ======================================================

const runScan = async (
  req,
  res
) => {

  let tempDir = null;


  try {

    const { repoId } =
      req.body;


    console.log(
      "========================================"
    );

    console.log(
      "Starting security scan for:",
      repoId
    );

    console.log(
      "========================================"
    );


    // --------------------------------------------------
    // VALIDATE REPO ID
    // --------------------------------------------------

    if (!repoId) {

      return res.status(400).json({
        message:
          "repoId is required",
      });
    }


    // --------------------------------------------------
    // FIND REPOSITORY
    // --------------------------------------------------

    const repository =
      await Repository.findById(
        repoId
      );


    if (!repository) {

      return res.status(404).json({
        message:
          "Repository not found",
      });
    }


    console.log(
      "Repository:",
      repository.repoUrl
    );


    // --------------------------------------------------
    // CREATE TEMP DIRECTORY
    // --------------------------------------------------

    tempDir =
      fs.mkdtempSync(
        path.join(
          os.tmpdir(),
          "devsecops-"
        )
      );


    console.log(
      "Cloning repository into:",
      tempDir
    );


    // --------------------------------------------------
    // CLONE REPOSITORY
    // --------------------------------------------------

    const git =
      simpleGit();


    await git.clone(
      repository.repoUrl,
      tempDir
    );


    console.log(
      "Repository cloned successfully"
    );


    // --------------------------------------------------
    // FIND PACKAGE.JSON FILES
    // --------------------------------------------------

    const packageDirectories =
      findPackageJsonFiles(
        tempDir
      );


    console.log(
      "Found package.json files:",
      packageDirectories
    );


    // --------------------------------------------------
    // NO NODE PROJECT
    // --------------------------------------------------

    if (
      packageDirectories.length ===
      0
    ) {

      const scan =
        await Scan.create({

          repoId:
            repository._id,

          status:
            "completed",

          findings: [],
        });


      return res.status(200).json({

        message:
          "Scan completed. No Node.js projects found.",

        scan,

        vulnerabilities: 0,
      });
    }


    // --------------------------------------------------
    // RUN AUDITS
    // --------------------------------------------------

    let allFindings = [];

    let successfulAudits = 0;

    let failedAudits = 0;


    for (
      const projectPath of
        packageDirectories
    ) {

      console.log(
        "----------------------------------------"
      );

      console.log(
        "Running npm audit in:",
        projectPath
      );


      try {

        const auditResult =
          await runNpmAudit(
            projectPath
          );


        const findings =
          convertAuditResults(
            auditResult,
            projectPath
          );


        allFindings =
          allFindings.concat(
            findings
          );


        successfulAudits++;


        console.log(
          `Found ${findings.length} vulnerabilities in ${projectPath}`
        );


      } catch (error) {

        failedAudits++;


        console.error(
          `Audit failed for ${projectPath}:`,
          error.message
        );
      }
    }


    // --------------------------------------------------
    // SUMMARY
    // --------------------------------------------------

    console.log(
      "========================================"
    );

    console.log(
      "Scan Summary"
    );

    console.log(
      "Successful audits:",
      successfulAudits
    );

    console.log(
      "Failed audits:",
      failedAudits
    );

    console.log(
      "Total vulnerabilities found:",
      allFindings.length
    );

    console.log(
      "========================================"
    );


    // --------------------------------------------------
    // ALL AUDITS FAILED
    // --------------------------------------------------

    if (
      successfulAudits === 0 &&
      failedAudits > 0
    ) {

      const failedScan =
        await Scan.create({

          repoId:
            repository._id,

          status:
            "failed",

          findings: [],
        });


      return res.status(500).json({

        message:
          "Security scan failed. npm audit could not run successfully.",

        scan:
          failedScan,
      });
    }


    // --------------------------------------------------
    // SAVE COMPLETED SCAN
    // --------------------------------------------------

    const scan =
      await Scan.create({

        repoId:
          repository._id,

        status:
          "completed",

        findings:
          allFindings,
      });


    console.log(
      "Scan saved successfully:",
      scan._id
    );


    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return res.status(200).json({

      message:
        "Security scan completed successfully",

      scan,

      vulnerabilities:
        allFindings.length,

      successfulAudits,

      failedAudits,
    });


  } catch (error) {

    console.error(
      "SCAN ERROR:",
      error
    );


    // --------------------------------------------------
    // SAVE FAILED SCAN
    // --------------------------------------------------

    try {

      if (
        req.body?.repoId
      ) {

        await Scan.create({

          repoId:
            req.body.repoId,

          status:
            "failed",

          findings: [],
        });
      }

    } catch (dbError) {

      console.error(
        "Failed to save failed scan:",
        dbError.message
      );
    }


    return res.status(500).json({

      message:
        error.message ||
        "Security scan failed",
    });


  } finally {

    // --------------------------------------------------
    // DELETE TEMP DIRECTORY
    // --------------------------------------------------

    if (tempDir) {

      try {

        fs.rmSync(
          tempDir,
          {
            recursive: true,
            force: true,
          }
        );


        console.log(
          "Temporary repository removed"
        );


      } catch (cleanupError) {

        console.error(
          "Failed to remove temporary repository:",
          cleanupError.message
        );
      }
    }
  }
};


// ======================================================
// GET SCANS
// ======================================================

const getScans = async (
  req,
  res
) => {

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


    return res.status(200).json(
      scans
    );


  } catch (error) {

    console.error(
      "GET SCANS ERROR:",
      error
    );


    return res.status(500).json({

      message:
        "Failed to fetch scans",
    });
  }
};


// ======================================================
// SECURITY ANALYSIS
// ======================================================

const analyzeSecurity = async (
  req,
  res
) => {

  try {

    const scans =
      await Scan.find()
        .sort({
          createdAt: -1,
        });


    if (
      scans.length === 0
    ) {

      return res.status(200).json({

        totalScans: 0,

        totalVulnerabilities: 0,

        high: 0,

        medium: 0,

        low: 0,

        recommendations: [],
      });
    }


    // --------------------------------------------------
    // LATEST SCAN
    // --------------------------------------------------

    const latestScan =
      scans[0];


    const findings =
      latestScan.findings ||
      [];


    let high = 0;

    let medium = 0;

    let low = 0;


    // --------------------------------------------------
    // COUNT SEVERITIES
    // --------------------------------------------------

    findings.forEach(
      (finding) => {

        const severity =
          finding.severity?.toUpperCase();


        if (
          severity === "HIGH"
        ) {

          high++;

        } else if (
          severity === "MEDIUM"
        ) {

          medium++;

        } else {

          low++;
        }
      }
    );


    // --------------------------------------------------
    // RECOMMENDATIONS
    // --------------------------------------------------

    const recommendations =
      [];


    if (high > 0) {

      recommendations.push(
        "Immediately update or patch packages with HIGH severity vulnerabilities."
      );
    }


    if (medium > 0) {

      recommendations.push(
        "Review and update packages with MEDIUM severity vulnerabilities."
      );
    }


    if (low > 0) {

      recommendations.push(
        "Review LOW severity vulnerabilities during dependency maintenance."
      );
    }


    if (
      findings.length === 0
    ) {

      recommendations.push(
        "No vulnerabilities were detected by npm audit."
      );
    }


    return res.status(200).json({

      totalScans:
        scans.length,

      totalVulnerabilities:
        findings.length,

      high,

      medium,

      low,

      recommendations,
    });


  } catch (error) {

    console.error(
      "SECURITY ANALYSIS ERROR:",
      error
    );


    return res.status(500).json({

      message:
        "Failed to analyze security",
    });
  }
};


// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  runScan,
  getScans,
  analyzeSecurity,
};