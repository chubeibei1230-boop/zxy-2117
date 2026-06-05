import { useEffect, useState } from "react";
import { usersApi } from "@/services/api";
import { ROLE_LABELS, type UserOut, type UserRole, type UserCreate } from "@/types";
import { Plus, Trash2, ToggleLeft, ToggleRight, UserPlus } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";

export default function Users() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserOut[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const load = () => usersApi.list().then(setUsers);
  useEffect(() => { load(); }, []);

  const handleToggleActive = async (u: UserOut) => {
    await usersApi.update(u.id, { is_active: !u.is_active });
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除此用户？")) return;
    await usersApi.delete(id);
    load();
  };

  if (currentUser?.role !== "admin") {
    return (
      <div className="text-center py-16 text-[#78909C]">
        仅管理员可访问此页面
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#1B5E20]">用户管理</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1B5E20] text-white rounded-lg hover:bg-[#2E7D32] text-sm"
        >
          <Plus className="w-4 h-4" /> 新增用户
        </button>
      </div>

      {showCreate && (
        <CreateUserForm
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}

      <div className="bg-white rounded-xl border border-[#C8E6C9] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F1F8E9] text-[#37474F]">
              <th className="text-left px-4 py-3 font-medium">用户名</th>
              <th className="text-left px-4 py-3 font-medium">角色</th>
              <th className="text-left px-4 py-3 font-medium">状态</th>
              <th className="text-left px-4 py-3 font-medium">创建时间</th>
              <th className="text-center px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-[#E8F5E9] hover:bg-[#FAFFF5]">
                <td className="px-4 py-3 font-medium text-[#37474F]">{u.username}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-xs font-medium",
                    u.role === "admin" ? "bg-red-100 text-red-700" :
                    u.role === "worker" ? "bg-blue-100 text-blue-700" :
                    "bg-purple-100 text-purple-700"
                  )}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleActive(u)}
                    disabled={u.id === currentUser?.id}
                    className="flex items-center gap-1"
                  >
                    {u.is_active ? (
                      <ToggleRight className="w-6 h-6 text-[#43A047]" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-[#9E9E9E]" />
                    )}
                    <span className={cn("text-xs", u.is_active ? "text-[#43A047]" : "text-[#9E9E9E]")}>
                      {u.is_active ? "启用" : "禁用"}
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3 text-[#78909C]">
                  {new Date(u.created_at).toLocaleDateString("zh-CN")}
                </td>
                <td className="px-4 py-3 text-center">
                  {u.id !== currentUser?.id && (
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreateUserForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("worker");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    await usersApi.create({ username, password, role });
    onCreated();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl p-5 border border-[#C8E6C9] space-y-4"
    >
      <h3 className="font-semibold text-[#37474F] flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-[#1B5E20]" /> 新增用户
      </h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-[#546E7A] mb-1">用户名</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#C8E6C9] focus:ring-2 focus:ring-[#2E7D32] outline-none text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-[#546E7A] mb-1">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#C8E6C9] focus:ring-2 focus:ring-[#2E7D32] outline-none text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-[#546E7A] mb-1">角色</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full px-3 py-2 rounded-lg border border-[#C8E6C9] outline-none text-sm"
          >
            <option value="worker">育苗员</option>
            <option value="reviewer">复核员</option>
            <option value="admin">管理员</option>
          </select>
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
