const mongoose = require("mongoose");

const PRIORITIES = ["low", "medium", "high", "critical"];
const STATUSES = ["backlog", "todo", "in_progress", "in_review", "done", "cancelled"];

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, maxlength: 2000 },
    status: { type: String, enum: STATUSES, default: "backlog" },
    priority: { type: String, enum: PRIORITIES, default: "medium" },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    dueDate: { type: Date },
    tags: [{ type: String, trim: true }],
    estimatedHours: { type: Number, min: 0 },
    loggedHours: { type: Number, default: 0, min: 0 },
    comments: [commentSchema],
    attachments: [{ name: String, url: String, uploadedAt: Date }],
    completedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// ─── Indexes for scalable queries ────────────────────────────────────────────
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ title: "text", description: "text" }); // Full-text search

// ─── Virtual: completion percentage ─────────────────────────────────────────
taskSchema.virtual("isOverdue").get(function () {
  return this.dueDate && this.status !== "done" && new Date() > this.dueDate;
});

taskSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "done" && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

const Task = mongoose.model("Task", taskSchema);
module.exports = { Task, PRIORITIES, STATUSES };
