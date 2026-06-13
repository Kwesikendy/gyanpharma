import { useState, useEffect } from "react";
import { getMedicines, getDispensingRecords, addDispensingRecord, Medicine, DispensingRecord, isExpired } from "@/lib/firestore";
import { exportDispensingToCsv } from "@/lib/exportUtils";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pill, Download, AlertTriangle, AlertCircle, History } from "lucide-react";
import { format } from "date-fns";

const dispensingSchema = z.object({
  medicineId: z.string().min(1, "Select a medicine"),
  quantityDispensed: z.coerce.number().int().positive("Must be a positive number"),
  patientName: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type DispensingFormValues = z.infer<typeof dispensingSchema>;

export default function Dispensing() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [records, setRecords] = useState<DispensingRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);

  const form = useForm<DispensingFormValues>({
    resolver: zodResolver(dispensingSchema),
    defaultValues: {
      medicineId: "",
      quantityDispensed: 1,
      patientName: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  const watchMedicineId = form.watch("medicineId");
  const watchQty = form.watch("quantityDispensed");

  useEffect(() => {
    if (watchMedicineId) {
      const med = medicines.find((m) => m.id === watchMedicineId);
      setSelectedMedicine(med || null);
    } else {
      setSelectedMedicine(null);
    }
  }, [watchMedicineId, medicines]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [meds, recs] = await Promise.all([getMedicines(), getDispensingRecords()]);
      setMedicines(meds.filter((m) => m.status === "active"));
      setRecords(recs.slice(0, 30));
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const remainingAfterDispense = selectedMedicine
    ? selectedMedicine.quantity - (watchQty || 0)
    : null;

  const unitPrice = selectedMedicine?.price || 0;
  const totalPrice = unitPrice * (watchQty || 0);

  async function onSubmit(data: DispensingFormValues) {
    const medicine = medicines.find((m) => m.id === data.medicineId);
    if (!medicine) return;

    setSubmitting(true);
    try {
      await addDispensingRecord({
        ...data,
        medicineName: medicine.name,
        dispensedBy: userProfile?.uid || "",
        dispensedByName: userProfile?.displayName || userProfile?.email || "Unknown",
      });
      toast({
        title: "Dispensing recorded",
        description: `${data.quantityDispensed} ${medicine.unit} of ${medicine.name} dispensed.`,
      });
      form.reset({
        medicineId: "",
        quantityDispensed: 1,
        patientName: "",
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setSelectedMedicine(null);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to record dispensing.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Pill className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Dispensing</h1>
        </div>
        <Button variant="outline" onClick={() => exportDispensingToCsv(records)} disabled={records.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Record Dispensing</CardTitle>
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
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                              {m.quantity <= m.lowStockThreshold && (
                                <span className="ml-2 text-amber-500">(Low: {m.quantity})</span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantityDispensed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity to Dispense</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} data-testid="input-quantity" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="patientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Patient name..." {...field} data-testid="input-patient" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-date" />
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
                      <Textarea placeholder="Additional notes..." rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedMedicine && (
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 rounded-lg bg-muted p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Stock:</span>
                      <span className={`font-bold ${selectedMedicine.quantity <= selectedMedicine.lowStockThreshold ? "text-amber-600" : "text-green-600"}`}>
                        {selectedMedicine.quantity} {selectedMedicine.unit}
                      </span>
                    </div>
                    {remainingAfterDispense !== null && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">→ After:</span>
                        <span className={`font-bold ${remainingAfterDispense < 0 ? "text-destructive" : remainingAfterDispense <= selectedMedicine.lowStockThreshold ? "text-amber-600" : ""}`}>
                          {remainingAfterDispense} {selectedMedicine.unit}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 sm:ml-auto">
                      <span className="text-muted-foreground">Cost:</span>
                      <span className="font-bold text-emerald-600">
                        GH₵{totalPrice.toFixed(2)} <span className="text-muted-foreground font-normal text-xs">(GH₵{unitPrice.toFixed(2)} / {selectedMedicine.unit})</span>
                      </span>
                    </div>
                  </div>

                  {isExpired(selectedMedicine.expiryDate) && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>This medicine has expired. Dispensing is not allowed.</AlertDescription>
                    </Alert>
                  )}

                  {!isExpired(selectedMedicine.expiryDate) && remainingAfterDispense !== null && remainingAfterDispense <= selectedMedicine.lowStockThreshold && remainingAfterDispense >= 0 && (
                    <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>Stock will be below threshold after dispensing.</AlertDescription>
                    </Alert>
                  )}

                  {remainingAfterDispense !== null && remainingAfterDispense < 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>Insufficient stock. Cannot dispense {watchQty} units.</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting || (selectedMedicine ? isExpired(selectedMedicine.expiryDate) : false) || (remainingAfterDispense !== null && remainingAfterDispense < 0)}
                className="w-full sm:w-auto"
                data-testid="button-submit-dispense"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pill className="mr-2 h-4 w-4" />}
                Record Dispensing
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Dispensing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Qty Dispensed</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Dispensed By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
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
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No dispensing records yet.</TableCell>
                  </TableRow>
                ) : (
                  records.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-medium">{rec.medicineName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-blue-600 border-blue-300">{rec.quantityDispensed}</Badge>
                      </TableCell>
                      <TableCell className="font-medium text-emerald-600">
                        {rec.totalPrice ? `GH₵${rec.totalPrice.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{rec.patientName || <span className="italic text-xs">Anonymous</span>}</TableCell>
                      <TableCell>{rec.dispensedByName}</TableCell>
                      <TableCell>{rec.date ? format(new Date(rec.date), "MMM d, yyyy") : "-"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{rec.notes || "-"}</TableCell>
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
