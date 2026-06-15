import { useState, useEffect } from "react";
import { subscribeToMedicines, subscribeToStockEntries, addStockEntry, Medicine, StockEntry as StockEntryType } from "@/lib/firestore";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, PackagePlus, History, ArrowDownToLine, Box, ChevronsUpDown, Check } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
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
  const [medicineOpen, setMedicineOpen] = useState(false);

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

  useEffect(() => {
    setLoadingData(true);
    let medsLoaded = false;
    let entriesLoaded = false;
    
    const checkLoaded = () => {
      if (medsLoaded && entriesLoaded) setLoadingData(false);
    };

    const unsubMeds = subscribeToMedicines((meds) => {
      setMedicines(meds);
      medsLoaded = true;
      checkLoaded();
    });

    const unsubEntries = subscribeToStockEntries((ents) => {
      setEntries(ents.slice(0, 20));
      entriesLoaded = true;
      checkLoaded();
    });

    return () => {
      unsubMeds();
      unsubEntries();
    };
  }, []);

  function onSubmit(data: StockEntryFormValues) {
    const medicine = medicines.find((m) => m.id === data.medicineId);
    if (!medicine) return;

    setSubmitting(true);
    
    addStockEntry({
      ...data,
      medicineName: medicine.name,
      supplierId: "",
      supplierName: "",
      createdBy: userProfile?.displayName || userProfile?.email || "Unknown",
    }).catch((err: any) => {
      toast({ title: "Sync Error", description: err.message || "Failed to sync stock entry.", variant: "destructive" });
    });
    
    toast({ title: "Stock entry logged", description: `Added ${data.quantityReceived} units of ${medicine.name} (syncing in background).` });
    
    form.reset({
      medicineId: "",
      quantityReceived: 0,
      batchNumber: "",
      expiryDate: "",
      dateReceived: new Date().toISOString().split("T")[0],
      notes: "",
    });
    
    setSubmitting(false);
  }

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 shadow-sm">
          <PackagePlus className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Stock Entry</h1>
          <p className="text-sm text-muted-foreground">Log new medicine deliveries into inventory</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden border-0 shadow-lg shadow-emerald-900/5">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white relative overflow-hidden">
            <div className="absolute -right-6 -top-10 opacity-20">
              <Box className="h-40 w-40" />
            </div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2 relative z-10">
              <ArrowDownToLine className="h-6 w-6" />
              Incoming Delivery
            </CardTitle>
            <p className="text-emerald-50 mt-1 relative z-10 text-sm">
              Scan or enter details for the newly received stock.
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
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === m.id ? "opacity-100 text-primary" : "opacity-0"
                                      )}
                                    />
                                    {m.name}
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

              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  type="submit" 
                  disabled={submitting} 
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 h-11 px-8 rounded-full" 
                  data-testid="button-submit-stock"
                >
                  {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PackagePlus className="mr-2 h-5 w-5" />}
                  Log Stock Entry
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
            <History className="h-5 w-5 text-emerald-600" />
            <CardTitle className="text-lg">Recent Deliveries</CardTitle>
          </div>
          <CardContent className="p-0">
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
                    <motion.tr 
                      key={entry.id}
                      variants={rowVariants}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                    >
                      <TableCell className="font-medium">{entry.medicineName}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          +{entry.quantityReceived}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{entry.batchNumber}</TableCell>
                      <TableCell>{entry.expiryDate ? format(new Date(entry.expiryDate), "MMM d, yyyy") : "-"}</TableCell>
                      <TableCell>{entry.dateReceived ? format(new Date(entry.dateReceived), "MMM d, yyyy") : "-"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{entry.createdBy}</TableCell>
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
