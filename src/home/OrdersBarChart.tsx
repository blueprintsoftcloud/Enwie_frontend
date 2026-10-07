import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Utility: format date like "12 Dec"
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};

interface SalesChartItem {
  _id: string;
  orders: number;
  revenue: number;
}

interface OrdersBarChartProps {
  data?: SalesChartItem[];
}

const OrdersBarChart = ({ data = [] }: OrdersBarChartProps) => {
  /**
   * Backend salesChart format:
   * [
   *   { _id: "2025-12-10", orders: 15, revenue: 12000 }
   * ]
   */

  const chartData = useMemo(() => {
    if (!data.length) return [];

    return data.map((item) => ({
      name: formatDate(item._id), // X-axis
      Orders: item.orders, // Bar value
      Revenue: item.revenue, // Tooltip usage
    }));
  }, [data]);

  return (
    <div className="bg-white shadow rounded p-6 mt-6">
      <h3 className="text-lg font-semibold mb-4">Orders Over Time</h3>

      {chartData.length === 0 ? (
        <div className="h-75 flex items-center justify-center text-sm text-gray-500">
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip
              formatter={(value) => [`${value}`, "Orders"]}
              labelFormatter={(label: string) => `Date: ${label}`}
            />
            <Bar dataKey="Orders" fill="#5e785a" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default OrdersBarChart;
