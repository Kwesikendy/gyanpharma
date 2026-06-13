import { useState, useEffect } from "react";
import { getMedicines, getStockEntries, addStockEntry, Medicine, StockEntry as StockEntryType } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, PackagePlus, History } from "lucide-react";
import { format } from "date-fns";

const stockEntrySchema = z.object({
  medicineId: z.string().min(1, "Select a medicine"),
  quantityReceived: z.coerce.number().int().positive("Must be a positive number"),
  batchNumber: z.string().min(1, "Batch number is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  dateReceived: z.string().min(1, "Date received is required"),
  notes: z.string().optional(),
});

type StockEntryFormValues = z.infer<typeof stockEntrySchema>;

export default function StockEntry() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [entries, setEntries] = useState<StockEntryType[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<StockEntryFormValues>({
    resolver: zodResolver(stockEntrySchema),
    defaultValues: {
      medicineId: "",
      quantityReceived: 0,
      batchNumber: "",
      expiryDate: "",
      dateReceived: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [meds, ents] = await Promise.all([getMedicines(), getStockEntries()]);
      setMedicines(meds);
      setEntries(ents.slice(0, 20));
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  async function onSubmit(data: StockEntryFormValues) {
    const medicine = medicines.find((m) => m.id === data.medicineId);
    if (!medicine) return;

    setSubmitting(true);
    try {
      await addStockEntry({
        ...data,
        medicineName: medicine.name,
        supplierId: "",
        supplierName: "",
        createdBy: userProfile?.displayName || userProfile?.email || "Unknown",
      });
      toast({ title: "Stock entry logged", description: `Added ${data.quantityReceived} units of ${medicine.name}.` });
      form.reset({
        medicineId: "",
        quantityReceived: 0,
        batchNumber: "",
        expiryDate: "",
        dateReceived: new Date().toISOString().split("T")[0],
        notes: "",
      });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to log stock entry.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <PackagePlus className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Stock Entry</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log Incoming Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="medicineId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medicine</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-medicine">
                            <SelectValue placeholder="Select medicine..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {medicines.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantityReceived"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity Received</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} placeholder="0" {...field} data-testid="input-quantity" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="batchNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Batch Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. BTH-2024-001" {...field} data-testid="input-batch" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-expiry" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateReceived"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Received</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-date-received" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any additional notes about this stock entry..." rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={submitting} className="w-full sm:w-auto" data-testid="button-submit-stock">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackagePlus className="mr-2 h-4 w-4" />}
                Log Stock Entry
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Stock Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Qty Received</TableHead>
                  <TableHead>Batch No.</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Date Received</TableHead>
                  <TableHead>Logged By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingData ? (
                  Array(4).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      {Array(6).fill(0).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-[80px]" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No stock entries yet.</TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.medicineName}</TableCell>
                      <TableCell className="font-semibold text-green-600">+{entry.quantityReceived}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{entry.batchNumber}</TableCell>
                      <TableCell>{entry.expiryDate ? format(new Date(entry.expiryDate), "MMM d, yyyy") : "-"}</TableCell>
                      <TableCell>{entry.dateReceived ? format(new Date(entry.dateReceived), "MMM d, yyyy") : "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{entry.createdBy}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
