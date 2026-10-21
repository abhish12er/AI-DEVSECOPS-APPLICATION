const { execFile } = require("child_process");
const path = require("path");
const axios = require("axios");

const SONAR_URL = process.env.SONAR_URL || "http://localhost:9000";
const SONAR_TOKEN = process.env.SONAR_TOKEN;

// Small delay helper
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Wait until SonarQube finishes processing the uploaded analysis
const waitForSonarProcessing = async (taskId) => {
  const maxAttempts = 30;
  const delay = 2000;

  console.log("Waiting for SonarQube to process the analysis...");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.get(
        `${SONAR_URL}/api/ce/task`,
        {
          params: {
            id: taskId,
          },
          auth: {
            username: SONAR_TOKEN,
            password: "",
          },
        }
      );

      const status = response.data?.task?.status;

      console.log(
        `SonarQube processing status (${attempt}/${maxAttempts}):`,
        status
      );

      if (status === "SUCCESS") {
        console.log("SonarQube report processing completed.");

        return {
          success: true,
          status,
          analysisId: response.data?.task?.analysisId || null,
        };
      }

      if (status === "FAILED" || status === "CANCELED") {
        throw new Error(
          `SonarQube report processing ended with status: ${status}`
        );
      }

      await sleep(delay);
    } catch (error) {
      if (
        error.message.includes("FAILED") ||
        error.message.includes("CANCELED")
      ) {
        throw error;
      }

      console.error(
        "Error checking SonarQube processing status:",
        error.response?.data || "Unable to check processing status"
      );

      throw new Error(
        "Failed to check SonarQube report processing status"
      );
    }
  }

  throw new Error(
    "Timed out waiting for SonarQube report processing"
  );
};

// Run SonarScanner inside Docker
const runSonarScanner = (repoPath, projectKey) => {
  return new Promise((resolve, reject) => {
    if (!SONAR_TOKEN) {
      return reject(
        new Error("SONAR_TOKEN is missing from .env")
      );
    }

    if (!repoPath) {
      return reject(
        new Error("Repository path is required")
      );
    }

    if (!projectKey) {
      return reject(
        new Error("SonarQube project key is required")
      );
    }

    const absoluteRepoPath = path.resolve(repoPath);

    console.log("Starting SonarQube analysis...");
    console.log("Project Key:", projectKey);
    console.log("Repository:", absoluteRepoPath);

    const args = [
      "run",
      "--rm",

      "-e",
      "SONAR_HOST_URL=http://host.docker.internal:9000",

      "-e",
      `SONAR_TOKEN=${SONAR_TOKEN}`,

      "-v",
      `${absoluteRepoPath}:/usr/src`,

      "sonarsource/sonar-scanner-cli",

      `-Dsonar.projectKey=${projectKey}`,
      "-Dsonar.sources=.",
      "-Dsonar.exclusions=**/node_modules/**,**/dist/**,**/build/**",
    ];

    const scanner = execFile(
      "docker",
      args,
      {
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
      },

      async (error, stdout, stderr) => {
        if (stdout) {
          console.log(stdout);
        }

        /*
         * IMPORTANT:
         * Do not print error.message here.
         *
         * Node may include the complete Docker command
         * inside error.message, which can expose SONAR_TOKEN.
         */

        if (error) {
          console.error(
            "SonarScanner failed. Docker/SonarScanner exited with an error."
          );

          return reject(
            new Error("SonarQube analysis failed")
          );
        }

        try {
          /*
           * SonarScanner prints a Compute Engine task URL
           * after successfully uploading the report.
           *
           * Example:
           * /api/ce/task?id=XXXXXXXX
           */

          const taskMatch = stdout.match(
            /api\/ce\/task\?id=([A-Za-z0-9_-]+)/
          );

          if (!taskMatch) {
            return reject(
              new Error(
                "Could not find SonarQube processing task ID"
              )
            );
          }

          const taskId = taskMatch[1];

          console.log(
            "SonarQube Task ID:",
            taskId
          );

          // Wait for SonarQube server to finish processing
          const processingResult =
            await waitForSonarProcessing(taskId);

          console.log(
            "SonarQube analysis completed and processed successfully."
          );

          resolve({
            success: true,
            projectKey,
            taskId,
            analysisId:
              processingResult.analysisId,
          });
        } catch (processingError) {
          /*
           * Avoid dumping unexpected error objects because
           * they could contain sensitive request information.
           */

          console.error(
            "SonarQube processing failed:",
            processingError.message
          );

          reject(
            new Error(
              "SonarQube analysis processing failed"
            )
          );
        }
      }
    );

    scanner.on("error", () => {
      /*
       * Again, do not print the complete process error
       * because the Docker arguments contain SONAR_TOKEN.
       */

      reject(
        new Error(
          "Failed to start Docker SonarScanner"
        )
      );
    });
  });
};

module.exports = {
  runSonarScanner,
  waitForSonarProcessing,
};