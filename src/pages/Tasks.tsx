import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { tasksApi, zonesApi, usersApi } from "@/services/api";
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  ROLE_LABELS,
  type TaskOut,
  type TaskStatus,
  type ZoneOut,
  type UserOut,
} from "@/types";
import {
  Plus,
  Search,
  Undo2,
  Redo2,
  Play,
  Send,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Eye,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";

export default function Tasks() {
  const [tasks, setTasks] = useState<TaskOut[]>([]);
  const [zones, setZones] = useState<ZoneOut[]>([]);
  const [users, setUsers] = useState<UserOut[]>([]);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "">("");
  const [filterZone, setFilterZone] = useState<number | "">("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const roleAllowedActions: Record<string, string[]> = {
    admin: ["start", "submit_review", "approve", "reject", "cancel"],
    worker: ["start", "submit_review", "cancel"],
    reviewer: ["approve", "reject"],
  };

  const load = useCallback(() => {
    Promise.all([
      tasksApi.list({
        status: filterStatus || undefined,
        zone_id: filterZone || undefined,
      } as any),
      zonesApi.list(),
      usersApi.list(),
    ]).then(([t, z, u]) => {
      setTasks(t);
      setZones(z);
      setUsers(u);
    });
  }, [filterStatus, filterZone]);

  useEffect(() => { load(); }, [load]);

  const filtered = tasks.filter((t) =>
    !search || t.title.toLowerCase().includes(search.toLowerCase())
  );

  const getZoneName = (id: number | null) =>
    zones.find((z) => z.id === id)?.name || "-";
  const getUserName = (id: number | null) =>
    users.find((u) => u.id === id)?.username || "-";

  const handleTransition = async (id: number, action: string) => {
    await tasksApi.transition(id, action);
    load();
  };

  const handleUndo = async (id: number) => {
    await tasksApi.undo(id);
    load();
  };

  const handleRedo = async (id: number) => {
    await tasksApi.redo(id);
    load();
  };

  const transitionButtons: Record<
    TaskStatus,
    { action: string; label: string; icon: any; color: string }[]
  > = {
    pending: [
      { action: "start", label: "开始执行", icon: Play, color: "bg-blue-500 hover:bg-blue-600" },
      { action: "cancel", label: "取消", icon: XCircle, color: "bg-gray-400 hover:bg-gray-500" },
    ],
    in_progress: [
      { action: "submit_review", label: "提交复核", icon: Send, color: "bg-purple-500 hover:bg-purple-600" },
      { action: "cancel", label: "取消", icon: XCircle, color: "bg-gray-400 hover:bg-gray-500" },
    ],
    pending_review: [
      { action: "approve", label: "复核通过", icon: CheckCircle2, color: "bg-green-600 hover:bg-green-700" },
      { action: "reject", label: "驳回", icon: RotateCcw, color: "bg-orange-500 hover:bg-orange-600" },
    ],
    completed: [],
    cancelled: [],
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#1B5E20]">任务管理</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1B5E20] text-white rounded-lg hover:bg-[#2E7D32] text-sm"
        >
          <Plus className="w-4 h-4" /> 新增任务
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78909C]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索任务..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#C8E6C9] bg-white text-sm outline-none focus:ring-2 focus:ring-[#2E7D32]"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as TaskStatus | "")}
          className="px-3 py-2 rounded-lg border border-[#C8E6C9] bg-white text-sm outline-none"
        >
          <option value="">全部状态</option>
          {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterZone}
          onChange={(e) => setFilterZone(e.target.value ? Number(e.target.value) : "")}
          className="px-3 py-2 rounded-lg border border-[#C8E6C9] bg-white text-sm outline-none"
        >
          <option value="">全部棚区</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
      </div>

      {showCreate && (
        <CreateTaskForm
          zones={zones}
          users={users}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}

      <div className="bg-white rounded-xl border border-[#C8E6C9] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F1F8E9] text-[#37474F]">
              <th className="text-left px-4 py-3 font-medium">任务</th>
              <th className="text-left px-4 py-3 font-medium">棚区</th>
              <th className="text-left px-4 py-3 font-medium">责任人</th>
              <th className="text-left px-4 py-3 font-medium">状态</th>
              <th className="text-left px-4 py-3 font-medium">计划时间</th>
              <th className="text-center px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((task) => (
              <tr key={task.id} className="border-t border-[#E8F5E9] hover:bg-[#FAFFF5]">
                <td className="px-4 py-3">
                  <button
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="text-[#1B5E20] hover:underline font-medium"
                  >
                    {task.title}
                  </button>
                </td>
                <td className="px-4 py-3 text-[#546E7A]">{getZoneName(task.zone_id)}</td>
                <td className="px-4 py-3 text-[#546E7A]">{getUserName(task.assignee_id)}</td>
                <td className="px-4 py-3">
                  <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", TASK_STATUS_COLORS[task.status])}>
                    {TASK_STATUS_LABELS[task.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#78909C]">{task.planned_time || "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleUndo(task.id)}
                      title="撤销"
                      className="p-1.5 rounded-lg hover:bg-[#E8F5E9] text-[#78909C] hover:text-[#1B5E20]"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRedo(task.id)}
                      title="重做"
                      className="p-1.5 rounded-lg hover:bg-[#E8F5E9] text-[#78909C] hover:text-[#1B5E20]"
                    >
                      <Redo2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      title="详情"
                      className="p-1.5 rounded-lg hover:bg-[#E8F5E9] text-[#78909C] hover:text-[#1B5E20]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {transitionButtons[task.status]
                      .filter((btn) => !user || roleAllowedActions[user.role]?.includes(btn.action))
                      .map((btn) => (
                      <button
                        key={btn.action}
                        onClick={() => handleTransition(task.id, btn.action)}
                        className={cn(
                          "p-1.5 rounded-lg text-white text-xs",
                          btn.color
                        )}
                        title={btn.label}
                      >
                        <btn.icon className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-[#78909C]">
                  暂无任务
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreateTaskForm({
  zones,
  users,
  onClose,
  onCreated,
}: {
  zones: ZoneOut[];
  users: UserOut[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [zoneId, setZoneId] = useState<number>(zones[0]?.id || 0);
  const [assigneeId, setAssigneeId] = useState<number | "">("");
  const [plannedTime, setPlannedTime] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await tasksApi.create({
      title,
      zone_id: zoneId,
      assignee_id: assigneeId ? Number(assigneeId) : undefined,
      planned_time: plannedTime || undefined,
      notes: notes || undefined,
    });
    onCreated();
  };

  const workers = users.filter((u) => u.role === "worker");

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl p-5 border border-[#C8E6C9] space-y-4"
    >
      <h3 className="font-semibold text-[#37474F]">新增任务</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[#546E7A] mb-1">任务名称</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#C8E6C9] focus:ring-2 focus:ring-[#2E7D32] outline-none text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-[#546E7A] mb-1">棚区</label>
          <select
            value={zoneId}
            onChange={(e) => setZoneId(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border border-[#C8E6C9] outline-none text-sm"
          >
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-[#546E7A] mb-1">责任人</label>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : "")}
            className="w-full px-3 py-2 rounded-lg border border-[#C8E6C9] outline-none text-sm"
          >
            <option value="">未指定</option>
            {workers.map((u) => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-[#546E7A] mb-1">计划时间</label>
          <input
            type="date"
            value={plannedTime}
            onChange={(e) => setPlannedTime(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#C8E6C9] outline-none text-sm"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm text-[#546E7A] mb-1">备注</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#C8E6C9] outline-none text-sm"
            placeholder="可选"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="px-4 py-1.5 bg-[#1B5E20] text-white rounded-lg text-sm hover:bg-[#2E7D32]">
          创建
        </button>
        <button type="button" onClick={onClose} className="px-4 py-1.5 border border-[#C8E6C9] rounded-lg text-sm text-[#546E7A]">
          取消
        </button>
      </div>
    </form>
  );
}
