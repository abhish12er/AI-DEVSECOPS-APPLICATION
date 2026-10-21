require("dotenv").config();

const { runSonarScanner } = require("./services/sonarScannerService");

async function testScanner() {
  try {
    const repoPath =
      "C:\\Users\\Dell\\Desktop\\Blog-App-using-MERN-stack";

    const projectKey = "blog-app-mern";

    const result = await runSonarScanner(repoPath, projectKey);

    console.log("Scanner Result:");
    console.log(result);
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

testScanner();