require("dotenv").config();

const {
  getQualityGateStatus,
} = require("./services/sonarService");

async function testQualityGate() {
  try {
    const result = await getQualityGateStatus("blog-app-mern");

    console.log("SonarQube Quality Gate:");
    console.log(result);
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

testQualityGate();