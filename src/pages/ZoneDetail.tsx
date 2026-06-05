import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { zonesApi, tasksApi } from "@/services/api";
import type { SlotOut, TaskOut } from "@/types";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ZoneDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [slots, setSlots] = useState<SlotOut[]>([]);
  const [tasks, setTasks] = useState<TaskOut[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotOut | null>(null);
  const zoneId = Number(id);

  useEffect(() => {
    if (zoneId) {
      zonesApi.getSlots(zoneId).then(setSlots);
      tasksApi.list({ zone_id: zoneId }).then(setTasks);
    }
  }, [zoneId]);

  const getSlotTask = (slot: SlotOut) => {
    if (!slot.current_task_id) return null;
    return tasks.find((t) => t.id === slot.current_task_id);
  };

  const statusColor: Record<string, string> = {
    empty: "bg-[#ECEFF1] border-[#CFD8DC] hover:bg-[#E0E0E0]",
    in_use: "bg-[#C8E6C9] border-[#81C784] hover:bg-[#A5D6A7]",
    abnormal: "bg-[#FFE0B2] border-[#FFB74D] hover:bg-[#FFCC80]",
  };

  const statusLabel: Record<string, string> = {
    empty: "空",
    in_use: "使用中",
    abnormal: "异常",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/zones")}
          className="p-2 rounded-lg hover:bg-[#E8F5E9] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#1B5E20]" />
        </button>
        <h2 className="text-xl font-bold text-[#1B5E20]">盘位网格</h2>
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          <div className="bg-white rounded-xl p-5 border border-[#C8E6C9]">
            <div className="grid grid-cols-5 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => setSelectedSlot(slot)}
                  className={cn(
                    "aspect-square rounded-lg border-2 flex flex-col items-center justify-center transition-all text-sm",
                    statusColor[slot.status],
                    selectedSlot?.id === slot.id && "ring-2 ring-[#1B5E20] ring-offset-1"
                  )}
                >
                  <span className="font-medium text-[#37474F]">{slot.position}</span>
                  <span className="text-[10px] text-[#78909C]">{statusLabel[slot.status]}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-4 mt-4 text-xs text-[#78909C]">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-[#ECEFF1] border border-[#CFD8DC]" /> 空
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-[#C8E6C9] border border-[#81C784]" /> 使用中
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-[#FFE0B2] border border-[#FFB74D]" /> 异常
              </span>
            </div>
          </div>
        </div>

        {selectedSlot && (
          <div className="w-72 bg-white rounded-xl p-5 border border-[#C8E6C9] h-fit sticky top-0">
            <h3 className="font-semibold text-[#1B5E20] mb-3">
              盘位 {selectedSlot.position}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#78909C]">状态</span>
                <span className={cn("px-2 py-0.5 rounded-full text-xs", statusColor[selectedSlot.status])}>
                  {statusLabel[selectedSlot.status]}
                </span>
              </div>
              {getSlotTask(selectedSlot) && (
                <>
                  <div className="border-t border-[#E8F5E9] pt-2 mt-2" />
                  <div className="font-medium text-[#37474F]">关联任务</div>
                  <div className="text-[#546E7A]">
                    {getSlotTask(selectedSlot)!.title}
                  </div>
                  <div className="text-[#78909C]">
                    状态: {getSlotTask(selectedSlot)!.status}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
