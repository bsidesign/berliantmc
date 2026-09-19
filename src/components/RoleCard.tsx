import Link from "next/link";
import type { ToolDef } from "@/lib/tools";

export default function RoleCard({ href, icon: Icon, title, description, cta }: ToolDef) {
  return (
    <div className="flex w-full max-w-[400px] flex-1 min-w-[260px] flex-col items-center gap-4 rounded-lg border-2 border-brand-blue px-6 py-7 text-center">
      <Icon className="text-brand-blue" size={42} strokeWidth={1.5} />
      <div className="flex flex-col gap-1">
        <p className="text-[21px] font-extrabold leading-none text-brand-dark-1">{title}</p>
        <p className="text-[15px] leading-[1.4] text-brand-dark-1">{description}</p>
      </div>
      <Link
        href={href}
        className="brand-gradient rounded-lg px-[18px] py-[14px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        {cta}
      </Link>
    </div>
  );
}
