import { useEffect, useState } from "react";
import { Trophy, Users, Activity, Medal, Star } from "lucide-react";
import API, { authHeader } from "../../api";

export default function TopActiveUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopActive = async () => {
      try {
        setLoading(true);
        const res = await API.get("/admin/users/top-active", {
          headers: authHeader(),
        });
        setUsers(res.data.users);
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTopActive();
  }, []);

  const getRankIcon = (index) => {
    switch (index) {
      case 0: return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 1: return <Medal className="w-6 h-6 text-gray-400" />;
      case 2: return <Medal className="w-6 h-6 text-amber-600" />;
      default: return <Star className="w-5 h-5 text-blue-600" />;
    }
  };

  const getRankBadge = (index) => {
    const badges = [
      "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white",
      "bg-gradient-to-r from-gray-300 to-gray-500 text-white",
      "bg-gradient-to-r from-amber-400 to-amber-600 text-white",
    ];
    return badges[index] || "bg-blue-100 text-blue-800";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded-lg mb-6 w-1/3"></div>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-xl"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full mb-4 shadow-lg">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Top Active Users</h1>
          <p className="text-blue-700 text-lg">Recognizing our most engaged community members</p>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-blue-800 mx-auto mt-4 rounded-full"></div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-3">
                <Activity className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold">Leaderboard</h2>
                  <p className="text-blue-100">Based on login activity</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{users.length}</div>
                <div className="text-blue-100 text-sm">Active Users</div>
              </div>
            </div>
          </div>

          {/* Users List */}
          <div className="p-6">
            {users.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Active Users Found</h3>
                <p className="text-gray-500">Check back later for user activity data.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((u, i) => (
                  <div
                    key={u._id}
                    className={`
                      relative p-6 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer
                      ${i < 3 
                        ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200' 
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                      }
                    `}
                  >
                    {/* Rank Badge */}
                    <div className="absolute -top-2 -left-2">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                        ${getRankBadge(i)}
                      `}>
                        {i + 1}
                      </div>
                    </div>

                    <div className="flex items-center justify-between ml-6">
                      <div className="flex items-center space-x-4">
                        {/* Rank Icon */}
                        <div className="flex-shrink-0">
                          {getRankIcon(i)}
                        </div>
                        
                        {/* User Info */}
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">
                            {u.name}
                          </h3>
                          {i < 3 && (
                            <p className="text-sm text-blue-600 font-medium">
                              {i === 0 ? '🏆 Champion' : i === 1 ? '🥈 Runner-up' : '🥉 Third Place'}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Login Stats */}
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          <Activity className="w-5 h-5 text-blue-600" />
                          <span className="text-2xl font-bold text-blue-800">
                            {u.loginHistory?.length || 0}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {(u.loginHistory?.length || 0) === 1 ? 'login' : 'logins'}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar for Top 3 */}
                    {i < 3 && users.length > 0 && (
                      <div className="mt-4 ml-6">
                        <div className="w-full bg-white rounded-full h-2 shadow-inner">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000"
                            style={{ 
                              width: `${((u.loginHistory?.length || 0) / (users[0]?.loginHistory?.length || 1)) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Stats */}
          {users.length > 0 && (
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-t">
              <div className="flex justify-center items-center space-x-8 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-800">
                    {users.reduce((sum, user) => sum + (user.loginHistory?.length || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Logins</div>
                </div>
                <div className="w-px h-10 bg-gray-300"></div>
                <div>
                  <div className="text-2xl font-bold text-blue-800">
                    {users.length > 0 ? Math.round(users.reduce((sum, user) => sum + (user.loginHistory?.length || 0), 0) / users.length) : 0}
                  </div>
                  <div className="text-sm text-gray-600">Avg per User</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}