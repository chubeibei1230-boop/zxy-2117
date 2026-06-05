import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { zonesApi, tasksApi, usersApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth";
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  ROLE_LABELS,
  type ZoneOut,
  type SlotOut,
  type TaskOut,
  type UserOut,
  type TaskCreate,
  type TaskStatus,
} from "@/types";
import {
  Grid3X3,
  Plus,
  X,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
  Edit3,
  Save,
  Flag,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SLOT_STATUS_LABELS: Record<string, string> = {
  empty: "空闲",
  in_use: "使用中",
  abnormal: "异常",
};

const SLOT_STATUS_COLORS: Record<string, string> = {
  empty: "bg-gray-100 border-gray-300 hover:border-gray-400",
  in_use: "bg-blue-50 border-blue-400 hover:border-blue-500",
  abnormal: "bg-red-50 border-red-400 hover:border-red-500",
};

const TASK_STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5 text-yellow-600" />,
  in_progress: <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />,
  pending_review: <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />,
  cancelled: <XCircle className="w-3.5 h-3.5 text-gray-500" />,
};

interface SlotWithTask extends SlotOut {
  task?: TaskOut;
}

export default function SlotSchedule() {
  const [zones, setZones] = useState<ZoneOut[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [slots, setSlots] = useState<SlotWithTask[]>([]);
  const [tasks, setTasks] = useState<TaskOut[]>([]);
  const [users, setUsers] = useState<UserOut[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotWithTask | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showEditTask, setShowEditTask] = useState(false);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [newTaskForm, setNewTaskForm] = useState<Partial<TaskCreate>>({
    title: "",
    assignee_id: undefined,
    planned_time: "",
    notes: "",
  });

  const [editForm, setEditForm] = useState<{
    slot_id?: number | null;
    assignee_id?: number | null;
  }>({});

  const loadZones = useCallback(() => {
    zonesApi.list().then((z) => {
      setZones(z);
      if (z.length > 0 && !selectedZoneId) {
        setSelectedZoneId(z[0].id);
      }
    });
  }, [selectedZoneId]);

  const loadSlots = useCallback(() => {
    if (!selectedZoneId) return;
    zonesApi.getSlots(selectedZoneId).then(async (s) => {
      const tasksList = await tasksApi.list({ zone_id: selectedZoneId });
      setTasks(tasksList);
      const slotsWithTasks = s.map((slot) => ({
        ...slot,
        task: tasksList.find((t) => t.slot_id === slot.id && t.status !== "completed" && t.status !== "cancelled"),
      }));
      setSlots(slotsWithTasks);
    });
  }, [selectedZoneId]);

  const loadUsers = useCallback(() => {
    usersApi.list().then(setUsers);
  }, []);

  useEffect(() => {
    loadZones();
    loadUsers();
  }, [loadZones, loadUsers]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const refreshData = useCallback(() => {
    loadSlots();
  }, [loadSlots]);

  const workers = users.filter((u) => u.role === "worker");

  const handleSlotClick = (slot: SlotWithTask) => {
    setSelectedSlot(slot);
    setShowCreateTask(false);
    setShowEditTask(false);
  };

  const handleCreateTask = async () => {
    if (!selectedSlot || !newTaskForm.title.trim() || !selectedZoneId) return;
    
    await tasksApi.create({
      title: newTaskForm.title,
      zone_id: selectedZoneId,
      slot_id: selectedSlot.id,
      assignee_id: newTaskForm.assignee_id,
      planned_time: newTaskForm.planned_time || undefined,
      notes: newTaskForm.notes,
    });
    
    setShowCreateTask(false);
    setNewTaskForm({ title: "", assignee_id: undefined, planned_time: "", notes: "" });
    refreshData();
    setSelectedSlot(null);
  };

  const handleMarkAbnormal = async (slotId: number) => {
    if (!confirm("确定标记此盘位为异常状态？")) return;
    await zonesApi.updateSlot(slotId, { status: "abnormal" });
    refreshData();
    setSelectedSlot(null);
  };

  const handleMarkNormal = async (slotId: number) => {
    await zonesApi.updateSlot(slotId, { status: "empty" });
    refreshData();
    setSelectedSlot(null);
  };

  const handleEditTask = async () => {
    if (!selectedSlot?.task) return;
    
    const updates: any = {};
    if (editForm.slot_id !== undefined && editForm.slot_id !== selectedSlot.task.slot_id) {
      updates.slot_id = editForm.slot_id;
    }
    if (editForm.assignee_id !== undefined && editForm.assignee_id !== selectedSlot.task.assignee_id) {
      updates.assignee_id = editForm.assignee_id;
    }
    
    if (Object.keys(updates).length > 0) {
      await tasksApi.update(selectedSlot.task.id, updates);
    }
    
    setShowEditTask(false);
    setEditForm({});
    refreshData();
    setSelectedSlot(null);
  };

  const getAvailableSlots = () => {
    return slots.filter((s) => s.status === "empty" && !s.task);
  };

  const zoneStats = zones.map((z) => {
    const zoneSlots = slots.filter((s) => s.zone_id === z.id);
    const inUse = zoneSlots.filter((s) => s.status === "in_use" || s.task).length;
    const abnormal = zoneSlots.filter((s) => s.status === "abnormal").length;
    return {
      zone: z,
      total: zoneSlots.length,
      inUse,
      abnormal,
      utilization: zoneSlots.length > 0 ? Math.round((inUse / zoneSlots.length) * 100) : 0,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1B5E20]">盘位任务调度</h2>
          <p className="text-sm text-[#78909C] mt-1">按棚区查看盘位占用情况，集中管理任务与责任人</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {zoneStats.map(({ zone, total, inUse, abnormal, utilization }) => (
          <div
            key={zone.id}
            onClick={() => setSelectedZoneId(zone.id)}
            className={cn(
              "bg-white rounded-xl p-4 border cursor-pointer transition-all",
              selectedZoneId === zone.id
                ? "border-[#43A047] ring-2 ring-[#43A047]/20"
                : "border-[#C8E6C9] hover:border-[#A5D6A7]"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-[#1B5E20]">{zone.name}</h3>
              <Grid3X3 className="w-4 h-4 text-[#78909C]" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-lg font-bold text-[#37474F]">{total}</div>
                <div className="text-[#78909C]">总盘位</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">{inUse}</div>
                <div className="text-[#78909C]">使用中</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-500">{abnormal}</div>
                <div className="text-[#78909C]">异常</div>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-[#78909C] mb-1">
                <span>利用率</span>
                <span>{utilization}%</span>
              </div>
              <div className="w-full bg-[#E8F5E9] rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-[#43A047] transition-all"
                  style={{ width: `${utilization}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedZoneId && (
        <div className="bg-white rounded-xl p-5 border border-[#C8E6C9]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#37474F]">
              {zones.find((z) => z.id === selectedZoneId)?.name} - 盘位视图
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300" />
                <span className="text-[#78909C]">空闲</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-blue-50 border border-blue-400" />
                <span className="text-[#78909C]">使用中</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-50 border border-red-400" />
                <span className="text-[#78909C]">异常</span>
              </div>
            </div>
          </div>

          {slots.length === 0 ? (
            <div className="text-center py-16 text-[#78909C]">
              <Grid3X3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <div>暂无盘位数据</div>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  onClick={() => handleSlotClick(slot)}
                  className={cn(
                    "aspect-square rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer transition-all relative",
                    SLOT_STATUS_COLORS[slot.status],
                    slot.task && "border-blue-500 bg-blue-50",
                    selectedSlot?.id === slot.id && "ring-2 ring-[#43A047] ring-offset-2"
                  )}
                >
                  <span className="text-xs font-semibold text-[#37474F]">
                    {slot.position}
                  </span>
                  {slot.task && (
                    <div className="absolute -top-1 -right-1">
                      {TASK_STATUS_ICONS[slot.task.status as TaskStatus]}
                    </div>
                  )}
                  {slot.status === "abnormal" && (
                    <div className="absolute -top-1 -right-1">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#C8E6C9]">
              <div>
                <h3 className="font-semibold text-[#1B5E20] text-lg">
                  盘位 {selectedSlot.position}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      selectedSlot.status === "empty" && "bg-gray-100 text-gray-700",
                      selectedSlot.status === "in_use" && "bg-blue-100 text-blue-700",
                      selectedSlot.status === "abnormal" && "bg-red-100 text-red-700"
                    )}
                  >
                    {SLOT_STATUS_LABELS[selectedSlot.status]}
                  </span>
                  <span className="text-xs text-[#78909C]">
                    {zones.find((z) => z.id === selectedSlot.zone_id)?.name}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedSlot(null)}
                className="p-1.5 rounded-lg hover:bg-[#E8F5E9] transition-colors"
              >
                <X className="w-5 h-5 text-[#546E7A]" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {selectedSlot.task ? (
                <div className="space-y-4">
                  <div className="bg-[#F1F8E9] rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-[#1B5E20]">
                          {selectedSlot.task.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-medium",
                              TASK_STATUS_COLORS[selectedSlot.task.status as TaskStatus]
                            )}
                          >
                            {TASK_STATUS_LABELS[selectedSlot.task.status as TaskStatus]}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/tasks/${selectedSlot.task?.id}`)}
                        className="p-1.5 rounded-lg hover:bg-[#E8F5E9] transition-colors"
                        title="查看任务详情"
                      >
                        <ExternalLink className="w-4 h-4 text-[#546E7A]" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-[#78909C] text-xs mb-0.5">责任人</div>
                        <div className="text-[#37474F]">
                          {users.find((u) => u.id === selectedSlot.task?.assignee_id)?.username || "未指定"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#78909C] text-xs mb-0.5">计划时间</div>
                        <div className="text-[#37474F]">
                          {selectedSlot.task.planned_time
                            ? new Date(selectedSlot.task.planned_time).toLocaleDateString("zh-CN")
                            : "未设置"}
                        </div>
                      </div>
                    </div>

                    {selectedSlot.task.notes && (
                      <div className="mt-3 pt-3 border-t border-[#C8E6C9]">
                        <div className="text-[#78909C] text-xs mb-0.5">备注</div>
                        <div className="text-sm text-[#37474F]">{selectedSlot.task.notes}</div>
                      </div>
                    )}
                  </div>

                  {!showEditTask ? (
                    <div className="flex gap-2">
                      {user?.role === "admin" && (
                        <button
                          onClick={() => {
                            setShowEditTask(true);
                            setEditForm({
                              slot_id: selectedSlot.task?.slot_id,
                              assignee_id: selectedSlot.task?.assignee_id,
                            });
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-[#C8E6C9] rounded-lg text-sm text-[#546E7A] hover:bg-[#F1F8E9] transition-colors"
                        >
                          <Edit3 className="w-4 h-4" /> 调整
                        </button>
                      )}
                      {selectedSlot.status !== "abnormal" && user?.role === "admin" && (
                        <button
                          onClick={() => handleMarkAbnormal(selectedSlot.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Flag className="w-4 h-4" /> 标记异常
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-[#37474F] text-sm">调整任务</h4>
                      
                      <div>
                        <label className="block text-xs text-[#78909C] mb-1">调整盘位</label>
                        <select
                          value={editForm.slot_id ?? ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              slot_id: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-[#C8E6C9] outline-none text-sm"
                        >
                          <option value="">保持当前</option>
                          {getAvailableSlots().map((s) => (
                            <option key={s.id} value={s.id}>
                              盘位 {s.position}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-[#78909C] mb-1">调整责任人</label>
                        <select
                          value={editForm.assignee_id ?? ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              assignee_id: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-[#C8E6C9] outline-none text-sm"
                        >
                          <option value="">保持当前</option>
                          {workers.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.username}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleEditTask}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1B5E20] text-white rounded-lg text-sm hover:bg-[#2E7D32] transition-colors"
                        >
                          <Save className="w-4 h-4" /> 保存
                        </button>
                        <button
                          onClick={() => {
                            setShowEditTask(false);
                            setEditForm({});
                          }}
                          className="flex-1 px-3 py-2 border border-[#C8E6C9] rounded-lg text-sm text-[#546E7A] hover:bg-white transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedSlot.status === "abnormal" ? (
                    <>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          <span className="font-medium text-red-700">此盘位当前为异常状态</span>
                        </div>
                        <p className="text-sm text-red-600">
                          请先处理异常情况后再分配任务
                        </p>
                      </div>
                      {user?.role === "admin" && (
                        <button
                          onClick={() => handleMarkNormal(selectedSlot.id)}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" /> 解除异常标记
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-center py-4">
                        <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                          <Grid3X3 className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-[#78909C] text-sm">此盘位当前空闲</p>
                      </div>

                      {!showCreateTask && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowCreateTask(true)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1B5E20] text-white rounded-lg text-sm hover:bg-[#2E7D32] transition-colors"
                          >
                            <Plus className="w-4 h-4" /> 快速创建任务
                          </button>
                          {user?.role === "admin" && (
                            <button
                              onClick={() => handleMarkAbnormal(selectedSlot.id)}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Flag className="w-4 h-4" /> 标记异常
                            </button>
                          )}
                        </div>
                      )}

                      {showCreateTask && (
                    <div className="space-y-3 bg-[#F1F8E9] rounded-lg p-4">
                      <h4 className="font-medium text-[#37474F] text-sm">新建任务</h4>
                      
                      <div>
                        <label className="block text-xs text-[#78909C] mb-1">任务标题 *</label>
                        <input
                          value={newTaskForm.title}
                          onChange={(e) =>
                            setNewTaskForm({ ...newTaskForm, title: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-[#C8E6C9] outline-none text-sm"
                          placeholder="请输入任务标题"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-[#78909C] mb-1">责任人</label>
                        <select
                          value={newTaskForm.assignee_id ?? ""}
                          onChange={(e) =>
                            setNewTaskForm({
                              ...newTaskForm,
                              assignee_id: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-[#C8E6C9] outline-none text-sm"
                        >
                          <option value="">未指定</option>
                          {workers.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.username}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-[#78909C] mb-1">计划时间</label>
                        <input
                          type="date"
                          value={newTaskForm.planned_time || ""}
                          onChange={(e) =>
                            setNewTaskForm({ ...newTaskForm, planned_time: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-[#C8E6C9] outline-none text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-[#78909C] mb-1">备注</label>
                        <textarea
                          value={newTaskForm.notes || ""}
                          onChange={(e) =>
                            setNewTaskForm({ ...newTaskForm, notes: e.target.value })
                          }
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg border border-[#C8E6C9] outline-none text-sm resize-none"
                          placeholder="可选"
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleCreateTask}
                          disabled={!newTaskForm.title.trim()}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1B5E20] text-white rounded-lg text-sm hover:bg-[#2E7D32] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="w-4 h-4" /> 创建
                        </button>
                        <button
                          onClick={() => {
                            setShowCreateTask(false);
                            setNewTaskForm({ title: "", assignee_id: undefined, planned_time: "", notes: "" });
                          }}
                          className="flex-1 px-3 py-2 border border-[#C8E6C9] rounded-lg text-sm text-[#546E7A] hover:bg-white transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                    )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
