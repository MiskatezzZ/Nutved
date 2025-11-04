'use client';

import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import db from "./config/firebaseConfig";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

type Entry = {
  id: string;
  sheetRow?: number;
  carDetails: string;
  plateNo: string;
  email: string;
  contactNumber: string;
  customerName: string;
  trips: string;
  appliedAt: string;
  source: string;
  ownerOrAvailableDays: string;
  driverRating: string;
  satisfactionRate: string;
  acceptanceRate: string;
  cancellationRate: string;
  tenure: string;
  rating: string;
  uberPro: string;
};

type FormData = Omit<Entry, 'id'>;

const emptyEntry: FormData = {
  carDetails: "",
  plateNo: "",
  email: "",
  contactNumber: "",
  customerName: "",
  trips: "",
  appliedAt: "",
  source: "",
  ownerOrAvailableDays: "",
  driverRating: "",
  satisfactionRate: "100%",
  acceptanceRate: "100%",
  cancellationRate: "100%",
  tenure: "",
  rating: "",
  uberPro: "",
};

export default function Home() {
  const [form, setForm] = useState<FormData>(emptyEntry);
  const [rows, setRows] = useState<Entry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormData>(emptyEntry);
  const [error, setError] = useState<string | null>(null);

  // Real-time Firestore subscription
  useEffect(() => {
    const q = query(collection(db, "car_entries"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data: Entry[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setRows(data);
    });
    return () => unsub();
  }, []);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleEditChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditForm((f) => ({ ...f, [name]: value }));
  };

  const addRow = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const docRef = await addDoc(collection(db, "car_entries"), {
        ...form,
        createdAt: serverTimestamp(),
      });
      // Best-effort: append to Google Sheet via API route
      try {
        const res = await fetch("/api/sheets/append", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          const j = await res.json();
          if (j?.row) {
            await updateDoc(doc(db, "car_entries", docRef.id), { sheetRow: j.row });
          }
        }
      } catch (sheetErr: any) {
        setError(sheetErr?.message || "Added, but failed to append to sheet");
      }
      setForm(emptyEntry);
    } catch (err: any) {
      setError(err?.message || "Failed to add entry");
    }
  };

  const startEdit = (row: Entry) => {
    setEditingId(row.id);
    const { id, ...rest } = row;
    setEditForm(rest);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    setError(null);
    try {
      await updateDoc(doc(db, "car_entries", id), {
        ...editForm,
      });
      // If this row has a linked Google Sheet row, update it too
      const current = rows.find((r) => r.id === id);
      if (current?.sheetRow) {
        try {
          await fetch("/api/sheets/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ row: current.sheetRow, data: editForm }),
          });
        } catch (sheetErr: any) {
          setError(sheetErr?.message || "Saved, but failed to update sheet");
        }
      }
      setEditingId(null);
    } catch (err: any) {
      setError(err?.message || "Failed to save changes");
    }
  };

  const removeRow = async (id: string) => {
    setError(null);
    try {
      const current = rows.find((r) => r.id === id);
      await deleteDoc(doc(db, "car_entries", id));
      if (current?.sheetRow) {
        try {
          await fetch("/api/sheets/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ row: current.sheetRow }),
          });
        } catch (sheetErr: any) {
          setError(sheetErr?.message || "Deleted, but failed to delete in sheet");
        }
      }
    } catch (err: any) {
      setError(err?.message || "Failed to delete entry");
    }
  };

  

  return (
    <div className="min-h-screen w-full bg-zinc-50 px-2 py-4 font-sans dark:bg-black">
      <main className="w-full space-y-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Car Details & Customer Tracking
        </h1>
        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <form
          onSubmit={addRow}
          noValidate
          className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600 dark:text-zinc-300">Car Details</label>
            <input
              name="carDetails"
              value={form.carDetails}
              onChange={handleChange}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="e.g. Toyota Prius"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600 dark:text-zinc-300">Plate No</label>
            <input
              name="plateNo"
              value={form.plateNo}
              onChange={handleChange}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="ABC-1234"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600 dark:text-zinc-300">Email ID</label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="name@example.com"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600 dark:text-zinc-300">Contact Number</label>
            <input
              name="contactNumber"
              value={form.contactNumber}
              onChange={handleChange}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="+91 99999 99999"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600 dark:text-zinc-300">Customer Name</label>
            <input
              name="customerName"
              value={form.customerName}
              onChange={handleChange}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="Full name"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600 dark:text-zinc-300">Trips</label>
            <input
              name="trips"
              value={form.trips}
              onChange={handleChange}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="e.g. 120"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600 dark:text-zinc-300">Applied at</label>
            <input
              name="appliedAt"
              value={form.appliedAt}
              onChange={handleChange}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="Location or platform"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600 dark:text-zinc-300">Source</label>
            <input
              name="source"
              value={form.source}
              onChange={handleChange}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="Referral, ad, etc."
            />
          </div>

          

          

          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600 dark:text-zinc-300">Owner/ Available days</label>
            <input
              name="ownerOrAvailableDays"
              value={form.ownerOrAvailableDays}
              onChange={handleChange}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="Owner name or days"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600 dark:text-zinc-300">Driver Rating</label>
            <input
              name="driverRating"
              value={form.driverRating}
              onChange={handleChange}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="e.g. 4.8"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600 dark:text-zinc-300">Satisfaction Rate</label>
            <input
              name="satisfactionRate"
              value={form.satisfactionRate}
              onChange={handleChange}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="100%"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600 dark:text-zinc-300">Acceptance Rate</label>
            <input
              name="acceptanceRate"
              value={form.acceptanceRate}
              onChange={handleChange}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="100%"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600 dark:text-zinc-300">Cancellation Rate</label>
            <input
              name="cancellationRate"
              value={form.cancellationRate}
              onChange={handleChange}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="100%"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600 dark:text-zinc-300">Tenure</label>
            <input
              name="tenure"
              value={form.tenure}
              onChange={handleChange}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="e.g. 5 years"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600 dark:text-zinc-300">Rating</label>
            <input
              name="rating"
              value={form.rating}
              onChange={handleChange}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="e.g. A+ or 4.5"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600 dark:text-zinc-300">Uber Pro</label>
            <input
              name="uberPro"
              value={form.uberPro}
              onChange={handleChange}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="Level"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3 mt-2 flex items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-200 dark:text-black dark:hover:bg-white"
            >
              Add Row
            </button>
            
          </div>
        </form>

        <div className="overflow-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              <tr>
                <th className="p-3">Car Details</th>
                <th className="p-3">Plate No</th>
                <th className="p-3">Email ID</th>
                <th className="p-3">Contact Number</th>
                <th className="p-3">Customer Name</th>
                <th className="p-3">Trips</th>
                <th className="p-3">Applied at</th>
                <th className="p-3">Source</th>
                <th className="p-3">Owner/ Available days</th>
                <th className="p-3">Driver Rating</th>
                <th className="p-3">Satisfaction Rate</th>
                <th className="p-3">Acceptance Rate</th>
                <th className="p-3">Cancellation Rate</th>
                <th className="p-3">Tenure</th>
                <th className="p-3">Rating</th>
                <th className="p-3">Uber Pro</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="p-4 text-zinc-500 dark:text-zinc-400" colSpan={17}>
                    No entries yet. Add a row above.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                    {editingId === r.id ? (
                      <>
                        <td className="p-2 align-top"><input name="carDetails" value={editForm.carDetails} onChange={handleEditChange} className="w-40 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" /></td>
                        <td className="p-2 align-top"><input name="plateNo" value={editForm.plateNo} onChange={handleEditChange} className="w-32 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" /></td>
                        <td className="p-2 align-top"><input name="email" value={editForm.email} onChange={handleEditChange} className="w-44 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" /></td>
                        <td className="p-2 align-top"><input name="contactNumber" value={editForm.contactNumber} onChange={handleEditChange} className="w-36 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" /></td>
                        <td className="p-2 align-top"><input name="customerName" value={editForm.customerName} onChange={handleEditChange} className="w-40 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" /></td>
                        <td className="p-2 align-top"><input name="trips" value={editForm.trips} onChange={handleEditChange} className="w-24 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" /></td>
                        <td className="p-2 align-top"><input name="appliedAt" value={editForm.appliedAt} onChange={handleEditChange} className="w-36 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" /></td>
                        <td className="p-2 align-top"><input name="source" value={editForm.source} onChange={handleEditChange} className="w-28 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" /></td>
                        <td className="p-2 align-top"><input name="ownerOrAvailableDays" value={editForm.ownerOrAvailableDays} onChange={handleEditChange} className="w-40 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" /></td>
                        <td className="p-2 align-top"><input name="driverRating" value={editForm.driverRating} onChange={handleEditChange} className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" /></td>
                        <td className="p-2 align-top"><input name="satisfactionRate" value={editForm.satisfactionRate} onChange={handleEditChange} className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" /></td>
                        <td className="p-2 align-top"><input name="acceptanceRate" value={editForm.acceptanceRate} onChange={handleEditChange} className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" /></td>
                        <td className="p-2 align-top"><input name="cancellationRate" value={editForm.cancellationRate} onChange={handleEditChange} className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" /></td>
                        <td className="p-2 align-top"><input name="tenure" value={editForm.tenure} onChange={handleEditChange} className="w-28 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" /></td>
                        <td className="p-2 align-top"><input name="rating" value={editForm.rating} onChange={handleEditChange} className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" /></td>
                        <td className="p-2 align-top"><input name="uberPro" value={editForm.uberPro} onChange={handleEditChange} className="w-24 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" /></td>
                        <td className="p-2 align-top whitespace-nowrap">
                          <button onClick={() => saveEdit(r.id)} className="mr-2 rounded bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700">Save</button>
                          <button onClick={cancelEdit} className="rounded border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 align-top">{r.carDetails}</td>
                        <td className="p-3 align-top">{r.plateNo}</td>
                        <td className="p-3 align-top">{r.email}</td>
                        <td className="p-3 align-top">{r.contactNumber}</td>
                        <td className="p-3 align-top">{r.customerName}</td>
                        <td className="p-3 align-top">{r.trips}</td>
                        <td className="p-3 align-top">{r.appliedAt}</td>
                        <td className="p-3 align-top">{r.source}</td>
                        <td className="p-3 align-top">{r.ownerOrAvailableDays}</td>
                        <td className="p-3 align-top">{r.driverRating}</td>
                        <td className="p-3 align-top">{r.satisfactionRate}</td>
                        <td className="p-3 align-top">{r.acceptanceRate}</td>
                        <td className="p-3 align-top">{r.cancellationRate}</td>
                        <td className="p-3 align-top">{r.tenure}</td>
                        <td className="p-3 align-top">{r.rating}</td>
                        <td className="p-3 align-top">{r.uberPro}</td>
                        <td className="p-3 align-top whitespace-nowrap">
                          <button onClick={() => startEdit(r)} className="mr-2 rounded border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">Edit</button>
                          <button onClick={() => removeRow(r.id)} className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700">Delete</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
