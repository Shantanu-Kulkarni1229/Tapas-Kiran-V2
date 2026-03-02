import { useEffect, useState } from "react";
import { Search, Download, RefreshCw, Users, Shield, Calendar, Eye, EyeOff } from "lucide-react";
import API, { authHeader } from "../../api";
import stringSimilarity from "string-similarity";

 const POLICE_STATIONS = [
  { en: "Paithan",         mr: "पैठण" },
  { en: "MIDC.Paithan",       mr: "एम.पैठण" },
  { en: "Bidkin",          mr: "बिडकीन" },
  { en: "Pachod",          mr: "पाचोड" },

  { en: "Chikalthana",     mr: "चिकलठाणा" },
  { en: "Vadod Bazar",     mr: "वडोदबाजार" },

  { en: "Sillod City",     mr: "सिल्लोड शहर" },
  { en: "Sillod Rural",    mr: "सिल्लोड ग्रामीण" },
  { en: "Ajintha",         mr: "अजिंठा" },
  { en: "Fardapur",        mr: "फर्दापूर" },

  { en: "Kannad City",     mr: "कन्नड शहर" },
  { en: "Kannad Rural",    mr: "कन्नड ग्रामीण" },

  { en: "Khultabad",       mr: "खुलताबाद" },

  { en: "Vaijapur",        mr: "वैजापूर" },
  { en: "Shivur",          mr: "शिवुर" },
  { en: "Gangapur",        mr: "गंगापूर" },
  { en: "Shillegaon",      mr: "शिल्लेगाव" },

  // Newly added stations
  { en: "Karmad",          mr: "कर्माड" },
  { en: "Phulambri",       mr: "फुलंब्री" },
  { en: "Soygaon",         mr: "सोयगाव" },
  { en: "Pishor",         mr: "पिशोरे" }, // adjust if you prefer only पिशोरे
  { en: "Devgaon",         mr: "देवगाव" },
  { en: "Virgaon",         mr: "वीरगाव" },

  { en: "Others",          mr: "इतर" }
];

function normalizeStation(input) {
  if (typeof input !== "string" || !input) return "Others";
  
  const cleanInput = input.toLowerCase().trim();
  
  // Direct match check for both English and Marathi
  const directMatch = POLICE_STATIONS.find(station => 
    station.en.toLowerCase() === cleanInput || 
    station.mr === input.trim()
  );
  
  if (directMatch) return directMatch.en;
  
  // Fuzzy matching for English names
  const englishNames = POLICE_STATIONS.map(s => s.en.toLowerCase());
  const match = stringSimilarity.findBestMatch(cleanInput, englishNames);
  
  if (match.bestMatch.rating > 0.6) {
    return POLICE_STATIONS[match.bestMatchIndex].en;
  }
  
  // If no match found, categorize as "Others"
  return "Others";
}

export default function AllUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [stationFilter, setStationFilter] = useState("");

   const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/admin/users/overview", {
        headers: authHeader(),
      });

      // Deduplicate users by email & add normalizedStation
      const uniqueUsers = [];
      const seen = new Set();
      data.users.forEach((user) => {
        if (!seen.has(user.email)) {
          seen.add(user.email);
          uniqueUsers.push({
            ...user,
            normalizedStation: normalizeStation(user.policeStation),
          });
        }
      });
      setUsers(uniqueUsers);
    } catch (error) {
      console.error("❌ Error fetching all users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  /* ------------- ✅ Combined Search + Dropdown -------------- */
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.policeStation?.toLowerCase().includes(searchTerm.toLowerCase());

    // Enhanced station filtering to handle both English and Marathi
    const matchesStation = stationFilter
      ? user.normalizedStation === stationFilter ||
        (user.policeStation && (
          user.policeStation.toLowerCase().includes(stationFilter.toLowerCase()) ||
          POLICE_STATIONS.find(s => s.en === stationFilter)?.mr === user.policeStation
        ))
      : true;

    return matchesSearch && matchesStation;
  });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Download CSV
  const downloadPDF = () => {
    const headers = [
      "Sr. No.",
      "Name",
      "Email",
      "Phone",
      "District",
      "Taluka",
      "Police Station",
      "Registered At",
      "Last Login",
      "Last Logout",
      "Login Count",
      "Logout Count",
      "Last Known IP",
      "Verified",
    ];
    let csvContent = headers.join(",") + "\n";

    filteredUsers.forEach((user, index) => {
      const row = [
        index + 1,
        `"${user.name}"`,
        `"${user.email}"`,
        `"${user.phoneNumber || "—"}"`,
        `"${user.district || "—"}"`,
        `"${user.taluka || "—"}"`,
        `"${user.normalizedStation || user.policeStation || "—"}"`,
        `"${user.registeredAt ? new Date(user.registeredAt).toLocaleString() : "—"}"`,
        `"${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "—"}"`,
        `"${user.lastLogout ? new Date(user.lastLogout).toLocaleString() : "—"}"`,
        user.loginCount || 0,
        user.logoutCount || 0,
        `"${user.lastKnownIP || "—"}"`,
        user.isVerified ? "Yes" : "No",
      ];
      csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `users_data_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
   <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg mb-6 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-full">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  User Management
                </h1>
                <p className="text-gray-600 mt-1">
                  Maharashtra Police - Registered Users Overview
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={downloadPDF}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export Data
              </button>
              <button
                onClick={fetchUsers}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-blue-600">{users.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Verified Users</p>
                <p className="text-2xl font-bold text-green-600">
                  {users.filter(u => u.isVerified).length}
                </p>
              </div>
              <Shield className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unverified</p>
                <p className="text-2xl font-bold text-red-600">
                  {users.filter(u => !u.isVerified).length}
                </p>
              </div>
              <EyeOff className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Today</p>
                <p className="text-2xl font-bold text-purple-600">
                  {users.filter(u => {
                    const today = new Date().toDateString();
                    return u.lastLogin && new Date(u.lastLogin).toDateString() === today;
                  }).length}
                </p>
              </div>
              <Eye className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
           <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, district, or police station..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Enhanced Dropdown */}
            <select
              value={stationFilter}
              onChange={(e) => {
                setStationFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All Police Stations</option>
              {POLICE_STATIONS.map((station) => (
                <option key={station.en} value={station.en}>
                  {station.en} ({station.mr})
                </option>
              ))}
            </select>

            <div className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
              Showing {startIndex + 1}-
              {Math.min(startIndex + itemsPerPage, filteredUsers.length)} of{" "}
              {filteredUsers.length} users
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Sr. No.</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">District</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Taluka</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Police Station</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Registered</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Last Login</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Login Count</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Logout Count</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="12" className="px-4 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                        <span className="text-gray-600">Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user, index) => (
                    <tr key={user.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.phoneNumber || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.district || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.taluka || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div>
                          <div className="font-medium">{user.normalizedStation}</div>
                          {user.policeStation !== user.normalizedStation && (
                            <div className="text-xs text-gray-500">({user.policeStation})</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {user.registeredAt ? new Date(user.registeredAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.loginCount || 0}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.logoutCount || 0}</td>
                      <td className="px-4 py-3">
                        {user.isVerified ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Shield className="w-3 h-3 mr-1" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <EyeOff className="w-3 h-3 mr-1" />
                            Unverified
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="12" className="px-4 py-12 text-center">
                      <div className="text-gray-500">
                        <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium mb-2">No users found</p>
                        <p className="text-sm">Try adjusting your search criteria</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 text-sm border rounded ${
                          currentPage === page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}