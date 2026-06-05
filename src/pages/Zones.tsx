import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { zonesApi } from "@/services/api";
import type { ZoneOut, ZoneCreate } from "@/types";
import { Plus, Trash2, Edit3, Grid3X3, X, Check } from "lucide-react";

export default function Zones() {
  const [zones, setZones] = useState<ZoneOut[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ZoneCreate>({ name: "", description: "" });
  const navigate = useNavigate();

  const load = () => zonesApi.list().then(setZones);
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    await zonesApi.create(form);
    setShowCreate(false);
    setForm({ name: "", description: "" });
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除此棚区？")) return;
    await zonesApi.delete(id);
    load();
  };

  const handleUpdate = async (id: number, name: string, description: string) => {
    await zonesApi.update(id, { name, description });
    setEditId(null);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#1B5E20]">棚区管理</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1B5E20] text-white rounded-lg hover:bg-[#2E7D32] transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> 新增棚区
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl p-5 border border-[#C8E6C9] space-y-4">
          <h3 className="font-semibold text-[#37474F]">新增棚区</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#546E7A] mb-1">名称</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#C8E6C9] focus:ring-2 focus:ring-[#2E7D32] outline-none text-sm"
                placeholder="如：A棚"
              />
            </div>
            <div>
              <label className="block text-sm text-[#546E7A] mb-1">描述</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#C8E6C9] focus:ring-2 focus:ring-[#2E7D32] outline-none text-sm"
                placeholder="可选"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-4 py-1.5 bg-[#1B5E20] text-white rounded-lg text-sm hover:bg-[#2E7D32]">
              确认
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-1.5 border border-[#C8E6C9] rounded-lg text-sm text-[#546E7A] hover:bg-[#F1F8E9]">
              取消
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {zones.map((zone) => (
          <ZoneCard
            key={zone.id}
            zone={zone}
            editing={editId === zone.id}
            onEdit={() => setEditId(zone.id)}
            onSave={handleUpdate}
            onCancel={() => setEditId(null)}
            onDelete={() => handleDelete(zone.id)}
            onViewSlots={() => navigate(`/zones/${zone.id}`)}
          />
        ))}
      </div>

      {zones.length === 0 && (
        <div className="text-center py-16 text-[#78909C]">
          暂无棚区，点击右上角新增
        </div>
      )}
    </div>
  );
}

function ZoneCard({
  zone,
  editing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onViewSlots,
}: {
  zone: ZoneOut;
  editing: boolean;
  onEdit: () => void;
  onSave: (id: number, name: string, desc: string) => void;
  onCancel: () => void;
  onDelete: () => void;
  onViewSlots: () => void;
}) {
  const [name, setName] = useState(zone.name);
  const [desc, setDesc] = useState(zone.description);

  if (editing) {
    return (
      <div className="bg-white rounded-xl p-5 border-2 border-[#43A047] space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[#C8E6C9] focus:ring-2 focus:ring-[#2E7D32] outline-none text-sm"
        />
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[#C8E6C9] focus:ring-2 focus:ring-[#2E7D32] outline-none text-sm"
        />
        <div className="flex gap-2">
          <button onClick={() => onSave(zone.id, name, desc)} className="p-1.5 bg-[#1B5E20] text-white rounded-lg hover:bg-[#2E7D32]">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={onCancel} className="p-1.5 border border-[#C8E6C9] rounded-lg hover:bg-[#F1F8E9]">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-[#C8E6C9] hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-[#1B5E20] text-lg">{zone.name}</h3>
          {zone.description && (
            <p className="text-sm text-[#78909C] mt-0.5">{zone.description}</p>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-[#E8F5E9] text-[#546E7A]">
            <Edit3 className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-[#546E7A]">
        <span>盘位: {zone.slot_count}</span>
        <span>利用率: {zone.utilization.toFixed(0)}%</span>
      </div>

      <div className="mt-3 w-full bg-[#E8F5E9] rounded-full h-2">
        <div
          className="h-2 rounded-full bg-[#43A047] transition-all"
          style={{ width: `${Math.min(zone.utilization, 100)}%` }}
        />
      </div>

      <button
        onClick={onViewSlots}
        className="mt-4 flex items-center gap-1.5 text-sm text-[#2E7D32] hover:text-[#1B5E20] font-medium transition-colors"
      >
        <Grid3X3 className="w-4 h-4" /> 查看盘位
      </button>
    </div>
  );
}
