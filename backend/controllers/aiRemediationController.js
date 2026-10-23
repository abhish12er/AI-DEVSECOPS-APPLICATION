
const mongoose = require("mongoose");
const Scan = require("../models/Scan");
const AIRecommendation = require("../models/AIRecommendation");
const { generateRemediation } = require("../services/geminiService");

const AI_MODEL = "gemini-3.8-flash";
const BULK_LIMIT = 5;
const DELAY_MS = 1500;

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const validId = (id) => mongoose.isValidObjectId(id);

// Store a Gemini recommendation for a real scanner finding
const createRecommendation = async (scan, finding) => {
  const existing = await AIRecommendation.findOne({
    scanId: scan._id,
    findingId: finding._id,
  });

  if (existing) {
    return { recommendation: existing, skipped: true };
  }

  const aiAnalysis = await generateRemediation(finding);

  try {
    const recommendation = await AIRecommendation.create({
      scanId: scan._id,
      repoId: scan.repoId,
      findingId: finding._id,
      vulnerability: {
        packageName: finding.packageName,
        title: finding.title,
        cve: finding.cve,
        severity: finding.severity,
        affectedVersion: finding.affectedVersion,
      },
      aiAnalysis,
      aiModel: AI_MODEL,
      status: "generated",
    });

    return { recommendation, skipped: false };
  } catch (error) {
    // Another request may have saved the same finding.
    if (error.code === 11000) {
      const existingRecommendation =
        await AIRecommendation.findOne({
          scanId: scan._id,
          findingId: finding._id,
        });

      if (existingRecommendation) {
        return {
          recommendation: existingRecommendation,
          skipped: true,
        };
      }
    }

    throw error;
  }
};

// Existing endpoint: generate remediation for one finding
const generateAIRecommendation = async (req, res) => {
  try {
    const { scanId, findingId } = req.params;

    if (!validId(scanId) || !validId(findingId)) {
      return res.status(400).json({
        message: "Invalid scan ID or finding ID",
      });
    }

    const scan = await Scan.findById(scanId);

    if (!scan) {
      return res.status(404).json({
        message: "Scan not found",
      });
    }

    const finding = scan.findings.id(findingId);

    if (!finding) {
      return res.status(404).json({
        message: "Vulnerability finding not found",
      });
    }

    const result = await createRecommendation(scan, finding);

    return res.status(result.skipped ? 200 : 201).json({
      message: result.skipped
        ? "Existing AI recommendation retrieved"
        : "AI remediation generated successfully",
      recommendation: result.recommendation,
    });
  } catch (error) {
    console.error("AI remediation error:", error.message);

    return res.status(500).json({
      message: "Failed to generate AI remediation",
    });
  }
};

// New endpoint: generate remediation for multiple findings
const generateBulkAIRecommendations = async (req, res) => {
  try {
    const { scanId } = req.params;

    if (!validId(scanId)) {
      return res.status(400).json({
        message: "Invalid scan ID",
      });
    }

    const scan = await Scan.findById(scanId);

    if (!scan) {
      return res.status(404).json({
        message: "Scan not found",
      });
    }

    const findings = scan.findings || [];

    const existingRecommendations =
      await AIRecommendation.find({
        scanId: scan._id,
      }).select("findingId");

    const existingIds = new Set(
      existingRecommendations.map((item) =>
        String(item.findingId)
      )
    );

    const pendingFindings = findings.filter(
      (finding) =>
        !existingIds.has(String(finding._id))
    );

    const batch = pendingFindings.slice(0, BULK_LIMIT);

    const results = {
      scanId: String(scan._id),
      totalFindings: findings.length,
      alreadyGenerated: existingIds.size,
      attempted: batch.length,
      generated: 0,
      skipped: 0,
      failed: 0,
      remaining: Math.max(
        0,
        pendingFindings.length - batch.length
      ),
      recommendations: [],
      errors: [],
    };

    for (let i = 0; i < batch.length; i++) {
      const finding = batch[i];

      try {
        const result = await createRecommendation(
          scan,
          finding
        );

        if (result.skipped) {
          results.skipped++;
        } else {
          results.generated++;
        }

        results.recommendations.push({
          findingId: String(finding._id),
          packageName: finding.packageName,
          severity: finding.severity,
          recommendationId:
            String(result.recommendation._id),
          status: result.skipped
            ? "already_exists"
            : "generated",
        });
      } catch (error) {
        results.failed++;

        console.error(
          `Gemini failed for finding ${finding._id}:`,
          error.message
        );

        results.errors.push({
          findingId: String(finding._id),
          packageName: finding.packageName,
          message: "AI generation failed",
        });

        // Stop the batch if Gemini is rate-limiting us.
        if (error.status === 429) {
          results.rateLimited = true;
          break;
        }
      }

      if (i < batch.length - 1) {
        await sleep(DELAY_MS);
      }
    }

    const finalCount =
      await AIRecommendation.countDocuments({
        scanId: scan._id,
      });

    results.totalGenerated = finalCount;
    results.remaining = Math.max(
      0,
      findings.length - finalCount
    );

    return res.status(200).json({
      message: "Bulk AI remediation batch processed",
      ...results,
    });
  } catch (error) {
    console.error(
      "Bulk AI remediation error:",
      error.message
    );

    return res.status(500).json({
      message: "Failed to process bulk AI remediation",
    });
  }
};

// Existing endpoint: retrieve saved recommendations
const getAIRecommendations = async (req, res) => {
  try {
    const { scanId } = req.params;

    if (!validId(scanId)) {
      return res.status(400).json({
        message: "Invalid scan ID",
      });
    }

    const recommendations =
      await AIRecommendation.find({
        scanId,
      }).sort({ createdAt: -1 });

    return res.json({
      count: recommendations.length,
      recommendations,
    });
  } catch (error) {
    console.error(
      "Fetch AI recommendations error:",
      error.message
    );

    return res.status(500).json({
      message: "Failed to fetch AI recommendations",
    });
  }
};

module.exports = {
  generateAIRecommendation,
  generateBulkAIRecommendations,
  getAIRecommendations,
};
