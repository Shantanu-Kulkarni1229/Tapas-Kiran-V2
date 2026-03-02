import { useEffect, useState } from "react";
import API from "../api";
import { useNavigate, Link } from "react-router-dom";
import { FaUserCircle, FaSignOutAlt, FaChevronDown } from "react-icons/fa";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import logo from "../assets/Logo.png";

export default function Navbar() {
  const [userName, setUserName] = useState("User");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await API.get("/user/profile", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setUserName(res.data.name);
      } catch (err) {
        console.error("Failed to fetch user", err);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    toast.success("Logged out successfully / यशस्वीरित्या लॉगआउट केले", {
      position: "top-center",
      autoClose: 2000,
      onClose: () => navigate("/login"),
    });
  };

  return (
    <>
      <ToastContainer />
      <nav className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-24"> {/* Increased height */}
            {/* Left Section - Logo and Address */}
            <div className="flex items-center space-x-4"> {/* Increased spacing */}
              <img 
                src={logo} 
                alt="Maharashtra Police" 
                className="h-14 w-auto object-contain" 
              />
              <div className="hidden md:block border-l border-gray-300 pl-4"> {/* Increased padding */}
                <p className="text-sm font-medium text-gray-800">
                  Chhatrapati Sambhajinagar Rural
                </p>
                <p className="text-xs text-gray-600">
                  छत्रपती संभाजीनगर ग्रामीण
                </p>
              </div>
            </div>

            {/* Center Section - Title */}
            <div className="flex-1 text-center">
              <h1 className="text-2xl font-bold text-blue-800 tracking-tight">
                Investigation Assistant
              </h1>
              <p className="text-sm text-blue-600 mt-1 hidden md:block">
                चौकशी सहाय्यक
              </p>
            </div>

            {/* Right Section - User Profile */}
            <div className="flex items-center relative">
              <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 cursor-pointer group"
              >
                <FaUserCircle className="text-blue-700 text-4xl hover:text-blue-800 transition-colors" /> {/* Larger icon */}
                <div className="text-right hidden md:block">
                  <p className="text-sm font-medium text-gray-800 group-hover:text-blue-800 transition-colors">
                    {userName}
                  </p>
                  <div className="flex items-center justify-end">
                    <span className="text-xs text-gray-500">Profile</span>
                    <FaChevronDown className={`ml-1 text-xs text-gray-500 transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`} />
                  </div>
                </div>
              </div>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200"
                  onMouseLeave={() => setIsDropdownOpen(false)}
                >
                  <Link
                    to="/profile"
                    className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <FaUserCircle className="mr-3 text-gray-500" />
                    <div>
                      <p className="font-medium">{userName}</p>
                      <p className="text-xs text-gray-500">View Profile / प्रोफाइल पहा</p>
                    </div>
                  </Link>
                  <div className="border-t border-gray-200"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <FaSignOutAlt className="mr-3 text-gray-500" />
                    Sign out / साइन आउट
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}