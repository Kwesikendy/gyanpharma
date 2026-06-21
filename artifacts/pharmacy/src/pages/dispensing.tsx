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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pill, Download, AlertTriangle, AlertCircle, History, Receipt, ArrowRight, ChevronsUpDown, Check, Plus, Trash2, ShoppingCart } from "lucide-react";
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

const cartItemSchema = z.object({
  medicineId: z.string().min(1, "Select a medicine"),
  quantityDispensed: z.coerce.number().int().positive("Must be a positive number"),
});

const orderSchema = z.object({
  patientName: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type CartItemFormValues = z.infer<typeof cartItemSchema>;
type OrderFormValues = z.infer<typeof orderSchema>;

interface CartItem {
  id: string; // local id for the cart list
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string;
}

export default function Dispensing() {
  const { userProfile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [records, setRecords] = useState<DispensingRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [medicineOpen, setMedicineOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  const cartForm = useForm<CartItemFormValues>({
    resolver: zodResolver(cartItemSchema),
    defaultValues: {
      medicineId: "",
      quantityDispensed: 1,
    },
  });

  const orderForm = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      patientName: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  const watchMedicineId = cartForm.watch("medicineId");
  const watchQty = cartForm.watch("quantityDispensed");

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

  const quantityInCart = cart.filter(c => c.medicineId === selectedMedicine?.id).reduce((acc, curr) => acc + curr.quantity, 0);

  const remainingAfterDispense = selectedMedicine
    ? selectedMedicine.quantity - quantityInCart - (watchQty || 0)
    : null;

  const unitPrice = selectedMedicine?.price || 0;
  const totalPrice = unitPrice * (watchQty || 0);
  const cartGrandTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  function onAddToCart(data: CartItemFormValues) {
    const medicine = medicines.find((m) => m.id === data.medicineId);
    if (!medicine) return;

    setCart([...cart, {
      id: Math.random().toString(36).substr(2, 9),
      medicineId: medicine.id,
      medicineName: medicine.name,
      quantity: data.quantityDispensed,
      unitPrice: medicine.price,
      totalPrice: medicine.price * data.quantityDispensed,
      unit: medicine.unit,
    }]);

    cartForm.reset({
      medicineId: "",
      quantityDispensed: 1,
    });
    setSelectedMedicine(null);
  }

  function removeFromCart(id: string) {
    setCart(cart.filter(item => item.id !== id));
  }

  async function onCompleteOrder(data: OrderFormValues) {
    if (cart.length === 0) return;
    setSubmitting(true);
    
    try {
      const promises = cart.map(item => {
        return addDispensingRecord({
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          quantityDispensed: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          patientName: data.patientName,
          date: data.date,
          notes: data.notes,
          dispensedBy: userProfile?.uid || "",
          dispensedByName: userProfile?.displayName || userProfile?.email || "Unknown",
        });
      });

      await Promise.all(promises);

      toast({
        title: "Order completed",
        description: `${cart.length} items dispensed successfully.`,
      });
      
      setCart([]);
      orderForm.reset({
        patientName: "",
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });
    } catch (err: any) {
      toast({ title: "Sync Error", description: err.message || "Failed to sync dispensing order.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
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
            <p className="text-sm text-muted-foreground">Process orders and dispense medication</p>
          </div>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button variant="outline" onClick={() => exportDispensingToCsv(records)} disabled={records.length === 0} className="shadow-sm">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </motion.div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Add to Cart */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="overflow-hidden border-0 shadow-lg shadow-indigo-900/5">
            <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-5 text-white relative overflow-hidden">
              <div className="absolute -right-4 -top-8 opacity-20">
                <Receipt className="h-32 w-32" />
              </div>
              <CardTitle className="text-xl font-bold flex items-center gap-2 relative z-10">
                <Plus className="h-5 w-5" />
                Add Item
              </CardTitle>
            </div>
            <CardContent className="p-5">
              <Form {...cartForm}>
                <form onSubmit={cartForm.handleSubmit(onAddToCart)} className="space-y-4">
                  <FormField
                    control={cartForm.control}
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
                                className={cn("w-full justify-between font-normal", !field.value && "text-muted-foreground")}
                              >
                                {field.value ? medicines.find((m) => m.id === field.value)?.name : "Search medicine..."}
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
                                        <Check className={cn("h-4 w-4", field.value === m.id ? "opacity-100 text-primary" : "opacity-0")} />
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
                    control={cartForm.control}
                    name="quantityDispensed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedMedicine && (
                    <div className="space-y-2 mt-4">
                      <div className="flex flex-col gap-2 rounded-lg bg-muted p-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">In Stock:</span>
                          <span className={`font-bold ${selectedMedicine.quantity <= selectedMedicine.lowStockThreshold ? "text-amber-600" : "text-green-600"}`}>
                            {selectedMedicine.quantity} {selectedMedicine.unit}
                          </span>
                        </div>
                        {quantityInCart > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">In Cart:</span>
                            <span className="font-medium text-blue-600">
                              {quantityInCart} {selectedMedicine.unit}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between border-t pt-2 mt-1">
                          <span className="text-muted-foreground">Line Total:</span>
                          <span className="font-bold text-emerald-600">
                            GH₵{totalPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpired(selectedMedicine.expiryDate) && (
                          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                            <Alert variant="destructive" className="shadow-sm py-2">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>Medicine expired.</AlertDescription>
                            </Alert>
                          </motion.div>
                        )}
                        {!isExpired(selectedMedicine.expiryDate) && remainingAfterDispense !== null && remainingAfterDispense < 0 && (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                            <Alert variant="destructive" className="shadow-sm py-2">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription className="font-semibold">Insufficient stock.</AlertDescription>
                            </Alert>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={!selectedMedicine || isExpired(selectedMedicine.expiryDate) || (remainingAfterDispense !== null && remainingAfterDispense < 0)}
                    className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add to Cart
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Cart & Checkout */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="overflow-hidden border shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center bg-muted/40 px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-lg">Current Order</CardTitle>
              </div>
              <Badge variant="secondary" className="font-mono text-sm bg-indigo-100 text-indigo-800">
                {cart.length} items
              </Badge>
            </div>
            
            <CardContent className="p-0 flex-grow">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground space-y-3">
                  <ShoppingCart className="h-10 w-10 opacity-20" />
                  <p>Order is empty.</p>
                </div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {cart.map((item) => (
                          <motion.tr 
                            key={item.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="border-b"
                          >
                            <TableCell className="font-medium">
                              {item.medicineName}
                              <div className="text-xs text-muted-foreground">GH₵{item.unitPrice.toFixed(2)}/{item.unit}</div>
                            </TableCell>
                            <TableCell className="text-center font-bold text-blue-600">{item.quantity}</TableCell>
                            <TableCell className="text-right text-emerald-600 font-medium">GH₵{item.totalPrice.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)} className="h-8 w-8 text-destructive hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>

            <CardFooter className="bg-muted/20 border-t p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center w-full">
                <span className="text-muted-foreground font-medium">Grand Total:</span>
                <span className="text-2xl font-bold text-emerald-600">GH₵{cartGrandTotal.toFixed(2)}</span>
              </div>
              
              <Form {...orderForm}>
                <form onSubmit={orderForm.handleSubmit(onCompleteOrder)} className="w-full space-y-4 border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={orderForm.control}
                      name="patientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Patient (Optional)</FormLabel>
                          <FormControl><Input className="h-9 text-sm" placeholder="Name..." {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={orderForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Date</FormLabel>
                          <FormControl><Input className="h-9 text-sm" type="date" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={orderForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl><Input className="h-9 text-sm" placeholder="Optional notes..." {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={cart.length === 0 || submitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                  >
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Complete Dispensing
                  </Button>
                </form>
              </Form>
            </CardFooter>
          </Card>
        </div>
      </motion.div>

      {/* History Section */}
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
                  <TableHead>Qty</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Patient</TableHead>
                  {isAdmin && <TableHead>Dispensed By</TableHead>}
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingData ? (
                  Array(4).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      {Array(isAdmin ? 6 : 5).fill(0).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-[80px]" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 6 : 5} className="h-24 text-center text-muted-foreground">No dispensing records yet.</TableCell>
                  </TableRow>
                ) : (
                  records.map((rec) => (
                    <motion.tr 
                      key={rec.id}
                      variants={rowVariants}
                      className="border-b hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">{rec.medicineName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-blue-600 border-blue-300">{rec.quantityDispensed}</Badge>
                      </TableCell>
                      <TableCell className="font-medium text-emerald-600">
                        {rec.totalPrice ? `GH₵${rec.totalPrice.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{rec.patientName || <span className="italic text-xs">Anonymous</span>}</TableCell>
                      {isAdmin && <TableCell>{rec.dispensedByName}</TableCell>}
                      <TableCell>{rec.date ? format(new Date(rec.date), "MMM d, yyyy") : "-"}</TableCell>
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
