export default function OwnerDashboard() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1F3A]">
            Facility Owner Dashboard
          </h1>
          <p className="text-gray-500 text-sm">
            Real-time occupancy, today&apos;s bookings, and earnings ledger
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">
            Today&apos;s Bookings
          </p>
          <p className="text-3xl font-bold text-[#0B1F3A] mt-2">28</p>
          <span className="text-xs text-green-600 font-semibold">
            +12% vs yesterday
          </span>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Current Occupancy</p>
          <p className="text-3xl font-bold text-[#1E6FFF] mt-2">75%</p>
          <span className="text-xs text-gray-500">15 / 20 slots occupied</span>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">
            Today&apos;s Revenue
          </p>
          <p className="text-3xl font-bold text-[#12B5A6] mt-2">PKR 11,200</p>
          <span className="text-xs text-gray-500">28 hours booked</span>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Active Facilities</p>
          <p className="text-3xl font-bold text-[#0B1F3A] mt-2">2</p>
          <span className="text-xs text-gray-500">
            Demo Plaza, Gulberg Plaza
          </span>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-[#0B1F3A] mb-4">
          Live Check-ins & Arrivals
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="p-3">Reference</th>
                <th className="p-3">Slot</th>
                <th className="p-3">Vehicle Plate</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              <tr>
                <td className="p-3 font-mono font-medium">PB-3A9F-201</td>
                <td className="p-3">AB-1</td>
                <td className="p-3 font-semibold">LEA-1234</td>
                <td className="p-3">2 Hours</td>
                <td className="p-3">PKR 400</td>
                <td className="p-3">
                  <span className="px-2.5 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-semibold">
                    CHECKED_IN
                  </span>
                </td>
              </tr>
              <tr>
                <td className="p-3 font-mono font-medium">PB-8B1C-104</td>
                <td className="p-3">AB-2</td>
                <td className="p-3 font-semibold">PAY-555</td>
                <td className="p-3">1 Hour</td>
                <td className="p-3">PKR 200</td>
                <td className="p-3">
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                    CONFIRMED
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
