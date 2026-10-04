import Image from "next/image";
import { requireSession } from "@/lib/session";
import { SideNav, BottomNav } from "@/components/AppNav";
import { BracketMark } from "@/components/StripeBrackets";
import { Icon } from "@/components/Icon";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { org, displayName } = await requireSession();
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[250px_1fr]">
      <aside className="hidden border-r border-line bg-card p-4 md:flex md:flex-col md:gap-6">
        <div className="flex items-center gap-3 px-1 pt-1">
          {org.logo_url ? (
            <Image src={org.logo_url} alt="" width={40} height={40} unoptimized className="size-10 rounded-lg object-contain" />
          ) : (
            <BracketMark height={40} />
          )}
          <div className="min-w-0">
            <p className="truncate font-extrabold leading-tight">{org.name}</p>
            <p className="text-sm text-muted">Nefro</p>
          </div>
        </div>
        <SideNav />
        <div className="mt-auto border-t border-line pt-4">
          <p className="truncate px-1 text-sm font-semibold">{displayName}</p>
          <form action="/auth/signout" method="post">
            <button className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 text-[15px] text-muted hover:bg-brand-soft">
              <Icon name="logout" size={20} />
              Sair
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 pb-20 md:pb-0">
        <header className="flex items-center gap-3 border-b border-line bg-card px-4 py-3 md:hidden">
          <BracketMark height={30} />
          <p className="truncate font-extrabold">{org.name}</p>
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
