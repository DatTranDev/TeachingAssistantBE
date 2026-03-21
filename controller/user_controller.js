const axios = require("axios");
const User = require("../model/user.js");
const bcrypt = require("../utils/hash.js");
const TokenHelper = require("../utils/token.js");
const helper = require("../utils/helper.js");
const TokenService = require("../services/token.service.js");
const { LANGUAGE, COLOR_MODE } = require("../constants/preferences.js");
const register = async (req, res) => {
  const isValidEmail = await helper.isValidEmail(req.body.email);
  if (!isValidEmail) {
    return res.status(400).json({
      message: "Invalid email",
    });
  }
  const existUser = await User.findOne({
    email: req.body.email,
  });
  if (existUser) {
    return res.status(400).json({
      message: "Email already exist",
    });
  }

  const newUser = new User(req.body);
  newUser.password = await bcrypt.hashPassword(newUser.password);
  let userId = null;
  await newUser
    .save()
    .then((user) => {
      userId = user._id;
    })
    .catch((err) => {
      return res.status(500).json({
        message: "Internal server error: " + err,
      });
    });
  const resUser = await User.findById(userId).select("-password");
  const accessToken = await TokenHelper.generateToken(newUser, "1h", "access");
  const refreshToken = await TokenHelper.generateToken(
    newUser,
    "30d",
    "refresh",
  );
  await TokenService.addNewToken(refreshToken, newUser._id);

  // Billing Service: Setup Free Tier
  try {
    const billingUrl = process.env.BILLING_SERVICE_URL;
    await axios.post(`${billingUrl}/setup-free-tier`, {
      userId: newUser._id.toString(),
      email: newUser.email,
      firstName: newUser.name.split(" ")[0] || "",
      lastName: newUser.name.split(" ").slice(1).join(" ") || "",
      address: newUser.address || {},
      timezone: newUser.timezone || "",
      country: newUser.country || "",
    });
  } catch (err) {
    console.error("Failed to setup free tier in billing service:", err.message);
    // We don't block registration if billing fails, but we should log it
  }

  return res.status(201).json({
    user: resUser,
    accessToken: accessToken,
    refreshToken: refreshToken,
  });
};
const login = async (req, res) => {
  const existUser = await User.findOne({
    email: req.body.email,
  }).select("+password");
  if (!existUser)
    return res.status(404).json({
      message: "User is not found",
    });
  const isValidPassword = await bcrypt.comparePassword(
    req.body.password,
    existUser.password,
  );
  if (!isValidPassword)
    return res.status(401).json({
      message: "Wrong password",
    });
  const user = await User.findOne({
    email: req.body.email,
  }).select("-password");
  const accessToken = await TokenHelper.generateToken(
    existUser,
    "1h",
    "access",
  );
  const refreshToken = await TokenHelper.generateToken(
    existUser,
    "30d",
    "refresh",
  );
  TokenService.addNewToken(refreshToken, user._id);
  return res.json({
    accessToken: accessToken,
    refreshToken: refreshToken,
    data: user,
  });
};
const updateUser = async (req, res) => {
  const userIdFromToken = req.user.userId;
  const id = req.params.id;
  const isValidId = await helper.isValidObjectID(id);
  if (!isValidId) {
    return res.status(400).json({
      message: "Invalid id",
    });
  }
  const existUser = await User.findById(id);
  // Check if the user ID from the token matches the user ID of the account being modified
  if (existUser._id.toString() !== userIdFromToken) {
    await TokenService.deleteTokenByUserID(userIdFromToken);
    return res.status(403).json({ message: "Unauthorized action" });
  }
  if (req.body.password != null)
    return res.status(400).json({
      message: "Use changePassword route to change password",
    });
  await User.findByIdAndUpdate(id, req.body).catch((err) => {
    return res.status(400).json({
      message: "Internal server error: " + err,
    });
  });

  // Billing Service: Sync Customer Data
  const hasGeographicUpdate =
    req.body.address ||
    req.body.timezone ||
    req.body.country ||
    req.body.name ||
    req.body.email;
  if (hasGeographicUpdate) {
    try {
      const billingUrl = process.env.BILLING_SERVICE_URL;
      const user = await User.findById(id);
      await axios.post(`${billingUrl}/sync-customer`, {
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        address: user.address,
        timezone: user.timezone,
        country: user.country,
      });
    } catch (err) {
      console.error(
        "Failed to sync customer data with billing service:",
        err.message,
      );
    }
  }

  return res.status(200).json({
    message: "Updated successfully",
  });
};
const changePassword = async (req, res) => {
  const isValidEmail = await helper.isValidEmail(req.body.email);
  if (!isValidEmail) {
    return res.status(400).json({
      message: "Invalid email",
    });
  }
  const existUser = await User.findOne({
    email: req.body.email,
  });
  if (!existUser) {
    return res.status(404).json({
      message: "User is not found",
    });
  }
  const password = req.body.password;
  const hashPassword = await bcrypt.hashPassword(password);
  await User.findOneAndUpdate(
    {
      email: req.body.email,
    },
    {
      password: hashPassword,
    },
  ).catch((err) => {
    return res.status(400).json({
      message: "Internal server error: " + err,
    });
  });
  return res.status(200).json({
    message: "Password changed successfully",
  });
};

const getMe = async (req, res) => {
  const userId = req.user.userId;
  const user = await User.findById(userId).select("-password");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.status(200).json({ user });
};

const updatePreferences = async (req, res) => {
  const userId = req.user.userId;
  const { language, colorMode } = req.body;

  const update = {};
  if (language !== undefined) {
    if (!Object.values(LANGUAGE).includes(language)) {
      return res.status(400).json({
        message: `Invalid language. Must be one of: ${Object.values(LANGUAGE).join(", ")}`,
      });
    }
    update.language = language;
  }
  if (colorMode !== undefined) {
    if (!Object.values(COLOR_MODE).includes(colorMode)) {
      return res.status(400).json({
        message: `Invalid colorMode. Must be one of: ${Object.values(COLOR_MODE).join(", ")}`,
      });
    }
    update.colorMode = colorMode;
  }

  if (Object.keys(update).length === 0) {
    return res
      .status(400)
      .json({ message: "No valid preference fields provided" });
  }

  const updatedUser = await User.findByIdAndUpdate(userId, update, {
    new: true,
  })
    .select("-password")
    .catch((err) => {
      return res.status(500).json({ message: "Internal server error: " + err });
    });

  return res.status(200).json({ user: updatedUser });
};

module.exports = {
  register,
  login,
  updateUser,
  changePassword,
  getMe,
  updatePreferences,
};
