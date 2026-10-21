const {
  runSonarScanner,
} = require("./sonarScannerService");

const {
  getSonarResults,
  getQualityGateStatus,
} = require("./sonarService");

const runSonarAnalysis = async (repoPath, projectKey) => {
  try {
    console.log("\n========== SONARQUBE ANALYSIS ==========");

    // 1. Run real SonarQube scan
    const scannerResult = await runSonarScanner(
      repoPath,
      projectKey
    );

    // 2. Scanner service already waits until SonarQube
    // finishes processing, so these are fresh results.
    const metrics = await getSonarResults(projectKey);

    // 3. Get real Quality Gate result
    const qualityGate =
      await getQualityGateStatus(projectKey);

    const result = {
      success: true,

      projectKey,

      taskId: scannerResult.taskId,
      analysisId: scannerResult.analysisId,

      qualityGate: qualityGate.status,

      metrics: {
        bugs: metrics.bugs,
        vulnerabilities: metrics.vulnerabilities,
        securityHotspots: metrics.securityHotspots,
        codeSmells: metrics.codeSmells,
        coverage: metrics.coverage,
        duplicatedLinesDensity:
          metrics.duplicatedLinesDensity,
      },
    };

    console.log("\nSonarQube Final Results:");
    console.log(result);

    return result;
  } catch (error) {
    console.error(
      "SonarQube analysis failed:",
      error.message
    );

    throw new Error(
      "Complete SonarQube analysis failed"
    );
  }
};

module.exports = {
  runSonarAnalysis,
};