const axios = require("axios");

const SONAR_URL = process.env.SONAR_URL || "http://localhost:9000";
const SONAR_TOKEN = process.env.SONAR_TOKEN;

// Get real SonarQube metrics for a project
const getSonarResults = async (projectKey) => {
  try {
    if (!SONAR_TOKEN) {
      throw new Error("SONAR_TOKEN is missing from .env");
    }

    const response = await axios.get(
      `${SONAR_URL}/api/measures/component`,
      {
        params: {
          component: projectKey,
          metricKeys:
            "bugs,vulnerabilities,security_hotspots,code_smells,coverage,duplicated_lines_density",
        },

        // SonarQube token authentication
        auth: {
          username: SONAR_TOKEN,
          password: "",
        },
      }
    );

    const measures = response.data?.component?.measures || [];

    const results = {
      bugs: 0,
      vulnerabilities: 0,
      securityHotspots: 0,
      codeSmells: 0,
      coverage: 0,
      duplicatedLinesDensity: 0,
    };

    measures.forEach((measure) => {
      const value = Number(measure.value) || 0;

      switch (measure.metric) {
        case "bugs":
          results.bugs = value;
          break;

        case "vulnerabilities":
          results.vulnerabilities = value;
          break;

        case "security_hotspots":
          results.securityHotspots = value;
          break;

        case "code_smells":
          results.codeSmells = value;
          break;

        case "coverage":
          results.coverage = value;
          break;

        case "duplicated_lines_density":
          results.duplicatedLinesDensity = value;
          break;
      }
    });

    return results;
  } catch (error) {
    console.error(
      "SonarQube error:",
      error.response?.data || error.message
    );

    throw new Error("Failed to fetch SonarQube results");
  }
};

// Get SonarQube Quality Gate status
const getQualityGateStatus = async (projectKey) => {
  try {
    if (!SONAR_TOKEN) {
      throw new Error("SONAR_TOKEN is missing from .env");
    }

    const response = await axios.get(
      `${SONAR_URL}/api/qualitygates/project_status`,
      {
        params: {
          projectKey: projectKey,
        },
        auth: {
          username: SONAR_TOKEN,
          password: "",
        },
      }
    );

    return {
      status: response.data.projectStatus.status,
    };
  } catch (error) {
    console.error(
      "SonarQube Quality Gate error:",
      error.response?.data || error.message
    );

    throw new Error("Failed to fetch SonarQube Quality Gate status");
  }
};

module.exports = {
  getSonarResults,
  getQualityGateStatus,
};