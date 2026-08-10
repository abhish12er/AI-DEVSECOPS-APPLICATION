const mongoose = require("mongoose");

const repositorySchema = new mongoose.Schema(
  {
    repoName: {
      type: String,
      required: true,
    },
    owner: {
      type: String,
      required: true,
    },
    repoUrl: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
    },
    defaultBranch: {
      type: String,
    },
    stars: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Repository", repositorySchema);