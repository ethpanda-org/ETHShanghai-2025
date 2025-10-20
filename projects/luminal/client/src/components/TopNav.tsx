import { ConnectButton } from "@rainbow-me/rainbowkit";

export function TopNav() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-white/5 bg-[#08090C]/70 px-8 py-5 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <img
          src="/luminial.svg"
          alt="Luminial"
          className="h-8 w-8 drop-shadow-md"
        />
        <div>
          <span className="text-lg font-semibold tracking-wide">Luminial</span>
          <span className="ml-2 rounded-full bg-primary/20 px-2 py-[2px] text-[0.6rem] uppercase tracking-widest text-primary">Alpha</span>
        </div>
      </div>
      <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-400">
        <a className="hover:text-white transition" href="#swap">
          Swap
        </a>
        <a className="hover:text-white transition" href="#docs">
          Docs
        </a>
        <a className="hover:text-white transition" href="#audit">
          Audit
        </a>
      </nav>
      <ConnectButton />
    </header>
  );
}
