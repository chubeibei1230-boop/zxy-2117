export type UserRole = "admin" | "worker" | "reviewer";

export interface UserOut {
  id: number;
  username: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface UserCreate {
  username: string;
  password: string;
  role: UserRole;
}

export interface UserUpdate {
  username?: string;
  password?: string;
  role?: UserRole;
  is_active?: boolean;
}

export interface ZoneOut {
  id: number;
  name: string;
  description: string;
  slot_count: number;
  utilization: number;
}

export interface ZoneCreate {
  name: string;
  description?: string;
}

export interface ZoneUpdate {
  name?: string;
  description?: string;
}

export interface SlotOut {
  id: number;
  zone_id: number;
  position: string;
  status: "empty" | "in_use" | "abnormal";
  current_task_id: number | null;
}

export interface SlotCreate {
  position: string;
  status?: "empty" | "in_use" | "abnormal";
}

export interface SlotUpdate {
  status?: "empty" | "in_use" | "abnormal";
  current_task_id?: number | null;
}

export type TaskStatus = "pending" | "in_progress" | "pending_review" | "completed" | "cancelled";

export interface TaskOut {
  id: number;
  title: string;
  status: TaskStatus;
  zone_id: number;
  slot_id: number | null;
  assignee_id: number | null;
  reviewer_id: number | null;
  planned_time: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface TaskCreate {
  title: string;
  zone_id: number;
  slot_id?: number;
  assignee_id?: number;
  reviewer_id?: number;
  planned_time?: string;
  notes?: string;
}

export interface TaskUpdate {
  title?: string;
  zone_id?: number;
  slot_id?: number | null;
  assignee_id?: number | null;
  reviewer_id?: number | null;
  planned_time?: string | null;
  notes?: string;
}

export interface TaskDetailOut extends TaskOut {
  undo_count: number;
  redo_count: number;
  history: HistoryEntry[];
}

export interface HistoryEntry {
  id: number;
  task_id: number;
  field_name: string;
  old_value: string;
  new_value: string;
  created_at: string;
  undone: boolean;
}

export interface DashboardStats {
  by_status: Record<TaskStatus, number>;
  total: number;
}

export interface DashboardExceptions {
  by_zone: Record<string, number>;
}

export interface DashboardWorkload {
  by_user: Record<string, number>;
}

export interface ActivityLog {
  id: number;
  user_id: number | null;
  action: string;
  detail: string;
  created_at: string;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "待处理",
  in_progress: "进行中",
  pending_review: "待复核",
  completed: "已完成",
  cancelled: "已取消",
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  pending_review: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-600",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "管理员",
  worker: "育苗员",
  reviewer: "复核员",
};

export const FIELD_LABELS: Record<string, string> = {
  slot_id: "盘位",
  assignee_id: "责任人",
  planned_time: "计划时间",
  notes: "备注",
};
