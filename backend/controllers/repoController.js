const Repository = require("../models/Repository");
const axios = require("axios");

// CREATE (GitHub integration)
const connectRepository = async (req, res) => {
  try {
    const { repoUrl } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ message: "repoUrl is required" });
    }

    // 1. Check duplicate first (IMPORTANT)
    const existingRepo = await Repository.findOne({ repoUrl });

    if (existingRepo) {
      return res.status(400).json({
        message: "Repository already exists",
        data: existingRepo,
      });
    }

    // 2. Extract owner + repo name
    const parts = repoUrl.split("/");
    const owner = parts[3];
    const repo = parts[4];

    // 3. Fetch from GitHub API
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}`
    );

    const data = response.data;

    // 4. Save to MongoDB
    const repository = await Repository.create({
      repoName: data.name,
      owner: data.owner.login,
      repoUrl,
      description: data.description,
      defaultBranch: data.default_branch,
      stars: data.stargazers_count,
    });

    res.status(201).json(repository);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// READ ALL
const getRepositories = async (req, res) => {
  try {
    const repositories = await Repository.find();
    res.status(200).json(repositories);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const deleteRepository = async (req, res) => {
  try {
    const { id } = req.params;

    const repository = await Repository.findByIdAndDelete(id);

    if (!repository) {
      return res.status(404).json({
        message: "Repository not found",
      });
    }

    res.status(200).json({
      message: "Repository deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  connectRepository,
  getRepositories,
  deleteRepository,
};