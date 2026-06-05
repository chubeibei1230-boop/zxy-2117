import axios from "axios";
import type {
  UserOut,
  UserCreate,
  UserUpdate,
  ZoneOut,
  ZoneCreate,
  ZoneUpdate,
  SlotOut,
  SlotCreate,
  SlotUpdate,
  TaskOut,
  TaskCreate,
  TaskUpdate,
  TaskDetailOut,
  HistoryEntry,
  DashboardStats,
  DashboardExceptions,
  DashboardWorkload,
  ActivityLog,
  TaskStatus,
} from "@/types";

const api = axios.create({
  baseURL: "http://localhost:8017/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: async (username: string, password: string) => {
    const res = await api.post("/auth/login", { username, password });
    return res.data as { access_token: string; token_type: string; user: UserOut };
  },
  me: async () => {
    const res = await api.get("/auth/me");
    return res.data as UserOut;
  },
};

export const usersApi = {
  list: async () => {
    const res = await api.get("/users");
    return res.data as UserOut[];
  },
  create: async (data: UserCreate) => {
    const res = await api.post("/users", data);
    return res.data as UserOut;
  },
  update: async (id: number, data: UserUpdate) => {
    const res = await api.put(`/users/${id}`, data);
    return res.data as UserOut;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/users/${id}`);
    return res.data;
  },
};

export const zonesApi = {
  list: async () => {
    const res = await api.get("/zones");
    return res.data as ZoneOut[];
  },
  create: async (data: ZoneCreate) => {
    const res = await api.post("/zones", data);
    return res.data as ZoneOut;
  },
  update: async (id: number, data: ZoneUpdate) => {
    const res = await api.put(`/zones/${id}`, data);
    return res.data as ZoneOut;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/zones/${id}`);
    return res.data;
  },
  getSlots: async (zoneId: number) => {
    const res = await api.get(`/zones/${zoneId}/slots`);
    return res.data as SlotOut[];
  },
  createSlot: async (zoneId: number, data: SlotCreate) => {
    const res = await api.post(`/zones/${zoneId}/slots`, data);
    return res.data as SlotOut;
  },
  updateSlot: async (slotId: number, data: SlotUpdate) => {
    const res = await api.put(`/slots/${slotId}`, data);
    return res.data as SlotOut;
  },
};

export const tasksApi = {
  list: async (params?: { status?: TaskStatus; zone_id?: number; assignee_id?: number }) => {
    const res = await api.get("/tasks", { params });
    return res.data as TaskOut[];
  },
  create: async (data: TaskCreate) => {
    const res = await api.post("/tasks", data);
    return res.data as TaskOut;
  },
  get: async (id: number) => {
    const res = await api.get(`/tasks/${id}`);
    return res.data as TaskDetailOut;
  },
  update: async (id: number, data: TaskUpdate) => {
    const res = await api.put(`/tasks/${id}`, data);
    return res.data as TaskOut;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/tasks/${id}`);
    return res.data;
  },
  transition: async (id: number, action: string) => {
    const res = await api.post(`/tasks/${id}/transition`, { action });
    return res.data as TaskOut;
  },
  history: async (id: number) => {
    const res = await api.get(`/tasks/${id}/history`);
    return res.data as HistoryEntry[];
  },
  undo: async (id: number) => {
    const res = await api.post(`/tasks/${id}/undo`);
    return res.data as TaskOut;
  },
  redo: async (id: number) => {
    const res = await api.post(`/tasks/${id}/redo`);
    return res.data as TaskOut;
  },
};

export const dashboardApi = {
  stats: async () => {
    const res = await api.get("/dashboard/stats");
    return res.data as DashboardStats;
  },
  exceptions: async () => {
    const res = await api.get("/dashboard/exceptions");
    return res.data as DashboardExceptions;
  },
  workload: async () => {
    const res = await api.get("/dashboard/workload");
    return res.data as DashboardWorkload;
  },
  recent: async () => {
    const res = await api.get("/dashboard/recent");
    return res.data as ActivityLog[];
  },
};

export default api;
