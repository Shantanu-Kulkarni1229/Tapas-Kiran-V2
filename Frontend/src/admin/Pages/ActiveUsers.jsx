import { useEffect, useState } from "react";
import { Search, Download, RefreshCw, Users, Activity, Clock, Shield, Zap, EyeOff } from "lucide-react";
import API, { authHeader } from "../../api";

export default function ActiveUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const fetchActiveUsers = async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/users/active", {
        headers: authHeader(),
      });
      // Deduplicate by email
      const uniqueUsers = [];
      const seen = new Set();
      res.data.users.forEach((user) => {
        if (!seen.has(user.email)) {
          seen.add(user.email);
          uniqueUsers.push(user);
        }
      });
      setUsers(uniqueUsers);
    } catch (error) {
      console.error("Error fetching active users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveUsers();
  }, []);

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.policeStation?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  // Download CSV functionality
  const downloadCSV = () => {
    const headers = [
      'Sr. No.', 'Name', 'Email', 'Phone', 'District', 'Taluka', 'Police Station', 'Last Login'
    ];

    let csvContent = headers.join(',') + '\n';

    filteredUsers.forEach((user, index) => {
      const row = [
        index + 1,
        `"${user.name}"`,
        `"${user.email}"`,
        `"${user.phoneNumber || '—'}"`,
        `"${user.district || '—'}"`,
        `"${user.taluka || '—'}"`,
        `"${user.policeStation || '—'}"`,
        `"${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '—'}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `active_users_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate stats
  const recentlyActiveUsers = users.filter(user => {
    if (!user.lastLogin) return false;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return new Date(user.lastLogin) > oneHourAgo;
  }).length;

  const verifiedActiveUsers = users.filter(user => user.isVerified).length;

  const todayActiveUsers = users.filter(user => {
    if (!user.lastLogin) return false;
    const today = new Date().toDateString();
    return new Date(user.lastLogin).toDateString() === today;
  }).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-96">
            <div className="flex items-center">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mr-3" />
              <span className="text-xl text-gray-600">Loading active users...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-lg mb-6 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-full">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Active Users</h1>
                <p className="text-gray-600 mt-1">Maharashtra Police - Currently Active User Sessions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={downloadCSV}
                disabled={users.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export Data
              </button>
              <button
                onClick={fetchActiveUsers}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
                <p className="text-sm font-medium text-gray-600">Total Active</p>
                <p className="text-2xl font-bold text-blue-600">{users.length}</p>
              </div>
              <Zap className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Today</p>
                <p className="text-2xl font-bold text-green-600">{todayActiveUsers}</p>
              </div>
              <Activity className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recent (1hr)</p>
                <p className="text-2xl font-bold text-orange-600">{recentlyActiveUsers}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Verified Active</p>
                <p className="text-2xl font-bold text-purple-600">{verifiedActiveUsers}</p>
              </div>
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
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
            </div>
            <div className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
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
                  <th className="px-4 py-3 text-left text-sm font-semibold">Last Login</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Activity Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user, index) => {
                    const isRecentlyActive = user.lastLogin && new Date(user.lastLogin) > new Date(Date.now() - 60 * 60 * 1000);
                    const isTodayActive = user.lastLogin && new Date(user.lastLogin).toDateString() === new Date().toDateString();
                    
                    return (
                      <tr key={user._id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {startIndex + index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            {user.isVerified && (
                              <Shield className="w-4 h-4 text-green-500 ml-2" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{user.phoneNumber || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{user.district || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{user.taluka || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{user.policeStation || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {isRecentlyActive ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                              Very Active
                            </span>
                          ) : isTodayActive ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                              Active Today
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <div className="w-2 h-2 bg-gray-500 rounded-full mr-1"></div>
                              Active
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className="px-4 py-12 text-center">
                      <div className="text-gray-500">
                        <Zap className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium mb-2">No active users found</p>
                        <p className="text-sm">
                          {searchTerm ? "Try adjusting your search criteria" : "No users are currently active"}
                        </p>
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
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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