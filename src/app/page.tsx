import Header from "@/components/Header";
import RoleCard from "@/components/RoleCard";
import { TOOLS } from "@/lib/tools";

export default function HomePage() {
  return (
    <>
      <Header section="Home" />
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-center gap-10 px-6 py-16">
        <div className="flex max-w-[589px] flex-col gap-2 text-center">
          <h1 className="text-[32px] font-semibold leading-tight sm:text-[42px]">
            Choose your role
          </h1>
          <p className="text-[18px] leading-[1.4] text-brand-dark-1">
            Select your role to open the tools you need for today&rsquo;s
            Toastmasters meeting.
          </p>
        </div>

        <div className="flex w-full max-w-[664px] flex-wrap justify-center gap-8">
          {TOOLS.map((tool) => (
            <RoleCard key={tool.href} {...tool} />
          ))}
        </div>
      </main>
      <footer className="pb-8 text-center text-[14px] text-brand-dark-3">
        Designed and Developed by Muzakki from Berlian Toastmasters Club
      </footer>
    </>
  );
}
