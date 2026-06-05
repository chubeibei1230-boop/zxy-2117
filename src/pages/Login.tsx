import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth";
import { Sprout, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.login(username, password);
      setAuth(res.access_token, res.user);
      navigate("/");
    } catch {
      setError("用户名或密码错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1B5E20] via-[#2E7D32] to-[#43A047]">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-72 h-72 bg-[#A5D6A7] rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#81C784] rounded-full blur-3xl" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-10 space-y-7"
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#E8F5E9] rounded-2xl mb-4">
            <Sprout className="w-9 h-9 text-[#1B5E20]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1B5E20]">苗棚管理平台</h1>
          <p className="text-sm text-[#546E7A] mt-1">任务状态与撤销复原系统</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#37474F] mb-1.5">
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-[#C8E6C9] bg-[#FAFFFE] focus:ring-2 focus:ring-[#2E7D32] focus:border-[#2E7D32] outline-none transition-all text-[#37474F]"
              placeholder="请输入用户名"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#37474F] mb-1.5">
              密码
            </label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[#C8E6C9] bg-[#FAFFFE] focus:ring-2 focus:ring-[#2E7D32] focus:border-[#2E7D32] outline-none transition-all pr-10 text-[#37474F]"
                placeholder="请输入密码"
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78909C] hover:text-[#37474F]"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-[#1B5E20] hover:bg-[#2E7D32] text-white rounded-lg font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "登录中..." : "登 录"}
        </button>

        <div className="text-center text-xs text-[#78909C]">
          演示账号：admin / admin123
        </div>
      </form>
    </div>
  );
}
