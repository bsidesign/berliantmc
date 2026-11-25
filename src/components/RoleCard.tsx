import Link from "next/link";
import type { ToolDef } from "@/lib/tools";

// Icon, title and description are left-aligned on the left; the open button
// sits on the right (it drops below the text on narrow phones).
export default function RoleCard({ href, icon: Icon, title, description, cta }: ToolDef) {
  return (
    <div className="flex w-full flex-col gap-5 rounded-lg border-2 border-brand-blue px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col items-start gap-3 text-left">
        <Icon className="text-brand-blue" size={42} strokeWidth={1.5} />
        <div className="flex flex-col gap-1">
          <p className="text-[21px] font-extrabold leading-none text-brand-dark-1">{title}</p>
          <p className="text-[15px] leading-[1.4] text-brand-dark-1">{description}</p>
        </div>
      </div>
      <Link
        href={href}
        className="brand-gradient shrink-0 self-start whitespace-nowrap rounded-lg px-[18px] py-[14px] text-center text-[13px] font-semibold text-white transition-opacity hover:opacity-90 sm:self-center"
      >
        {cta}
      </Link>
    </div>
  );
}
