const express = require("express");
const router = express.Router();

const {
  connectRepository,
  getRepositories,
  deleteRepository,
} = require("../controllers/repoController");

router.get("/test", (req, res) => {
  res.json({
    message: "Repository route working",
  });
});

router.get("/", getRepositories);
router.post("/connect", connectRepository);
router.delete("/:id", deleteRepository);

module.exports = router;