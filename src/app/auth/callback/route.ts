import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { provisionInedUser } from "@/lib/ined";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data } = await supabase.auth.getUser();
      if (data.user) await provisionInedUser(data.user);
      return NextResponse.redirect(`${origin}/hoje`);
    }
  }
  return NextResponse.redirect(`${origin}/login?erro=1`);
}
