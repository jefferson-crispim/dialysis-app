import { PainelTabs } from "./PainelTabs";

export default function PaineisLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-extrabold">Painéis</h1>
      <PainelTabs />
      {children}
    </div>
  );
}
