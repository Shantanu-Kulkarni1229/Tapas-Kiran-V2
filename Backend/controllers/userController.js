// controllers/userController.js
export const getUserProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - No user found in request",
      });
    }

    // Destructure to remove sensitive fields like password or tokens
    const { password, refreshToken, ...safeUser } = req.user.toObject
      ? req.user.toObject()
      : req.user;

    res.status(200).json({
      success: true,
      message: "User profile fetched successfully",
      user: safeUser,
    });
  } catch (error) {
    console.error("❌ Get Profile Error:", error.message || error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
