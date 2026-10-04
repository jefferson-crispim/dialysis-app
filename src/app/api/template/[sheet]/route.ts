import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildTemplate } from "@/lib/import/templates";
import { SHEET_BY_KEY, type SheetKey } from "@/lib/import/sheetMap";

export async function GET(_req: Request, ctx: { params: Promise<{ sheet: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Faça login para baixar o modelo." }, { status: 401 });

  const { sheet } = await ctx.params;
  const all = sheet === "todos";
  if (!all && !(sheet in SHEET_BY_KEY)) return NextResponse.json({ error: "Modelo não encontrado." }, { status: 404 });

  const bytes = buildTemplate(all ? "all" : [sheet as SheetKey]);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="modelo-${all ? "completo" : sheet}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
