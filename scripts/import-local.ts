/**
 * Carga inicial da planilha real (Movimento DP.xlsx) na clínica INED.
 *
 *   npx tsx scripts/import-local.ts                       (usa MOVIMENTO_DP_XLSX, INED_ORG_NAME e INED_ADMIN_EMAILS do .env.local)
 *   npx tsx scripts/import-local.ts "<arquivo.xlsx>" <ORG_ID> <USER_ID>
 *
 * Pré-requisito: um dos e-mails de INED_ADMIN_EMAILS já ter entrado uma vez no app (isso cria a clínica e o perfil).
 * Usa a service role (ignora RLS), por isso só roda na sua máquina. O arquivo NÃO entra no git (*.xlsx está no .gitignore).
 */
import fs from "node:fs";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { parseWorkbook } from "../src/lib/import/parse";
import { commitImport } from "../src/lib/import/commit";

config({ path: ".env.local" });

async function main() {
  const [argFile, argOrg, argUser] = process.argv.slice(2);
  const file = argFile || process.env.MOVIMENTO_DP_XLSX;
  if (!file) throw new Error("Informe o arquivo ou defina MOVIMENTO_DP_XLSX no .env.local");

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    db: { schema: "nefro" },
    auth: { persistSession: false },
  });

  let orgId = argOrg;
  let userId = argUser;
  if (!orgId || !userId) {
    const orgName = process.env.INED_ORG_NAME || "INED";
    const emails = (process.env.INED_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    const org = await db.from("organizations").select("id").eq("name", orgName).limit(1).maybeSingle();
    if (!org.data) throw new Error(`Clínica "${orgName}" não existe ainda. Entre no app uma vez com um e-mail de INED_ADMIN_EMAILS.`);
    orgId = org.data.id;
    const prof = await db.from("profiles").select("id").eq("organization_id", orgId).eq("role", "admin_clinica").limit(1).maybeSingle();
    if (!prof.data) throw new Error(`Nenhum administrador em "${orgName}" (${emails.join(", ")}). Entre no app uma vez.`);
    userId = prof.data.id;
  }

  const parsed = parseWorkbook(fs.readFileSync(file));
  const result = await commitImport(db, { orgId, userId, fileName: file.split(/[\\/]/).pop()!, parsed });
  for (const s of result.sheets)
    console.log(`${s.label}: ${s.inserted} novos, ${s.duplicates} já existiam, ${s.unmatched.length} sem paciente, ${s.issues.length} avisos`);
  console.log("Abas ignoradas:", result.ignoredSheets.join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
