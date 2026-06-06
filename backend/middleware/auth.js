const jwt = require("jsonwebtoken");
const { User, PERMISSIONS } = require("../models/User");
const logger = require("../config/logger");

// ─── Authenticate JWT ─────────────────────────────────────────────────────────
const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;
    if(!token) {
      return res.status(401).json({ success: false, message: "Access token required" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password -refreshToken");
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "User not found or deactivated" });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired" });
    }
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

// ─── RBAC: Restrict by Role ───────────────────────────────────────────────────
// Usage: restrictTo("admin", "manager")
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by user ${req.user.id} (role: ${req.user.role}) on ${req.method} ${req.originalUrl}`);
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(", ")}`,
      });
    }
    next();
  };
};

// ─── RBAC: Restrict by Permission ────────────────────────────────────────────
// Usage: requirePermission("delete:task")
const requirePermission = (permission) => {
  return (req, res, next) => {
    const userPermissions = PERMISSIONS[req.user.role] || [];
    if (!userPermissions.includes(permission)) {
      logger.warn(`Permission denied: ${req.user.id} lacks "${permission}" on ${req.method} ${req.originalUrl}`);
      return res.status(403).json({
        success: false,
        message: `You don't have permission to perform this action (required: ${permission})`,
      });
    }
    next();
  };
};

// ─── Project Membership Guard ────────────────────────────────────────────────
const requireProjectAccess = (minRole = "viewer") => {
  const roleHierarchy = { viewer: 0, developer: 1, manager: 2 };

  return async (req, res, next) => {
    try {
      // Admins bypass project membership checks
      if (req.user.role === "admin") return next();

      const Project = require("../models/Project");
      const project = await Project.findById(req.params.projectId || req.body.project);
      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found" });
      }

      const memberRole = project.getMemberRole(req.user.id);
      if (!memberRole) {
        return res.status(403).json({ success: false, message: "You are not a member of this project" });
      }

      if (roleHierarchy[memberRole] < roleHierarchy[minRole]) {
        return res.status(403).json({
          success: false,
          message: `Insufficient project role. Required: ${minRole}, yours: ${memberRole}`,
        });
      }

      req.project = project;
      req.projectRole = memberRole;
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { authenticate, restrictTo, requirePermission, requireProjectAccess };
