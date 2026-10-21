require("dotenv").config();

const {
  runSonarAnalysis,
} = require("./services/sonarAnalysisService");

async function test() {
  try {
    const repoPath =
      "C:\\Users\\Dell\\Desktop\\Blog-App-using-MERN-stack";

    const projectKey = "blog-app-mern";

    const result = await runSonarAnalysis(
      repoPath,
      projectKey
    );

    console.log("\n========== TEST RESULT ==========");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

test();