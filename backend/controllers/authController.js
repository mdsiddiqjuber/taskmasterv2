const jwt = require("jsonwebtoken");
const { User } = require("../models/User");
const logger = require("../config/logger");

const signAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "15m" });

const signRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
};

// POST /api/v1/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, department } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    const SELF_ALLOWED_ROLES = ["manager", "developer", "viewer"];

    let assignedRole;
    if (req.user?.role === "admin") {
      // An already-authenticated admin is creating the account — honour any role
      assignedRole = role || "developer";
    } else {
      // Self-registration: allow manager/developer/viewer, silently block admin
      assignedRole =
        role && SELF_ALLOWED_ROLES.includes(role) ? role : "developer";
    }

    const user = await User.create({ name, email, password, role: assignedRole, department });
    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    logger.info(`New user registered: ${email} [${assignedRole}]`);
    res
      .cookie("accessToken", accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
      })
      .cookie("refreshToken", refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(201)
      .json({
        success: true,
        user: user.toPublicJSON(),
      });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password +refreshToken");
    if (!user || !user.isActive) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    logger.info(`User logged in: ${email}`);
    res
      .cookie("accessToken", accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
      })
      .cookie("refreshToken", refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        success: true,
        user: user.toPublicJSON(),
      });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/refresh
exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: "Refresh token required" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select("+refreshToken");

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }

    const newAccessToken = signAccessToken(user._id);
    res
      .cookie("accessToken", newAccessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
      })
      .json({ success: true });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/logout
exports.logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { refreshToken: null });
    res
      .clearCookie("accessToken")
      .clearCookie("refreshToken")
      .json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/auth/me
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user.toPublicJSON() });
};
