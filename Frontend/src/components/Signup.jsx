import { useState, useEffect } from "react";
import API from "../api";
import { useNavigate, Link } from "react-router-dom";
import {
  FaUserShield,
  FaEnvelope,
  FaLock,
  FaKey,
  FaArrowLeft,
  FaCheck,
  FaTimes,
  FaRedo,
  FaPhone,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Logo from "../assets/logo.png";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    district: "",
    taluka: "",
    policeStation: "",
  });
  const [userId, setUserId] = useState(null);
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const [passwordChecks, setPasswordChecks] = useState({
    minLength: false,
    hasNumber: false,
    hasSpecialChar: false,
    hasUpperCase: false,
  });

  // Clear OTP field and start countdown when step changes to 2
  useEffect(() => {
    if (step === 2) {
      setOtp("");
      startCountdown();
    }
  }, [step]);

  // Countdown for resend OTP
  useEffect(() => {
    if (countdown > 0 && resendDisabled) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setResendDisabled(false);
    }
  }, [countdown, resendDisabled]);

  const startCountdown = () => {
    setCountdown(30);
    setResendDisabled(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    if (name === "password") {
      setPasswordChecks({
        minLength: value.length >= 8,
        hasNumber: /\d/.test(value),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(value),
        hasUpperCase: /[A-Z]/.test(value),
      });
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await API.post("/auth/signup", form);
      setUserId(res.data.userId);
      setStep(2);
      toast.success("OTP sent to your email!\n(OTP तुमच्या ईमेलवर पाठवला आहे!)", {
        position: "top-center",
        autoClose: 5000,
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Signup failed\n(नोंदणी अयशस्वी)",
        {
          position: "top-center",
          autoClose: 5000,
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await API.post("/auth/verify-signup-otp", { email: form.email, otp });
      toast.success(
        "Signup successful! You can now log in.\n(नोंदणी यशस्वी! आता तुम्ही लॉगिन करू शकता.)",
        {
          position: "top-center",
          autoClose: 2000,
          onClose: () => navigate("/login"),
        }
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "OTP verification failed\n(OTP सत्यापन अयशस्वी)",
        {
          position: "top-center",
          autoClose: 5000,
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      await API.post("/auth/signup", form); // resend OTP
      startCountdown();
      toast.success("New OTP sent!\n(नवीन OTP पाठवला आहे!)", {
        position: "top-center",
        autoClose: 5000,
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to resend OTP\n(OTP पुन्हा पाठवणे अयशस्वी)",
        {
          position: "top-center",
          autoClose: 5000,
        }
      );
    }
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);

  return (
    <div className="flex justify-center items-center min-h-screen bg-white">
      <ToastContainer />
      <div className="border-2 border-blue-600 p-8 rounded-xl shadow-lg w-full max-w-md mx-4">
        {/* Logo/Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-24 h-24 mb-3">
            <img
              src={Logo}
              alt="Maharashtra Police Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Maharashtra Police</h1>
          <p className="text-lg font-medium text-gray-700">(महाराष्ट्र पोलीस)</p>
          <p className="text-blue-600 font-medium mt-2">Investigation Assistant</p>
          <p className="text-blue-500 text-sm">(चौकशी सहाय्यक)</p>
        </div>

        {step === 1 && (
          <>
            <h2 className="text-xl font-bold mb-6 text-center text-gray-700">
              Create Your Account
              <br />
              <span className="text-lg">(खाते तयार करा)</span>
            </h2>
            <form onSubmit={handleSignup} className="space-y-4">
              {/* Name */}
              <div className="relative">
                <FaUserShield className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name (पूर्ण नाव)"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              {/* Email */}
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  placeholder="Email (ईमेल)"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              {/* Phone Number */}
              <div className="relative">
                <FaPhone className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  name="phoneNumber"
                  placeholder="Phone Number (फोन नंबर)"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  pattern="\d{10}"
                  className="w-full pl-10 p-3 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              {/* District */}
              <div className="relative">
                <FaMapMarkerAlt className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  name="district"
                  placeholder="District (जिल्हा)"
                  value={form.district}
                  onChange={handleChange}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              {/* Taluka */}
              <div className="relative">
                <FaMapMarkerAlt className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  name="taluka"
                  placeholder="Taluka (तालुका)"
                  value={form.taluka}
                  onChange={handleChange}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              {/* Police Station */}
              <div className="relative">
                <FaMapMarkerAlt className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  name="policeStation"
                  placeholder="Police Station (पोलीस स्टेशन)"
                  value={form.policeStation}
                  onChange={handleChange}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              {/* Password */}
              <div className="relative">
                <FaLock className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  placeholder="Password (पासवर्ड)"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              {/* Password Requirements */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm font-medium mb-2">
                  Password Requirements <br />
                  <span className="text-xs">(पासवर्ड आवश्यकता)</span>
                </p>
                <ul className="text-xs space-y-1">
                  <li
                    className={`flex items-center ${
                      passwordChecks.minLength ? "text-green-600" : "text-gray-500"
                    }`}
                  >
                    {passwordChecks.minLength ? <FaCheck /> : <FaTimes />}
                    <span className="ml-1">Minimum 8 characters (किमान 8 वर्ण)</span>
                  </li>
                  <li
                    className={`flex items-center ${
                      passwordChecks.hasNumber ? "text-green-600" : "text-gray-500"
                    }`}
                  >
                    {passwordChecks.hasNumber ? <FaCheck /> : <FaTimes />}
                    <span className="ml-1">At least one number (किमान एक संख्या)</span>
                  </li>
                  <li
                    className={`flex items-center ${
                      passwordChecks.hasSpecialChar
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    {passwordChecks.hasSpecialChar ? <FaCheck /> : <FaTimes />}
                    <span className="ml-1">
                      At least one special character (किमान एक विशेष वर्ण)
                    </span>
                  </li>
                  <li
                    className={`flex items-center ${
                      passwordChecks.hasUpperCase
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    {passwordChecks.hasUpperCase ? <FaCheck /> : <FaTimes />}
                    <span className="ml-1">
                      At least one uppercase letter (किमान एक मोठे अक्षर)
                    </span>
                  </li>
                </ul>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !isPasswordValid}
                className={`w-full py-3 px-4 rounded-lg font-medium text-white ${
                  isLoading || !isPasswordValid
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isLoading ? "Processing..." : "Sign Up (नोंदणी करा)"}
              </button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-gray-600">
                Already have an account? <br />
                <Link to="/login" className="text-blue-600 font-medium">
                  Login here (येथे लॉगिन करा)
                </Link>
              </p>
            </div>
          </>
        )}

        {/* Step 2 - OTP Verification stays same */}
        {step === 2 && (
          <>
            <button
              onClick={() => setStep(1)}
              className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
            >
              <FaArrowLeft className="mr-1" /> Back (मागे)
            </button>

            <h2 className="text-xl font-bold mb-6 text-center text-gray-700">
              Verify Your Email <br />
              <span className="text-lg">(तुमचा ईमेल सत्यापित करा)</span>
            </h2>

            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="relative">
                <FaKey className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter OTP (OTP प्रविष्ट करा)"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700"
              >
                {isLoading ? "Verifying..." : "Verify OTP (OTP सत्यापित करा)"}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resendDisabled}
                  className="text-blue-600 font-medium"
                >
                  {resendDisabled
                    ? `Resend OTP in ${countdown}s`
                    : "Resend OTP (OTP पुन्हा पाठवा)"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
