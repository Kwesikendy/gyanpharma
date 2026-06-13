import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Medicine, MedicineInput, MedicineUnit, MedicineStatus } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

const units: MedicineUnit[] = ["tablets", "capsules", "ml", "mg", "units", "vials", "strips", "sachets"];
const statuses: MedicineStatus[] = ["active", "inactive", "discontinued"];

const categories = [
  "Analgesics", "Antibiotics", "Antifungals", "Antivirals", "Antihistamines",
  "Cardiovascular", "Diabetes", "Vitamins & Supplements", "Gastrointestinal",
  "Respiratory", "Dermatology", "Neurology", "Oncology", "Other",
];

const medicineSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  quantity: z.coerce.number().int().min(0, "Cannot be negative"),
  unit: z.enum(["tablets", "capsules", "ml", "mg", "units", "vials", "strips", "sachets"]),
  expiryDate: z.string().min(1, "Expiry date is required"),
  price: z.coerce.number().min(0, "Cannot be negative"),
  batchNumber: z.string().min(1, "Batch number is required"),
  status: z.enum(["active", "inactive", "discontinued"]),
  lowStockThreshold: z.coerce.number().int().min(1, "Threshold must be at least 1"),
  description: z.string().optional(),
});

type MedicineFormValues = z.infer<typeof medicineSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicine?: Medicine | null;
  submitting: boolean;
  onSubmit: (data: MedicineInput) => Promise<void>;
}

export function MedicineDialog({ open, onOpenChange, medicine, submitting, onSubmit }: Props) {
  const form = useForm<MedicineFormValues>({
    resolver: zodResolver(medicineSchema),
    defaultValues: {
      name: "", category: "", quantity: 0, unit: "tablets",
      expiryDate: "", price: 0, batchNumber: "", status: "active",
      lowStockThreshold: 20, description: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (medicine) {
        form.reset({
          name: medicine.name,
          category: medicine.category,
          quantity: medicine.quantity,
          unit: medicine.unit,
          expiryDate: medicine.expiryDate,
          price: medicine.price,
          batchNumber: medicine.batchNumber,
          status: medicine.status,
          lowStockThreshold: medicine.lowStockThreshold,
          description: medicine.description || "",
        });
      } else {
        form.reset({
          name: "", category: "", quantity: 0, unit: "tablets",
          expiryDate: "", price: 0, batchNumber: "", status: "active",
          lowStockThreshold: 20, description: "",
        });
      }
    }
  }, [open, medicine]);

  async function handleSubmit(data: MedicineFormValues) {
    await onSubmit({
      ...data,
      supplierId: "",
      supplierName: "",
      unit: data.unit as MedicineUnit,
      status: data.status as MedicineStatus,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{medicine ? "Edit Medicine" : "Add New Medicine"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Medicine Name</FormLabel>
                  <FormControl><Input placeholder="e.g. Paracetamol 500mg" {...field} data-testid="input-medicine-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="unit" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-unit">
                        <SelectValue placeholder="Select unit..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Quantity</FormLabel>
                  <FormControl><Input type="number" min={0} {...field} data-testid="input-quantity" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (GH₵)</FormLabel>
                  <FormControl><Input type="number" min={0} step="0.01" {...field} data-testid="input-price" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="batchNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Batch Number</FormLabel>
                  <FormControl><Input placeholder="e.g. BTH-2024-001" {...field} data-testid="input-batch" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="expiryDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiry Date</FormLabel>
                  <FormControl><Input type="date" {...field} data-testid="input-expiry" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="lowStockThreshold" render={({ field }) => (
                <FormItem>
                  <FormLabel>Low Stock Threshold</FormLabel>
                  <FormControl><Input type="number" min={1} {...field} data-testid="input-threshold" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue placeholder="Status..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statuses.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="Brief description..." rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} data-testid="button-save-medicine">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {medicine ? "Save Changes" : "Add Medicine"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
