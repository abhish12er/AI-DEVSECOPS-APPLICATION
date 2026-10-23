
const mongoose = require("mongoose");

const aiRecommendationSchema = new mongoose.Schema(
  {
    scanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Scan",
      required: true,
    },

    repoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },

    findingId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    vulnerability: {
      packageName: String,
      project: String,
      title: String,
      cve: String,
      advisory: String,
      source: String,
      severity: String,
      affectedVersion: String,
    },

    aiAnalysis: {
      explanation: String,
      impact: String,
      rootCause: String,
      recommendedFix: String,
      suggestedCode: String,

      priority: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      },

      verificationSteps: [String],
    },

    aiModel: {
      type: String,
      default: "gemini-3.8-flash",
    },

    status: {
      type: String,
      enum: [
        "pending",
        "generated",
        "verified",
        "failed",
      ],
      default: "generated",
    },

    // Verification is based on a fresh security scan,
    // not on Gemini's generated recommendation.
    verification: {
      status: {
        type: String,
        enum: [
          "not_checked",
          "still_vulnerable",
          "verified",
          "inconclusive",
        ],
        default: "not_checked",
      },

      verificationScanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Scan",
        default: null,
      },

      checkedAt: {
        type: Date,
        default: null,
      },

      reason: {
        type: String,
        default: "",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate AI recommendations for the same
// finding within the same scan.
aiRecommendationSchema.index(
  { scanId: 1, findingId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "AIRecommendation",
  aiRecommendationSchema
);
