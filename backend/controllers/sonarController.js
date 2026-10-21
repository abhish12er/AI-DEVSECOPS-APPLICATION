
const {
  getSonarResults,
  getQualityGateStatus,
} = require("../services/sonarService");

const getSonarProjectResults = async (req, res) => {
  try {
    const projectKey = "blog-app-mern";

    const [metrics, qualityGate] = await Promise.all([
      getSonarResults(projectKey),
      getQualityGateStatus(projectKey),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        projectKey,
        qualityGate: qualityGate.status,
        metrics,
      },
    });
  } catch (error) {
    console.error(
      "SonarQube API error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve SonarQube results",
    });
  }
};

module.exports = {
  getSonarProjectResults,
};
