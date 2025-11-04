export const SHEET_HEADERS = [
  "Car Details",
  "Plate No",
  "Email ID",
  "Contact Number",
  "Customer Name",
  "Trips",
  "Applied at",
  "Source",
  "Owner/ Available days",
  "Driver Rating",
  "Satisfaction Rate",
  "Acceptance Rate",
  "Cancellation Rate",
  "Tenure",
  "Rating",
  "Uber Pro",
] as const;

export type SheetHeaders = typeof SHEET_HEADERS[number];

export type SheetRow = Record<SheetHeaders, string>;

export function mapEntryToSheetRow(entry: any): string[] {
  // Ensure order matches headers above
  return [
    entry.carDetails ?? "",
    entry.plateNo ?? "",
    entry.email ?? "",
    entry.contactNumber ?? "",
    entry.customerName ?? "",
    entry.trips ?? "",
    entry.appliedAt ?? "",
    entry.source ?? "",
    entry.ownerOrAvailableDays ?? "",
    entry.driverRating ?? "",
    entry.satisfactionRate ?? "",
    entry.acceptanceRate ?? "",
    entry.cancellationRate ?? "",
    entry.tenure ?? "",
    entry.rating ?? "",
    entry.uberPro ?? "",
  ];
}
