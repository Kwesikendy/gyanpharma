import { useState, useEffect } from "react";
import { subscribeToMedicines, subscribeToDispensingRecords, addDispensingRecord, Medicine, DispensingRecord, isExpired } from "@/lib/firestore";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pill, Download, AlertTriangle, AlertCircle, History, Receipt, ArrowRight, ChevronsUpDown, Check } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
};

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
  const [medicineOpen, setMedicineOpen] = useState(false);

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

  useEffect(() => {
    setLoadingData(true);
    let medsLoaded = false;
    let recordsLoaded = false;
    
    const checkLoaded = () => {
      if (medsLoaded && recordsLoaded) setLoadingData(false);
    };

    const unsubMeds = subscribeToMedicines((meds) => {
      setMedicines(meds.filter((m) => m.status === "active"));
      medsLoaded = true;
      checkLoaded();
    });

    const unsubRecords = subscribeToDispensingRecords((recs) => {
      setRecords(recs.slice(0, 30));
      recordsLoaded = true;
      checkLoaded();
    });

    return () => {
      unsubMeds();
      unsubRecords();
    };
  }, []);

  const remainingAfterDispense = selectedMedicine
    ? selectedMedicine.quantity - (watchQty || 0)
    : null;

  const unitPrice = selectedMedicine?.price || 0;
  const totalPrice = unitPrice * (watchQty || 0);

  function onSubmit(data: DispensingFormValues) {
    const medicine = medicines.find((m) => m.id === data.medicineId);
    if (!medicine) return;

    setSubmitting(true);
    
    addDispensingRecord({
      ...data,
      medicineName: medicine.name,
      unitPrice,
      totalPrice,
      dispensedBy: userProfile?.uid || "",
      dispensedByName: userProfile?.displayName || userProfile?.email || "Unknown",
    }).catch((err: any) => {
      toast({ title: "Sync Error", description: err.message || "Failed to sync dispensing.", variant: "destructive" });
    });

    toast({
      title: "Dispensing recorded",
      description: `${data.quantityDispensed} ${medicine.unit} of ${medicine.name} dispensed (syncing in background).`,
    });
    
    form.reset({
      medicineId: "",
      quantityDispensed: 1,
      patientName: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    
    setSelectedMedicine(null);
    setSubmitting(false);
  }

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 shadow-sm">
            <Pill className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Dispensing</h1>
            <p className="text-sm text-muted-foreground">Record sales and patient medication pickups</p>
          </div>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button variant="outline" onClick={() => exportDispensingToCsv(records)} disabled={records.length === 0} className="shadow-sm">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </motion.div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden border-0 shadow-lg shadow-indigo-900/5">
          <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-6 text-white relative overflow-hidden">
            <div className="absolute -right-4 -top-8 opacity-20">
              <Receipt className="h-40 w-40" />
            </div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2 relative z-10">
              <ArrowRight className="h-6 w-6" />
              Record Dispensing
            </CardTitle>
            <p className="text-indigo-50 mt-1 relative z-10 text-sm">
              Process a new order or prescription securely.
            </p>
          </div>
          <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="medicineId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Medicine</FormLabel>
                      <Popover open={medicineOpen} onOpenChange={setMedicineOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              data-testid="select-medicine"
                              className={cn(
                                "w-full justify-between font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? medicines.find((m) => m.id === field.value)?.name
                                : "Search medicine..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Type to search medicines..." />
                            <CommandList>
                              <CommandEmpty>No medicine found.</CommandEmpty>
                              <CommandGroup>
                                {medicines.map((m) => (
                                  <CommandItem
                                    key={m.id}
                                    value={m.name}
                                    onSelect={() => {
                                      field.onChange(m.id);
                                      setMedicineOpen(false);
                                    }}
                                    className="flex items-center justify-between"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Check
                                        className={cn(
                                          "h-4 w-4",
                                          field.value === m.id ? "opacity-100 text-primary" : "opacity-0"
                                        )}
                                      />
                                      <span>{m.name}</span>
                                    </div>
                                    {m.quantity <= m.lowStockThreshold && (
                                      <span className="text-xs text-amber-500 font-medium">Low: {m.quantity}</span>
                                    )}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
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

                  <AnimatePresence>
                  {isExpired(selectedMedicine.expiryDate) && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                      <Alert variant="destructive" className="shadow-sm">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>This medicine has expired. Dispensing is not allowed.</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}

                  {!isExpired(selectedMedicine.expiryDate) && remainingAfterDispense !== null && remainingAfterDispense <= selectedMedicine.lowStockThreshold && remainingAfterDispense >= 0 && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                      <Alert className="border-amber-200 bg-amber-50 text-amber-800 shadow-sm">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>Stock will be below threshold after dispensing.</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}

                  {remainingAfterDispense !== null && remainingAfterDispense < 0 && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                      <Alert variant="destructive" className="shadow-sm border-red-200">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="font-semibold">Insufficient stock. Cannot dispense {watchQty} units.</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                  </AnimatePresence>
                </div>
              )}

              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  disabled={submitting || (selectedMedicine ? isExpired(selectedMedicine.expiryDate) : false) || (remainingAfterDispense !== null && remainingAfterDispense < 0)}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 h-11 px-8 rounded-full"
                  data-testid="button-submit-dispense"
                >
                  {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Pill className="mr-2 h-5 w-5" />}
                  Record Dispensing
                </Button>
              </motion.div>
            </form>
          </Form>
        </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden border shadow-sm">
          <div className="flex items-center gap-2 border-b bg-muted/40 px-6 py-4">
            <History className="h-5 w-5 text-indigo-600" />
            <CardTitle className="text-lg">Dispensing History</CardTitle>
          </div>
          <CardContent className="p-0">
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
                    <motion.tr 
                      key={rec.id}
                      variants={rowVariants}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                    >
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
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
