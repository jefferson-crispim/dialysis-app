import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { parseWorkbook } from "@/lib/import/parse";
import { commitImport } from "@/lib/import/commit";
import { SHEET_BY_KEY, type SheetKey } from "@/lib/import/sheetMap";

export const maxDuration = 60;
const MAX_BYTES = 4 * 1024 * 1024; // limite de corpo das funções na Vercel (4,5 MB)

export async function POST(req: Request) {
  const { supabase, user, orgId, role } = await requireSession();
  if (role === "viewer") return NextResponse.json({ error: "Seu perfil não pode importar dados." }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Escolha um arquivo .xlsx ou .csv." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Arquivo acima de 4 MB. Divida a planilha em partes." }, { status: 413 });
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return NextResponse.json({ error: "Use um arquivo .xlsx ou .csv." }, { status: 400 });

  const only = form.get("sheet");
  const onlyKeys = typeof only === "string" && only in SHEET_BY_KEY ? [only as SheetKey] : undefined;

  try {
    const parsed = parseWorkbook(await file.arrayBuffer(), onlyKeys);
    if (parsed.sheets.length === 0)
      return NextResponse.json({ error: "Não encontrei nenhuma aba conhecida. Use a planilha modelo." }, { status: 422 });
    // grava com o cliente do usuário: o RLS garante que tudo fica na organização dele
    const result = await commitImport(supabase, { orgId, userId: user.id, fileName: file.name, parsed });
    return NextResponse.json(result);
  } catch (e) {
    console.error("import failed", e);
    return NextResponse.json({ error: "A importação falhou. Nada foi duplicado: você pode tentar de novo com o mesmo arquivo." }, { status: 500 });
  }
}
