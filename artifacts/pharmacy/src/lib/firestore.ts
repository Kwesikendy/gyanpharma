import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MedicineStatus = "active" | "inactive" | "discontinued";
export type MedicineUnit = "tablets" | "capsules" | "ml" | "mg" | "units" | "vials" | "strips" | "sachets";

export interface Medicine {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: MedicineUnit;
  supplierId: string;
  supplierName: string;
  expiryDate: string;
  price: number;
  batchNumber: string;
  status: MedicineStatus;
  lowStockThreshold: number;
  description?: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface MedicineInput {
  name: string;
  category: string;
  quantity: number;
  unit: MedicineUnit;
  supplierId: string;
  supplierName: string;
  expiryDate: string;
  price: number;
  batchNumber: string;
  status: MedicineStatus;
  lowStockThreshold: number;
  description?: string;
}

export interface StockEntry {
  id: string;
  medicineId: string;
  medicineName: string;
  quantityReceived: number;
  supplierId: string;
  supplierName: string;
  batchNumber: string;
  expiryDate: string;
  dateReceived: string;
  notes?: string;
  createdAt: Date | null;
  createdBy: string;
}

export interface StockEntryInput {
  medicineId: string;
  medicineName: string;
  quantityReceived: number;
  supplierId: string;
  supplierName: string;
  batchNumber: string;
  expiryDate: string;
  dateReceived: string;
  notes?: string;
  createdBy: string;
}

export interface DispensingRecord {
  id: string;
  medicineId: string;
  medicineName: string;
  quantityDispensed: number;
  unitPrice?: number;
  totalPrice?: number;
  patientName?: string;
  dispensedBy: string;
  dispensedByName: string;
  date: string;
  notes?: string;
  createdAt: Date | null;
}

export interface DispensingInput {
  medicineId: string;
  medicineName: string;
  quantityDispensed: number;
  unitPrice?: number;
  totalPrice?: number;
  patientName?: string;
  dispensedBy: string;
  dispensedByName: string;
  date: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
  createdAt: Date | null;
}

export interface SupplierInput {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
}

export interface DashboardStats {
  totalMedicines: number;
  lowStockCount: number;
  expiredCount: number;
  expiringSoonCount: number;
  totalSuppliers: number;
  todayRevenue: number;
  itemsSoldToday: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: "stock_in" | "dispensed" | "medicine_added" | "medicine_updated";
  description: string;
  amount?: number;
  timestamp: Date | null;
  by?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  return null;
}

function isExpired(expiryDate: string) {
  return new Date(expiryDate) < new Date();
}

function isExpiringSoon(expiryDate: string, days = 30) {
  const expiry = new Date(expiryDate);
  const soon = new Date();
  soon.setDate(soon.getDate() + days);
  return expiry >= new Date() && expiry <= soon;
}

// ─── Medicines ────────────────────────────────────────────────────────────────

export async function getMedicines(): Promise<Medicine[]> {
  const snap = await getDocs(query(collection(db, "medicines"), orderBy("name")));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    } as Medicine;
  });
}

export function subscribeToMedicines(callback: (medicines: Medicine[]) => void): () => void {
  const q = query(collection(db, "medicines"), orderBy("name"));
  return onSnapshot(q, (snap) => {
    const meds = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      } as Medicine;
    });
    callback(meds);
  });
}

export async function getMedicine(id: string): Promise<Medicine | null> {
  const snap = await getDoc(doc(db, "medicines", id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { id: snap.id, ...data, createdAt: toDate(data.createdAt), updatedAt: toDate(data.updatedAt) } as Medicine;
}

export async function addMedicine(input: MedicineInput): Promise<string> {
  const ref = await addDoc(collection(db, "medicines"), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateMedicine(id: string, input: Partial<MedicineInput>): Promise<void> {
  await updateDoc(doc(db, "medicines", id), { ...input, updatedAt: serverTimestamp() });
}

export async function deleteMedicine(id: string): Promise<void> {
  await deleteDoc(doc(db, "medicines", id));
}

// ─── Stock Entries ────────────────────────────────────────────────────────────

export async function getStockEntries(): Promise<StockEntry[]> {
  const snap = await getDocs(query(collection(db, "stockEntries"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, createdAt: toDate(data.createdAt) } as StockEntry;
  });
}

export function subscribeToStockEntries(callback: (entries: StockEntry[]) => void): () => void {
  const q = query(collection(db, "stockEntries"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const entries = snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data, createdAt: toDate(data.createdAt) } as StockEntry;
    });
    callback(entries);
  });
}

export async function addStockEntry(input: StockEntryInput): Promise<string> {
  const batch = writeBatch(db);
  const entryRef = doc(collection(db, "stockEntries"));
  batch.set(entryRef, { ...input, createdAt: serverTimestamp() });
  const medicineRef = doc(db, "medicines", input.medicineId);
  const medicineSnap = await getDoc(medicineRef);
  if (medicineSnap.exists()) {
    const current = medicineSnap.data().quantity || 0;
    batch.update(medicineRef, {
      quantity: current + input.quantityReceived,
      expiryDate: input.expiryDate,
      batchNumber: input.batchNumber,
      supplierName: input.supplierName,
      supplierId: input.supplierId,
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
  return entryRef.id;
}

// ─── Dispensing Records ───────────────────────────────────────────────────────

export async function getDispensingRecords(): Promise<DispensingRecord[]> {
  const snap = await getDocs(query(collection(db, "dispensingRecords"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, createdAt: toDate(data.createdAt) } as DispensingRecord;
  });
}

export function subscribeToDispensingRecords(callback: (records: DispensingRecord[]) => void): () => void {
  const q = query(collection(db, "dispensingRecords"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const records = snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data, createdAt: toDate(data.createdAt) } as DispensingRecord;
    });
    callback(records);
  });
}

export async function addDispensingRecord(input: DispensingInput): Promise<string> {
  const medicineSnap = await getDoc(doc(db, "medicines", input.medicineId));
  if (!medicineSnap.exists()) throw new Error("Medicine not found");
  const medicine = medicineSnap.data();
  const currentQty = medicine.quantity || 0;
  if (currentQty < input.quantityDispensed) {
    throw new Error(`Insufficient stock. Available: ${currentQty}`);
  }
  if (isExpired(medicine.expiryDate)) {
    throw new Error("Warning: This medicine has expired. Dispensing not allowed.");
  }
  
  const unitPrice = medicine.price || 0;
  const totalPrice = unitPrice * input.quantityDispensed;

  const batch = writeBatch(db);
  const recordRef = doc(collection(db, "dispensingRecords"));
  batch.set(recordRef, { ...input, unitPrice, totalPrice, createdAt: serverTimestamp() });
  batch.update(doc(db, "medicines", input.medicineId), {
    quantity: currentQty - input.quantityDispensed,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return recordRef.id;
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export async function getSuppliers(): Promise<Supplier[]> {
  const snap = await getDocs(query(collection(db, "suppliers"), orderBy("name")));
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, createdAt: toDate(data.createdAt) } as Supplier;
  });
}

export function subscribeToSuppliers(callback: (suppliers: Supplier[]) => void): () => void {
  const q = query(collection(db, "suppliers"), orderBy("name"));
  return onSnapshot(q, (snap) => {
    const suppliers = snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data, createdAt: toDate(data.createdAt) } as Supplier;
    });
    callback(suppliers);
  });
}

export async function addSupplier(input: SupplierInput): Promise<string> {
  const ref = await addDoc(collection(db, "suppliers"), {
    ...input,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateSupplier(id: string, input: Partial<SupplierInput>): Promise<void> {
  await updateDoc(doc(db, "suppliers", id), input);
}

export async function deleteSupplier(id: string): Promise<void> {
  await deleteDoc(doc(db, "suppliers", id));
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const todayStr = new Date().toISOString().split("T")[0];
  
  const [medicines, suppliers, stockEntriesSnap, dispensingSnap, todayDispensingSnap] = await Promise.all([
    getMedicines(),
    getSuppliers(),
    getDocs(query(collection(db, "stockEntries"), orderBy("createdAt", "desc"), limit(5))),
    getDocs(query(collection(db, "dispensingRecords"), orderBy("createdAt", "desc"), limit(5))),
    getDocs(query(collection(db, "dispensingRecords"), where("date", "==", todayStr))),
  ]);

  const lowStockCount = medicines.filter(
    (m) => m.quantity < m.lowStockThreshold && m.status === "active"
  ).length;
  const expiredCount = medicines.filter((m) => isExpired(m.expiryDate) && m.status === "active").length;
  const expiringSoonCount = medicines.filter(
    (m) => isExpiringSoon(m.expiryDate) && m.status === "active"
  ).length;

  const recentActivity: ActivityItem[] = [];

  dispensingSnap.docs.slice(0, 3).forEach((d) => {
    const data = d.data();
    recentActivity.push({
      id: d.id,
      type: "dispensed",
      description: `Dispensed ${data.quantityDispensed} ${data.medicineName}${data.patientName ? ` to ${data.patientName}` : ""}`,
      amount: data.totalPrice,
      timestamp: toDate(data.createdAt),
      by: data.dispensedByName,
    });
  });

  stockEntriesSnap.docs.slice(0, 3).forEach((d) => {
    const data = d.data();
    recentActivity.push({
      id: d.id,
      type: "stock_in",
      description: `Received ${data.quantityReceived} units of ${data.medicineName}`,
      timestamp: toDate(data.createdAt),
      by: data.createdBy,
    });
  });

  recentActivity.sort((a, b) => {
    if (!a.timestamp || !b.timestamp) return 0;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  let todayRevenue = 0;
  let itemsSoldToday = 0;
  
  todayDispensingSnap.forEach((d) => {
    const data = d.data();
    todayRevenue += (data.totalPrice || 0);
    itemsSoldToday += (data.quantityDispensed || 0);
  });

  return {
    totalMedicines: medicines.length,
    lowStockCount,
    expiredCount,
    expiringSoonCount,
    totalSuppliers: suppliers.length,
    todayRevenue,
    itemsSoldToday,
    recentActivity: recentActivity.slice(0, 8),
  };
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface PharmacyUser {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "pharmacist";
  createdAt: Date | null;
}

export async function getUsers(): Promise<PharmacyUser[]> {
  const snap = await getDocs(query(collection(db, "users"), orderBy("displayName")));
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, createdAt: toDate(data.createdAt) } as PharmacyUser;
  });
}

// ─── Utility: check low stock / expiry ───────────────────────────────────────

export function getLowStockMedicines(medicines: Medicine[]): Medicine[] {
  return medicines.filter(
    (m) => m.quantity < m.lowStockThreshold && m.status === "active"
  );
}

export function getExpiringMedicines(medicines: Medicine[], days = 30): Medicine[] {
  return medicines.filter(
    (m) => (isExpiringSoon(m.expiryDate, days) || isExpired(m.expiryDate)) && m.status === "active"
  );
}

export { isExpired, isExpiringSoon };

// ─── Full Data Backup ─────────────────────────────────────────────────────────

export interface BackupData {
  meta: {
    exportedAt: string;
    exportedBy: string;
    appName: string;
    version: string;
    counts: Record<string, number>;
  };
  medicines: Record<string, unknown>[];
  stockEntries: Record<string, unknown>[];
  dispensingRecords: Record<string, unknown>[];
  suppliers: Record<string, unknown>[];
  users: Record<string, unknown>[];
}

function serializeDoc(id: string, data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { id };
  for (const [key, val] of Object.entries(data)) {
    if (val instanceof Timestamp) {
      out[key] = val.toDate().toISOString();
    } else if (val instanceof Date) {
      out[key] = val.toISOString();
    } else {
      out[key] = val;
    }
  }
  return out;
}

export async function exportAllData(exportedBy: string): Promise<BackupData> {
  const [medicinesSnap, stockSnap, dispensingSnap, suppliersSnap, usersSnap] =
    await Promise.all([
      getDocs(collection(db, "medicines")),
      getDocs(collection(db, "stockEntries")),
      getDocs(collection(db, "dispensingRecords")),
      getDocs(collection(db, "suppliers")),
      getDocs(collection(db, "users")),
    ]);

  const medicines = medicinesSnap.docs.map((d) =>
    serializeDoc(d.id, d.data() as Record<string, unknown>)
  );
  const stockEntries = stockSnap.docs.map((d) =>
    serializeDoc(d.id, d.data() as Record<string, unknown>)
  );
  const dispensingRecords = dispensingSnap.docs.map((d) =>
    serializeDoc(d.id, d.data() as Record<string, unknown>)
  );
  const suppliers = suppliersSnap.docs.map((d) =>
    serializeDoc(d.id, d.data() as Record<string, unknown>)
  );
  const users = usersSnap.docs.map((d) =>
    serializeDoc(d.id, d.data() as Record<string, unknown>)
  );

  return {
    meta: {
      exportedAt: new Date().toISOString(),
      exportedBy,
      appName: "Gyan Chemicals Pharmacy Manager",
      version: "1.0",
      counts: {
        medicines: medicines.length,
        stockEntries: stockEntries.length,
        dispensingRecords: dispensingRecords.length,
        suppliers: suppliers.length,
        users: users.length,
      },
    },
    medicines,
    stockEntries,
    dispensingRecords,
    suppliers,
    users,
  };
}
