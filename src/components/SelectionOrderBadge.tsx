interface SelectionOrderBadgeProps {
  order: number;
  position?: "left" | "right";
}

export default function SelectionOrderBadge({
  order,
  position = "right",
}: SelectionOrderBadgeProps) {
  return (
    <span
      className={[
        "absolute top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/90 bg-amber-500 text-[10px] font-black leading-none text-slate-950 shadow",
        "sm:top-2 sm:h-7 sm:w-7 sm:border-2 sm:text-sm",
        position === "left" ? "left-1 sm:left-2" : "right-1 sm:right-2",
      ].join(" ")}
      aria-label={`Ordre de sélection ${order}`}
    >
      {order}
    </span>
  );
}
