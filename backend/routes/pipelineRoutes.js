const express = require("express");

const {
  runPipeline,
  getPipelines,
} = require("../controllers/pipelineController");

const router = express.Router();

router.post("/run", runPipeline);

router.get("/", getPipelines);

module.exports = router;
