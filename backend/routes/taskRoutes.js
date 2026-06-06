const express = require("express");
const router = express.Router();
const taskCtrl = require("../controllers/taskController");
const { authenticate, restrictTo, requirePermission } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validate");

router.use(authenticate);

router.get("/stats", taskCtrl.getStats);
router.get("/", taskCtrl.getTasks);
router.post("/", requirePermission("create:task"), validate(schemas.createTaskSchema), taskCtrl.createTask);
router.get("/:id", taskCtrl.getTask);
router.patch("/:id", taskCtrl.updateTask);
router.delete("/:id", requirePermission("delete:task"), taskCtrl.deleteTask);
router.post("/:id/comments", taskCtrl.addComment);

module.exports = router;
