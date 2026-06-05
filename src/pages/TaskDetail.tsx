import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { tasksApi, zonesApi, usersApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth";
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  FIELD_LABELS,
  ROLE_LABELS,
  type TaskDetailOut,
  type ZoneOut,
  type UserOut,
  type HistoryEntry,
  type TaskStatus,
} from "@/types";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Save,
  Play,
  Send,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const taskId = Number(id);
  const [task, setTask] = useState<TaskDetailOut | null>(null);
  const [zones, setZones] = useState<ZoneOut[]>([]);
  const [users, setUsers] = useState<UserOut[]>([]);
  const { user } = useAuthStore();

  const roleAllowedActions: Record<string, string[]> = {
    admin: ["start", "submit_review", "approve", "reject", "cancel"],
    worker: ["start", "submit_review", "cancel"],
    reviewer: ["approve", "reject"],
  };

  const [editSlotId, setEditSlotId] = useState<number | null | undefined>(undefined);
  const [editAssigneeId, setEditAssigneeId] = useState<number | null | undefined>(undefined);
  const [editPlannedTime, setEditPlannedTime] = useState<string | null | undefined>(undefined);
  const [editNotes, setEditNotes] = useState<string | undefined>(undefined);
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => {
    if (taskId) {
      tasksApi.get(taskId).then((t) => {
        setTask(t);
        setEditSlotId(t.slot_id);
        setEditAssigneeId(t.assignee_id);
        setEditPlannedTime(t.planned_time);
        setEditNotes(t.notes);
      });
      zonesApi.list().then(setZones);
      usersApi.list().then(setUsers);
    }
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  if (!task) return <div className="text-center py-16 text-[#78909C]">加载中...</div>;

  const workers = users.filter((u) => u.role === "worker");
  const reviewers = users.filter((u) => u.role === "reviewer");

  const undoCount = task.history.filter((h) => !h.undone).length;
  const redoCount = task.history.filter((h) => h.undone).length;

  const handleSave = async () => {
    const updates: any = {};
    if (editSlotId !== task.slot_id) updates.slot_id = editSlotId;
    if (editAssigneeId !== task.assignee_id) updates.assignee_id = editAssigneeId;
    if (editPlannedTime !== task.planned_time) updates.planned_time = editPlannedTime;
    if (editNotes !== task.notes) updates.notes = editNotes;
    if (Object.keys(updates).length > 0) {
      await tasksApi.update(taskId, updates);
    }
    setEditing(false);
    load();
  };

  const handleUndo = async () => {
    await tasksApi.undo(taskId);
    load();
  };

  const handleRedo = async () => {
    await tasksApi.redo(taskId);
    load();
  };

  const handleTransition = async (action: string) => {
    await tasksApi.transition(taskId, action);
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/tasks")} className="p-2 rounded-lg hover:bg-[#E8F5E9]">
          <ArrowLeft className="w-5 h-5 text-[#1B5E20]" />
        </button>
        <h2 className="text-xl font-bold text-[#1B5E20]">{task.title}</h2>
        <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", TASK_STATUS_COLORS[task.status])}>
          {TASK_STATUS_LABELS[task.status]}
        </span>
      </div>

      <div className="flex gap-1.5">
        {transitionButtons[task.status]
          .filter((btn) => !user || roleAllowedActions[user.role]?.includes(btn.action))
          .map((btn) => (
          <button
            key={btn.action}
            onClick={() => handleTransition(btn.action)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-sm", btn.color)}
          >
            <btn.icon className="w-4 h-4" /> {btn.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-[#C8E6C9] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#37474F]">任务信息</h3>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 border border-[#C8E6C9] rounded-lg text-sm text-[#546E7A] hover:bg-[#F1F8E9]"
              >
                编辑
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#1B5E20] text-white rounded-lg text-sm"
                >
                  <Save className="w-3.5 h-3.5" /> 保存
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditSlotId(task.slot_id);
                    setEditAssigneeId(task.assignee_id);
                    setEditPlannedTime(task.planned_time);
                    setEditNotes(task.notes);
                  }}
                  className="px-3 py-1.5 border border-[#C8E6C9] rounded-lg text-sm text-[#546E7A]"
                >
                  取消
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#78909C] mb-1">盘位</label>
              {editing ? (
                <select
                  value={editSlotId ?? ""}
                  onChange={(e) => setEditSlotId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 rounded-lg border border-[#C8E6C9] outline-none text-sm"
                >
                  <option value="">未指定</option>
                  {zones
                    .filter((z) => z.id === task.zone_id)
                    .flatMap((z) => [])
                  }
                  <option value="1">A1-1</option>
                  <option value="2">A1-2</option>
                  <option value="3">A1-3</option>
                  <option value="4">A1-4</option>
                  <option value="5">A1-5</option>
                </select>
              ) : (
                <div className="text-sm text-[#37474F]">
                  {task.slot_id ? `盘位 #${task.slot_id}` : "未指定"}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm text-[#78909C] mb-1">责任人</label>
              {editing ? (
                <select
                  value={editAssigneeId ?? ""}
                  onChange={(e) => setEditAssigneeId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 rounded-lg border border-[#C8E6C9] outline-none text-sm"
                >
                  <option value="">未指定</option>
                  {workers.map((u) => (
                    <option key={u.id} value={u.id}>{u.username}</option>
                  ))}
                </select>
              ) : (
                <div className="text-sm text-[#37474F]">
                  {users.find((u) => u.id === task.assignee_id)?.username || "未指定"}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm text-[#78909C] mb-1">计划时间</label>
              {editing ? (
                <input
                  type="date"
                  value={editPlannedTime ?? ""}
                  onChange={(e) => setEditPlannedTime(e.target.value || null)}
                  className="w-full px-3 py-2 rounded-lg border border-[#C8E6C9] outline-none text-sm"
                />
              ) : (
                <div className="text-sm text-[#37474F]">{task.planned_time || "未设置"}</div>
              )}
            </div>

            <div>
              <label className="block text-sm text-[#78909C] mb-1">复核员</label>
              <div className="text-sm text-[#37474F]">
                {users.find((u) => u.id === task.reviewer_id)?.username || "未指定"}
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-[#78909C] mb-1">备注</label>
              {editing ? (
                <textarea
                  value={editNotes ?? ""}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-[#C8E6C9] outline-none text-sm resize-none"
                />
              ) : (
                <div className="text-sm text-[#37474F]">{task.notes || "无"}</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 border border-[#C8E6C9]">
            <h3 className="font-semibold text-[#37474F] mb-3">撤销/重做</h3>
            <div className="flex gap-3">
              <button
                onClick={handleUndo}
                disabled={undoCount === 0}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-[#C8E6C9] text-sm disabled:opacity-40 hover:bg-[#F1F8E9] disabled:hover:bg-white"
              >
                <Undo2 className="w-4 h-4" />
                撤销
                <span className="bg-[#E8F5E9] px-1.5 py-0.5 rounded text-xs text-[#2E7D32]">
                  {undoCount}
                </span>
              </button>
              <button
                onClick={handleRedo}
                disabled={redoCount === 0}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-[#C8E6C9] text-sm disabled:opacity-40 hover:bg-[#F1F8E9] disabled:hover:bg-white"
              >
                <Redo2 className="w-4 h-4" />
                重做
                <span className="bg-[#E8F5E9] px-1.5 py-0.5 rounded text-xs text-[#2E7D32]">
                  {redoCount}
                </span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-[#C8E6C9]">
            <h3 className="font-semibold text-[#37474F] mb-3">变更历史</h3>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {task.history.length === 0 && (
                <div className="text-sm text-[#78909C]">暂无变更记录</div>
              )}
              {[...task.history].reverse().map((h) => (
                <div
                  key={h.id}
                  className={cn(
                    "text-sm px-3 py-2 rounded-lg",
                    h.undone ? "bg-[#FFF3E0] text-[#E65100] line-through" : "bg-[#F1F8E9] text-[#37474F]"
                  )}
                >
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{FIELD_LABELS[h.field_name] || h.field_name}</span>
                    {h.undone && (
                      <span className="text-[10px] bg-[#FFE0B2] px-1.5 py-0.5 rounded">已撤销</span>
                    )}
                  </div>
                  <div className="text-xs text-[#78909C] mt-0.5">
                    "{h.old_value}" → "{h.new_value}"
                  </div>
                  <div className="text-[10px] text-[#9E9E9E] mt-0.5">
                    {new Date(h.created_at).toLocaleString("zh-CN")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
