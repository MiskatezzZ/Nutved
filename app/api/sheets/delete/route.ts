import { NextResponse } from "next/server";
import { google } from "googleapis";
import { SHEET_HEADERS } from "@/app/components/SheetColumns";

export const runtime = "nodejs";

function getJWT() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL as string;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY as string;
  if (!clientEmail || !privateKey) throw new Error("Missing Google service account env");
  if (privateKey.includes("\\n")) privateKey = privateKey.replace(/\\n/g, "\n");
  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function colToA1(colIndexZeroBased: number) {
  let n = colIndexZeroBased + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const row = Number(body?.row);
    if (!row) throw new Error("row is required");

    const sheets = google.sheets({ version: "v4", auth: getJWT() });
    const spreadsheetId = process.env.SHEET_ID as string;
    const tab = process.env.SHEET_TAB || "Sheet1";
    if (!spreadsheetId) throw new Error("Missing SHEET_ID env");

    const lastColA1 = colToA1(SHEET_HEADERS.length - 1);
    const range = `${tab}!A${row}:${lastColA1}${row}`;

    await sheets.spreadsheets.values.clear({ spreadsheetId, range });

    return NextResponse.json({ ok: true, clearedRange: range });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Delete failed" }, { status: 400 });
  }
}
