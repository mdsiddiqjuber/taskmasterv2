const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validate");

router.post("/register", validate(schemas.registerSchema), authCtrl.register);
router.post("/login", validate(schemas.loginSchema), authCtrl.login);
router.post("/refresh", authCtrl.refreshToken);
router.post("/logout", authenticate, authCtrl.logout);
router.get("/me", authenticate, authCtrl.getMe);

module.exports = router;
