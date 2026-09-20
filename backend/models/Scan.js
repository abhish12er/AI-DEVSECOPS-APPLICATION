
const mongoose = require("mongoose");

const scanSchema = new mongoose.Schema(
  {
    repoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },

    repoName: String,

    status: {
      type: String,
      enum: ["completed", "failed"],
      default: "completed",
    },

    findings: [
      {
        // Vulnerable package
        packageName: String,

        // Project containing the package
        project: String,

        // Vulnerability title
        title: String,

        // Severity
        severity: {
          type: String,
          enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        },

        // CVE identifier if available
        cve: String,

        // GHSA / npm advisory URL or identifier
        advisory: String,

        // CVSS score
        score: Number,

        // Vulnerable version/range
        affectedVersion: String,

        // Whether npm provides a fix
        fixAvailable: {
          type: Boolean,
          default: false,
        },

        // Version npm recommends upgrading to
        fixVersion: String,

        // Recommended action
        recommendation: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Scan", scanSchema);
