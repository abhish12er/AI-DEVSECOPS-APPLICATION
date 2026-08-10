const express = require("express");
const router = express.Router();

const { runScan, getScans } = require("../controllers/scanController");

router.post("/run", runScan);
router.get("/", getScans);

module.exports = router;