
const mongoose = require("mongoose");

const scanSchema = new mongoose.Schema(
  {
    repoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },

    repoName: String,

    scanner: {
      type: String,
      enum: ["npm-audit", "trivy"],
      default: "npm-audit",
    },

    status: {
      type: String,
      enum: ["completed", "failed"],
      default: "completed",
    },

    // Track which projects were successfully scanned.
    scanCoverage: {
      projectsScanned: {
        type: Number,
        default: 0,
      },

      projectsFailed: {
        type: Number,
        default: 0,
      },

      complete: {
        type: Boolean,
        default: false,
      },

      auditedProjects: {
        type: [String],
        default: [],
      },
    },

    findings: [
      {
        packageName: String,

        project: String,

        title: String,

        severity: {
          type: String,
          enum: [
            "UNKNOWN",
            "LOW",
            "MEDIUM",
            "HIGH",
            "CRITICAL",
          ],
        },

        // Real npm advisory information
        cve: String,

        advisory: String,

        // npm advisory source/id
        source: String,

        // Common Weakness Enumeration IDs
        cwe: [String],

        // CVSS score reported by npm
        score: Number,

        // Vulnerable version/range reported by npm
        affectedVersion: String,

        // npm audit fix information
        fixAvailable: {
          type: Boolean,
          default: false,
        },

        fixVersion: String,

        // Whether the fix may introduce
        // a breaking change
        fixIsMajor: {
          type: Boolean,
          default: false,
        },

        // Recommendation based on npm audit results
        recommendation: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Scan", scanSchema);
