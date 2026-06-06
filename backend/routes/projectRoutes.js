const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const { authenticate, restrictTo, requireProjectAccess } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validate");

router.use(authenticate);

// GET /api/v1/projects
router.get("/", async (req, res, next) => {
  try {
    const filter =
      req.user.role === "admin"
        ? {}
        : { $or: [{ owner: req.user.id }, { "members.user": req.user.id }] };

    const projects = await Project.find(filter)
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar role")
      .sort("-updatedAt");

    res.json({ success: true, data: projects });
  } catch (err) { next(err); }
});

// POST /api/v1/projects
router.post("/", restrictTo("admin", "manager"), validate(schemas.createProjectSchema), async (req, res, next) => {
  try {
    const project = await Project.create({ ...req.body, owner: req.user.id });
    res.status(201).json({ success: true, data: project });
  } catch (err) { next(err); }
});

// GET /api/v1/projects/:projectId
router.get("/:projectId", requireProjectAccess("viewer"), async (req, res, next) => {
  try {
    await req.project.populate("owner members.user");
    res.json({ success: true, data: req.project });
  } catch (err) { next(err); }
});

// PATCH /api/v1/projects/:projectId
router.patch("/:projectId", requireProjectAccess("manager"), async (req, res, next) => {
  try {
    const updated = await Project.findByIdAndUpdate(req.params.projectId, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// POST /api/v1/projects/:projectId/members
router.post("/:projectId/members", requireProjectAccess("manager"), async (req, res, next) => {
  try {
    const { userId, role = "developer" } = req.body;
    const project = await Project.findByIdAndUpdate(
      req.params.projectId,
      { $addToSet: { members: { user: userId, role } } },
      { new: true, runValidators: true }
    ).populate("members.user", "name email avatar");
    res.json({ success: true, data: project });
  } catch (err) { next(err); }
});

// DELETE /api/v1/projects/:projectId
router.delete("/:projectId", restrictTo("admin"), async (req, res, next) => {
  try {
    await Project.findByIdAndDelete(req.params.projectId);
    res.json({ success: true, message: "Project deleted" });
  } catch (err) { next(err); }
});

module.exports = router;
