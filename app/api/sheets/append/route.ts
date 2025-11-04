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
    const tab = process.env.SHEET_TAB || "Sheet1";
    const range = tab + "!A1";

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

    // Find the sheetId by tab title
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = meta.data.sheets?.find((s) => s.properties?.title === tab);
    const sheetId = sheet?.properties?.sheetId;
    if (sheetId == null) throw new Error(`Sheet tab not found: ${tab}`);

    // Build RowData for AppendCellsRequest (always appends to end)
    const rowVals = values[0];
    const rowData = [
      {
        values: rowVals.map((v) => ({ userEnteredValue: { stringValue: String(v ?? "") } })),
      },
    ];

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            appendCells: {
              sheetId,
              rows: rowData as any,
              fields: "userEnteredValue",
            },
          },
        ],
      },
    });

    // Compute the last non-empty row to return its index
    const lastRange = `${tab}!A:A`;
    const after = await sheets.spreadsheets.values.get({ spreadsheetId, range: lastRange });
    const row = (after.data.values?.length || 1); // header is row 1

    return NextResponse.json({ ok: true, row });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Append failed" }, { status: 400 });
  }
}
