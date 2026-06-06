const { Task } = require("../models/Task");
const Project = require("../models/Project");

// ─── GET /api/v1/tasks ─────────────────────────────────────────────────────
exports.getTasks = async (req, res, next) => {
  try {
    const {
      project, status, priority, assignee,
      search, page = 1, limit = 20, sort = "-createdAt",
    } = req.query;

    const filter = {};

    if (req.user.role !== "admin") {
      const userProjects = await Project.find({
        $or: [
          { owner: req.user.id },
          { "members.user": req.user.id },
        ],
      }).select("_id");

      const projectIds = userProjects.map((p) => p._id);
      filter.project = { $in: projectIds };
    }

    if (project) filter.project = project;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee) filter.assignees = assignee;
    if (search) filter.$text = { $search: search };

    if (req.user.role === "developer") {
      filter.assignees = req.user.id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate("assignees", "name email avatar role")
        .populate("createdBy", "name email")
        .populate("project", "name color icon")
        .lean(),
      Task.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/v1/tasks ───────────────────────────────────────────────────────
exports.createTask = async (req, res, next) => {
  try {
    const project = await Project.findById(req.body.project);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    if (req.user.role !== "admin" && !project.isMember(req.user.id)) {
      return res.status(403).json({ success: false, message: "Not a member of this project" });
    }

    const task = await Task.create({ ...req.body, createdBy: req.user.id });
    await task.populate(["assignees", "createdBy", "project"]);
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/v1/tasks/:id ────────────────────────────────────────────────────
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignees", "name email avatar role")
      .populate("createdBy", "name email")
      .populate("project", "name color icon members")
      .populate("comments.author", "name avatar");

    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    // RBAC check: developers must see assigned
    if (req.user.role === "developer" && !task.assignees.some((a) => a._id.toString() === req.user.id)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/v1/tasks/:id ──────────────────────────────────────────────────
exports.updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    // Developers can only update their assigned tasks and only status/loggedHours
    if (req.user.role === "developer") {
      if (!task.assignees.map(String).includes(req.user.id)) {
        return res.status(403).json({ success: false, message: "You can only update your assigned tasks" });
      }
      const allowed = ["status", "loggedHours", "comments"];
      Object.keys(req.body).forEach((key) => {
        if (!allowed.includes(key)) delete req.body[key];
      });
    }

    const updated = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    }).populate("assignees createdBy project");

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/v1/tasks/:id ─────────────────────────────────────────────────
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });
    res.json({ success: true, message: "Task deleted" });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/v1/tasks/:id/comments ─────────────────────────────────────────
exports.addComment = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { author: req.user.id, content: req.body.content } } },
      { new: true }
    ).populate("comments.author", "name avatar");

    if (!task) return res.status(404).json({ success: false, message: "Task not found" });
    res.json({ success: true, data: task.comments });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/v1/tasks/stats ──────────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    let matchStage = {};

    if (req.user.role === "developer") {
      // Developers only see stats for their assigned tasks
      matchStage = { assignees: req.user._id };

    } else if (req.user.role !== "admin") {
      // Managers (and viewers) only see stats for tasks
      // in projects they own OR are a member of
      const userProjects = await Project.find({
        $or: [
          { owner: req.user.id },
          { "members.user": req.user.id },
        ],
      }).select("_id");

      const projectIds = userProjects.map((p) => p._id);
      matchStage = { project: { $in: projectIds } };
    }

    // Admin: matchStage stays {} — matches all tasks

    const stats = await Task.aggregate([
      { $match: matchStage },
      {
        $facet: {
          byStatus: [
            { $group: { _id: "$status", count: { $sum: 1 } } },
          ],
          byPriority: [
            { $group: { _id: "$priority", count: { $sum: 1 } } },
          ],
          overdue: [
            {
              $match: {
                dueDate: { $lt: new Date() },
                status: { $ne: "done" },
              },
            },
            { $count: "count" },
          ],
          completedThisWeek: [
            {
              $match: {
                status: "done",
                completedAt: {
                  $gte: new Date(Date.now() - 7 * 86400000),
                },
              },
            },
            { $count: "count" },
          ],
        },
      },
    ]);

    res.json({ success: true, data: stats[0] });
  } catch (err) {
    next(err);
  }
};
