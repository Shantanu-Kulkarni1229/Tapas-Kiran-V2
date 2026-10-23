// Which query/history records a user may see. One place, so every endpoint applies the same rule:
// officer = own; station_admin = own station only; super_admin = everything.
export function historyScope(user) {
  if (user.role === "super_admin") return {};
  if (user.role === "station_admin") return { stationKey: user.stationKey };
  return { userId: user._id };
}
