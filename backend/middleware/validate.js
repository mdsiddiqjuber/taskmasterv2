const Joi = require("joi");

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: "Validation failed", errors });
  }
  next();
};

// ─── Auth Schemas ─────────────────────────────────────────────────────────────
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(60).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid("admin", "manager", "developer", "viewer"),
  department: Joi.string().max(100),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// ─── Task Schemas ─────────────────────────────────────────────────────────────
const createTaskSchema = Joi.object({
  title: Joi.string().min(2).max(120).required(),
  description: Joi.string().max(2000),
  status: Joi.string().valid("backlog", "todo", "in_progress", "in_review", "done", "cancelled"),
  priority: Joi.string().valid("low", "medium", "high", "critical"),
  project: Joi.string().hex().length(24).required(),
  assignees: Joi.array().items(Joi.string().hex().length(24)),
  dueDate: Joi.date().iso(),
  tags: Joi.array().items(Joi.string()),
  estimatedHours: Joi.number().min(0),
});

const updateTaskSchema = Joi.object({
  title: Joi.string().min(2).max(120),
  description: Joi.string().max(2000).allow(""),
  status: Joi.string().valid("backlog", "todo", "in_progress", "in_review", "done", "cancelled"),
  priority: Joi.string().valid("low", "medium", "high", "critical"),
  assignees: Joi.array().items(Joi.string().hex().length(24)),
  dueDate: Joi.date().iso().allow(null),
  tags: Joi.array().items(Joi.string()),
  estimatedHours: Joi.number().min(0),
  loggedHours: Joi.number().min(0),
});

// ─── Project Schemas ──────────────────────────────────────────────────────────
const createProjectSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(1000),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref("startDate")),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
  icon: Joi.string().max(4),
  isPublic: Joi.boolean(),
});

module.exports = {
  validate,
  schemas: { registerSchema, loginSchema, createTaskSchema, updateTaskSchema, createProjectSchema },
};
