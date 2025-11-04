import { NextResponse } from "next/server";
import { google } from "googleapis";
import { mapEntryToSheetRow, SHEET_HEADERS } from "@/app/components/SheetColumns";

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const values = [mapEntryToSheetRow(body)];

    const sheets = google.sheets({ version: "v4", auth: getJWT() });
    const spreadsheetId = process.env.SHEET_ID as string;
    const range = (process.env.SHEET_TAB || "Sheet1") + "!A1";

    if (!spreadsheetId) throw new Error("Missing SHEET_ID env");

    // Ensure headers exist by trying to read; if empty, set headers first
    const getRes = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    if (!getRes.data.values || getRes.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: "RAW",
        requestBody: { values: [Array.from(SHEET_HEADERS)] },
      });
    }

    const appendRes = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    });

    // updatedRange like: Sheet1!A2:P2 → extract row number 2
    const updatedRange = appendRes.data.updates?.updatedRange || "";
    let row: number | null = null;
    const match = updatedRange.match(/![A-Z]+(\d+):/);
    if (match && match[1]) row = parseInt(match[1], 10);

    return NextResponse.json({ ok: true, updatedRange, row });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Append failed" }, { status: 400 });
  }
}
