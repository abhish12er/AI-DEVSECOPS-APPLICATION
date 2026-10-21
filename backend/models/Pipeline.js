const mongoose = require("mongoose");

const pipelineSchema = new mongoose.Schema(
  {
    repoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },

    repoName: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["running", "success", "failed"],
      default: "running",
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    completedAt: {
      type: Date,
    },

    duration: {
      type: Number,
      default: 0,
    },

    auditStatus: {
      type: String,
      enum: ["passed", "failed", "skipped"],
      default: "skipped",
    },

    
scannerResults: {
  npmAudit: {
    status: {
      type: String,
      enum: ["passed", "failed", "skipped"],
      default: "skipped",
    },
    total: { type: Number, default: 0 },
    critical: { type: Number, default: 0 },
    high: { type: Number, default: 0 },
  },

  trivy: {
    status: {
      type: String,
      enum: ["passed", "failed", "skipped"],
      default: "skipped",
    },
    total: { type: Number, default: 0 },
    critical: { type: Number, default: 0 },
    high: { type: Number, default: 0 },
  },

  sonarQube: {
    status: {
      type: String,
      enum: ["passed", "failed", "skipped"],
      default: "skipped",
    },
    qualityGate: {
      type: String,
      default: "UNKNOWN",
    },
    bugs: { type: Number, default: 0 },
    vulnerabilities: { type: Number, default: 0 },
    securityHotspots: { type: Number, default: 0 },
    codeSmells: { type: Number, default: 0 },
  },
},


    vulnerabilities: {
      total: {
        type: Number,
        default: 0,
      },
      critical: {
        type: Number,
        default: 0,
      },
      high: {
        type: Number,
        default: 0,
      },
      medium: {
        type: Number,
        default: 0,
      },
      low: {
        type: Number,
        default: 0,
      },
    },

    buildStatus: {
      type: String,
      enum: ["passed", "failed", "skipped"],
      default: "skipped",
    },

    deploymentStatus: {
      type: String,
      enum: ["deployed", "failed", "skipped"],
      default: "skipped",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Pipeline", pipelineSchema);
