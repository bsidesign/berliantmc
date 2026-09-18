import Link from "next/link";
import { Globe2 } from "lucide-react";

type HeaderProps = {
  /** Current section label shown in the brand gradient, e.g. "Home", "Timer". */
  section?: string;
};

// Shared top bar for every screen. The real Toastmasters globe logo from the
// Figma file couldn't be exported in this environment (network-restricted) —
// this is a placeholder mark. Drop the real logo file at
// public/assets/logo.png and swap the <Globe2> block below for an <img>.
export default function Header({ section = "Home" }: HeaderProps) {
  return (
    <header className="border-b border-brand-dark-4">
      <div className="mx-auto flex h-[88px] w-full max-w-[1200px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="flex size-9 items-center justify-center rounded-full brand-gradient text-white">
            <Globe2 size={20} />
          </span>
          <span className="font-semibold text-brand-dark-2">Berlian TMC</span>
        </Link>
        <div className="flex items-center gap-4 text-[16px] font-semibold whitespace-nowrap">
          <span className="brand-gradient-text">{section}</span>
          <span className="text-brand-dark-2">Berlian Toastmasters</span>
        </div>
      </div>
    </header>
  );
}
