const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, maxlength: 1000 },
    status: { type: String, enum: ["active", "on_hold", "completed", "archived"], default: "active" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: { type: String, enum: ["manager", "developer", "viewer"], default: "developer" },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    startDate: { type: Date },
    endDate: { type: Date },
    color: { type: String, default: "#3b82f6" },
    icon: { type: String, default: "📋" },
    isPublic: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
projectSchema.index({ owner: 1 });
projectSchema.index({ "members.user": 1 });
projectSchema.index({ status: 1 });

// ─── Virtual: member count ────────────────────────────────────────────────────
projectSchema.virtual("memberCount").get(function () {
  return this.members.length;
});

// ─── Instance: check membership ──────────────────────────────────────────────
projectSchema.methods.isMember = function (userId) {
  return (
    this.owner.toString() === userId.toString() ||
    this.members.some((m) => m.user.toString() === userId.toString())
  );
};

projectSchema.methods.getMemberRole = function (userId) {
  if (this.owner.toString() === userId.toString()) return "manager";
  const member = this.members.find((m) => m.user.toString() === userId.toString());
  return member?.role || null;
};

const Project = mongoose.model("Project", projectSchema);
module.exports = Project;
