import { MAROON, GOLD } from "@nakshra/shared-config/theme";

const STEPS = ["Cart", "Shipping", "Payment", "Confirmation"];

export function CheckoutProgress({ step }: { step: number }) {
  return (
    <div className="px-3 sm:px-6 py-5 lg:py-3 rounded-2xl mb-5 lg:mb-3" style={{ background: "#FFFFFF", border: "1px solid rgba(91,31,36,0.07)" }}>
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors"
                style={{ background: i < step ? "rgba(200,160,68,0.15)" : i === step ? GOLD : "rgba(91,31,36,0.07)",
                  color: i < step ? GOLD : i === step ? "#1A0D0E" : "#9A8A78",
                  border: i === step ? `2px solid ${GOLD}` : "none" }}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className="text-[9px] text-center leading-none" style={{ color: i === step ? MAROON : "#9A8A78", fontWeight: i === step ? 600 : 400 }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className="flex-1 h-px mx-1 sm:mx-2 w-4 sm:w-8" style={{ background: i < step ? GOLD : "rgba(91,31,36,0.1)" }} />}
          </div>
        ))}
      </div>
    </div>
  );
}
