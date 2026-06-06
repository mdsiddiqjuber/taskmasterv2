const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ─── RBAC Role Definitions ───────────────────────────────────────────────────
const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  DEVELOPER: "developer",
  VIEWER: "viewer",
};

const PERMISSIONS = {
  admin:     ["create:user","delete:user","manage:roles","create:project","delete:project","create:task","delete:task","assign:task","view:all","update:any"],
  manager:   ["create:project","create:task","delete:task","assign:task","view:project","update:task","view:team"],
  developer: ["view:assigned","update:assigned","comment:task"],
  viewer:    ["view:assigned"],
};

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.DEVELOPER },
    avatar: { type: String, default: "" },
    department: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    refreshToken: { type: String, select: false },
  },
  { timestamps: true }
);

// ─── Pre-save: Hash password ─────────────────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ─── Instance Methods ────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.hasPermission = function (permission) {
  return PERMISSIONS[this.role]?.includes(permission) ?? false;
};

userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  obj.permissions = PERMISSIONS[obj.role] || [];
  return obj;
};

const User = mongoose.model("User", userSchema);
module.exports = { User, ROLES, PERMISSIONS };
