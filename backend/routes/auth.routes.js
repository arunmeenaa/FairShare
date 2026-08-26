const router = require("express").Router();
const protect = require("../middleware/auth.middleware");
const { register, login, changePassword, logout,getMe } = require("../controller/auth.controller");


router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.post("/change-password", protect, changePassword);

module.exports = router;
