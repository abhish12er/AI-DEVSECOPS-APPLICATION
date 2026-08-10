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
        title: String,
        severity: {
          type: String,
          enum: ["LOW", "MEDIUM", "HIGH"],
        },
        cve: String,
        score: Number,
        recommendation: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Scan", scanSchema);