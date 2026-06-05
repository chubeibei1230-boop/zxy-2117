import { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  dashboardApi,
  zonesApi,
  usersApi,
  tasksApi,
} from "@/services/api";
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  ROLE_LABELS,
  type DashboardStats,
  type ActivityLog,
  type ZoneOut,
  type UserOut,
  type TaskOut,
  type TaskStatus,
} from "@/types";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Flag,
} from "lucide-react";

const statusIcons: Record<TaskStatus, React.ReactNode> = {
  pending: <Clock className="w-5 h-5 text-yellow-600" />,
  in_progress: <Loader2 className="w-5 h-5 text-blue-600" />,
  pending_review: <AlertTriangle className="w-5 h-5 text-purple-600" />,
  completed: <CheckCircle2 className="w-5 h-5 text-green-600" />,
  cancelled: <XCircle className="w-5 h-5 text-gray-500" />,
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<ActivityLog[]>([]);
  const [zones, setZones] = useState<ZoneOut[]>([]);
  const [users, setUsers] = useState<UserOut[]>([]);
  const [tasks, setTasks] = useState<TaskOut[]>([]);
  const [exceptions, setExceptions] = useState<Record<string, number>>({});

  useEffect(() => {
    Promise.all([
      dashboardApi.stats(),
      dashboardApi.recent(),
      dashboardApi.exceptions(),
      zonesApi.list(),
      usersApi.list(),
      tasksApi.list(),
    ]).then(([s, r, e, z, u, t]) => {
      setStats(s);
      setRecent(r);
      setExceptions(e.by_zone || {});
      setZones(z);
      setUsers(u);
      setTasks(t);
    });
  }, []);

  const pieOption = {
    tooltip: { trigger: "item" as const },
    legend: { bottom: 0, textStyle: { fontSize: 12 } },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: "#fff", borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: "bold" } },
        data: stats
          ? Object.entries(stats.by_status).map(([k, v]) => ({
              name: TASK_STATUS_LABELS[k as TaskStatus],
              value: v,
              itemStyle: {
                color:
                  k === "pending"
                    ? "#F9A825"
                    : k === "in_progress"
                    ? "#1E88E5"
                    : k === "pending_review"
                    ? "#8E24AA"
                    : k === "completed"
                    ? "#2E7D32"
                    : "#9E9E9E",
              },
            }))
          : [],
      },
    ],
  };

  const workerUsers = users.filter((u) => u.role === "worker");
  const workloadData = workerUsers.map((u) => {
    const count = tasks.filter(
      (t) => t.assignee_id === u.id && t.status !== "completed" && t.status !== "cancelled"
    ).length;
    return { name: u.username, count };
  });

  const barOption = {
    tooltip: {},
    grid: { left: 80, right: 20, top: 10, bottom: 30 },
    xAxis: { type: "value" as const, minInterval: 1 },
    yAxis: {
      type: "category" as const,
      data: workloadData.map((d) => d.name),
      axisLabel: { fontSize: 12 },
    },
    series: [
      {
        type: "bar",
        data: workloadData.map((d) => ({
          value: d.count,
          itemStyle: {
            color: "#43A047",
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barWidth: 20,
      },
    ],
  };

  const exceptionData = zones.map((z) => ({
    name: z.name,
    abnormal: Math.round(z.slot_count * (1 - z.utilization / 100)),
  }));

  const exceptionOption = {
    tooltip: {},
    grid: { left: 60, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: "category" as const,
      data: exceptionData.map((d) => d.name),
      axisLabel: { fontSize: 12 },
    },
    yAxis: { type: "value" as const, minInterval: 1 },
    series: [
      {
        type: "bar",
        data: exceptionData.map((d) => ({
          value: d.abnormal,
          itemStyle: { color: "#FF8F00", borderRadius: [4, 4, 0, 0] },
        })),
        barWidth: 36,
      },
    ],
  };

  const totalAbnormal = Object.values(exceptions).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#1B5E20]">仪表盘</h2>
        {totalAbnormal > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
            <Flag className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700 font-medium">
              {totalAbnormal} 个异常盘位待处理
            </span>
          </div>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {(Object.entries(stats.by_status) as [TaskStatus, number][]).map(
            ([status, count]) => (
              <div
                key={status}
                className="bg-white rounded-xl p-4 border border-[#C8E6C9] flex items-center gap-3"
              >
                <div className="shrink-0">{statusIcons[status]}</div>
                <div>
                  <div className="text-2xl font-bold text-[#37474F]">
                    {count}
                  </div>
                  <div className="text-xs text-[#78909C]">
                    {TASK_STATUS_LABELS[status]}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 border border-[#C8E6C9]">
          <h3 className="text-sm font-semibold text-[#37474F] mb-3">
            任务进度分布
          </h3>
          <ReactECharts option={pieOption} style={{ height: 260 }} />
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#C8E6C9]">
          <h3 className="text-sm font-semibold text-[#37474F] mb-3">
            人员负载
          </h3>
          <ReactECharts option={barOption} style={{ height: 260 }} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 border border-[#C8E6C9]">
          <h3 className="text-sm font-semibold text-[#37474F] mb-3">
            异常分布
          </h3>
          <ReactECharts option={exceptionOption} style={{ height: 240 }} />
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#C8E6C9]">
          <h3 className="text-sm font-semibold text-[#37474F] mb-3">
            最近操作
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {recent.length === 0 && (
              <div className="text-sm text-[#78909C]">暂无操作记录</div>
            )}
            {recent.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 text-sm px-2 py-1.5 rounded-lg hover:bg-[#F1F8E9]"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#43A047] mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-[#37474F]">{log.action}</span>
                  {log.detail && (
                    <span className="text-[#78909C] ml-1">- {log.detail}</span>
                  )}
                </div>
                <span className="text-xs text-[#9E9E9E] shrink-0">
                  {new Date(log.created_at).toLocaleString("zh-CN", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
