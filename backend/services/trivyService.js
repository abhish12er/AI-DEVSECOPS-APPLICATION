
const { execFile } = require("child_process");
const { promisify } = require("util");
const path = require("path");

const execFileAsync = promisify(execFile);

const runTrivyScan = async (repositoryPath) => {
  const absolutePath = path.resolve(repositoryPath);

  console.log("Starting Trivy scan:", absolutePath);

  const args = [
    "run",
    "--rm",
    "--mount",
    `type=bind,source=${absolutePath},target=/project,readonly`,
    "--mount",
    "type=volume,source=trivy-cache,target=/root/.cache/trivy",
    "aquasec/trivy:0.75.0",
    "fs",
    "--scanners",
    "vuln",
    "--skip-dirs",
    "node_modules",
    "--skip-dirs",
    ".git",
    "--format",
    "json",
    "/project",
  ];

  try {
    const { stdout } = await execFileAsync(
      "docker",
      args,
      {
        timeout: 600000,
        maxBuffer: 50 * 1024 * 1024,
        windowsHide: true,
      }
    );

    const report = JSON.parse(stdout);

    const findings = [];

    for (const result of report.Results || []) {
      for (const vuln of result.Vulnerabilities || []) {
        const severity = (
          vuln.Severity || "UNKNOWN"
        ).toUpperCase();

        findings.push({
          packageName: vuln.PkgName || "Unknown",
          project: result.Target || "Unknown",
          title: vuln.Title || vuln.VulnerabilityID,
          severity,
          cve: vuln.VulnerabilityID || "N/A",
          advisory:
            vuln.PrimaryURL || "N/A",
          source: "TRIVY",
          cwe: vuln.CweIDs || [],
          score:
            vuln.CVSS?.nvd?.V3Score ??
            vuln.CVSS?.nvd?.V2Score ??
            0,
          affectedVersion:
            vuln.InstalledVersion || "N/A",
          fixAvailable: Boolean(vuln.FixedVersion),
          fixVersion: vuln.FixedVersion || "N/A",
          fixIsMajor: false,
          recommendation: vuln.FixedVersion
            ? `Upgrade ${vuln.PkgName} to ${vuln.FixedVersion}.`
            : `Review ${vuln.VulnerabilityID} and check for available security updates.`,
        });
      }
    }

    console.log(
      `Trivy scan completed: ${findings.length} findings`
    );

    return findings;
  } catch (error) {
    console.error("Trivy scan failed:", error.message);
    throw error;
  }
};

module.exports = { runTrivyScan };
