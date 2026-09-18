import Image from "next/image";
import Link from "next/link";

// Shared top bar for every screen. Left side is the official Toastmasters
// International logo (linking home); right side is a single "Menu" link
// that also goes home.
export default function Header() {
  return (
    <header className="border-b border-brand-dark-4">
      <div className="mx-auto flex h-[88px] w-full max-w-[1200px] items-center justify-between px-6">
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/assets/toastmasters-logo.png"
            alt="Toastmasters International"
            width={56}
            height={56}
            className="h-14 w-14 object-contain"
            priority
          />
        </Link>
        <Link
          href="/"
          className="text-[16px] font-semibold text-brand-dark-2 transition-opacity hover:opacity-70"
        >
          Menu
        </Link>
      </div>
    </header>
  );
}