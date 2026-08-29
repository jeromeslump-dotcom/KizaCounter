
interface SelectionOrderBadgeProps {
  order: number;
}

export default function SelectionOrderBadge({
  order,
}: SelectionOrderBadgeProps) {
  return (
    <span
      className={[
        "flex h-5 w-5 shrink-0 items-center justify-center",
        "rounded-full border border-white/90 bg-amber-500",
        "text-[10px] font-black leading-none text-slate-950 shadow",
        "sm:h-7 sm:w-7 sm:border-2 sm:text-sm",
      ].join(" ")}
      aria-label={`Ordre de sélection ${order}`}
    >
      {order}
    </span>
  );
}
