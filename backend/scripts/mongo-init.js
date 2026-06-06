db = db.getSiblingDB("taskmaster");

db.createUser({
  user: "taskmaster_user",
  pwd: process.env.MONGO_APP_PASS || "taskmaster_pass",
  roles: [{ role: "readWrite", db: "taskmaster" }],
});

print("✅ TaskMaster DB initialized");