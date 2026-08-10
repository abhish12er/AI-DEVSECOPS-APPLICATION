const Scan = require("../models/Scan");
const Repository = require("../models/Repository");

const runScan = async (req, res) => {
  try {
    const { repoId } = req.body;

    const repo = await Repository.findById(repoId);

    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    const sampleFindings = [
      {
        title: "Outdated dependency detected",
        severity: "HIGH",
        cve: "CVE-2024-1001",
        score: 8.5,
        recommendation: "Update dependency to latest stable version",
      },
      {
        title: "Hardcoded API key risk",
        severity: "HIGH",
        cve: "CVE-2023-8821",
        score: 9.2,
        recommendation: "Move secrets to environment variables",
      },
      {
        title: "Weak password policy detected",
        severity: "MEDIUM",
        cve: "CVE-2022-4412",
        score: 6.3,
        recommendation: "Enforce stronger password rules",
      },
      {
        title: "Missing security headers",
        severity: "LOW",
        cve: "CVE-2021-3321",
        score: 3.1,
        recommendation: "Add security middleware like helmet.js",
      },
    ];

    const shuffled = sampleFindings
      .map(f => ({
        ...f,
        score: +(f.score + (Math.random() * 0.5)).toFixed(1),
      }))
      .sort(() => 0.5 - Math.random());

    const findings = shuffled.slice(0, Math.floor(Math.random() * 3) + 1);

    const scan = await Scan.create({
      repoId: repo._id,
      repoName: repo.repoName,
      status: "completed",
      findings,
    });

    res.status(201).json(scan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getScans = async (req, res) => {
  try {
    const scans = await Scan.find()
      .populate("repoId")
      .sort({ createdAt: -1 });

    res.status(200).json(scans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  runScan,
  getScans,
};