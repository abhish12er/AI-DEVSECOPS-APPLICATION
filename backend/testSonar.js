require("dotenv").config();

const { getSonarResults } = require("./services/sonarService");

async function testSonar() {
  try {
    const results = await getSonarResults("blog-app-mern");

    console.log("SonarQube Results:");
    console.log(results);
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

testSonar();