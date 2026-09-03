import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { MAROON, GOLD, SANS } from "@nakshra/shared-config/theme";
import * as Select from "@radix-ui/react-select";

export function FloatingSelect({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = open || value.length > 0;

  return (
    <div className="relative">
      <Select.Root value={value} onValueChange={onChange} onOpenChange={setOpen}>
        <Select.Trigger asChild>
          <button
            type="button"
            className="w-full pt-6 pb-2 px-4 rounded-2xl text-sm outline-none transition-all duration-200 flex items-center justify-between text-left"
            style={{
              background: "#FFFFFF",
              border: `1.5px solid ${open ? GOLD : "rgba(91,31,36,0.14)"}`,
              boxShadow: open ? `0 0 0 3px rgba(200,160,68,0.1)` : "none",
              color: value ? "#222222" : "transparent",
              fontFamily: SANS
            }}
          >
            <Select.Value>{value}</Select.Value>
            <ChevronDown size={14} style={{ color: "#9A8A78" }} />
          </button>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content position="popper" align="start" sideOffset={6} className="z-[250] rounded-2xl shadow-xl border overflow-hidden p-1 max-h-60"
            style={{ background: "#FFFFFF", borderColor: "rgba(91,31,36,0.15)", width: "var(--radix-select-trigger-width)" }}>
            <Select.Viewport className="space-y-0.5">
              {options.map(o => (
                <Select.Item key={o} value={o} className="px-3.5 py-2.5 text-xs font-semibold rounded-xl cursor-pointer outline-none transition-colors data-[highlighted]:bg-[rgba(91,31,36,0.08)] data-[state=checked]:bg-[rgba(91,31,36,0.12)] data-[state=checked]:text-[#5B1F24]"
                  style={{ color: MAROON, fontFamily: SANS }}>
                  <Select.ItemText>{o}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      <label className="absolute left-4 pointer-events-none transition-all duration-200"
        style={{
          top: active ? "8px" : "50%", transform: active ? "translateY(0)" : "translateY(-50%)",
          fontSize: active ? "10px" : "13px", color: open ? GOLD : "#9A8A78", fontFamily: SANS,
          fontWeight: active ? 600 : 400, letterSpacing: active ? "0.06em" : "0",
          textTransform: active ? "uppercase" : "none"
        }}>
        {label}
      </label>
    </div>
  );
}
