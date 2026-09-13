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
        "rounded-full border border-[color:var(--ui-text-primary)] bg-[color:var(--ui-accent)]",
        "text-[10px] font-black leading-none text-[color:var(--ui-bg)] shadow",
        "sm:h-7 sm:w-7 sm:border-2 sm:text-sm",
      ].join(" ")}
      aria-label={`Ordre de sélection ${order}`}
    >
      {order}
    </span>
  );
}
