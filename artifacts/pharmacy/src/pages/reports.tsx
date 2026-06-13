import { useState, useEffect } from "react";
import { getDispensingRecords, getStockEntries, DispensingRecord, StockEntry } from "@/lib/firestore";
import { exportDispensingToCsv, exportStockEntriesToCsv } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, Search } from "lucide-react";
import { format } from "date-fns";

export default function Reports() {
  const { toast } = useToast();
  const [dispensingRecords, setDispensingRecords] = useState<DispensingRecord[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispensingSearch, setDispensingSearch] = useState("");
  const [stockSearch, setStockSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([getDispensingRecords(), getStockEntries()])
      .then(([recs, entries]) => {
        setDispensingRecords(recs);
        setStockEntries(entries);
      })
      .catch(() => toast({ title: "Error", description: "Could not load report data.", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const filteredDispensing = dispensingRecords.filter((r) => {
    const matchesSearch =
      !dispensingSearch ||
      r.medicineName.toLowerCase().includes(dispensingSearch.toLowerCase()) ||
      (r.patientName || "").toLowerCase().includes(dispensingSearch.toLowerCase()) ||
      r.dispensedByName.toLowerCase().includes(dispensingSearch.toLowerCase());
    const matchesFrom = !dateFrom || r.date >= dateFrom;
    const matchesTo = !dateTo || r.date <= dateTo;
    return matchesSearch && matchesFrom && matchesTo;
  });

  const filteredStock = stockEntries.filter((e) => {
    const matchesSearch =
      !stockSearch ||
      e.medicineName.toLowerCase().includes(stockSearch.toLowerCase()) ||
      e.batchNumber.toLowerCase().includes(stockSearch.toLowerCase());
    const matchesFrom = !dateFrom || e.dateReceived >= dateFrom;
    const matchesTo = !dateTo || e.dateReceived <= dateTo;
    return matchesSearch && matchesFrom && matchesTo;
  });

  const totalRevenue = filteredDispensing.reduce((sum, r) => sum + (r.totalPrice || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">Date range:</div>
            <div className="flex items-center gap-2">
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" data-testid="input-date-from" />
              <span className="text-muted-foreground">—</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" data-testid="input-date-to" />
            </div>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>
                Clear dates
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="dispensing">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="dispensing">Dispensing History</TabsTrigger>
          <TabsTrigger value="stock">Stock Entries</TabsTrigger>
        </TabsList>

        <TabsContent value="dispensing" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <div className="bg-gradient-to-br from-emerald-500 to-green-600 px-5 py-2.5 rounded-xl shadow-sm text-white min-w-[160px]">
                <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider mb-0.5">Total Revenue</p>
                <p className="text-2xl font-bold">GH₵{totalRevenue.toFixed(2)}</p>
              </div>
              <div className="relative max-w-xs w-full sm:w-[250px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search medicine, patient..."
                  className="pl-8"
                  value={dispensingSearch}
                  onChange={(e) => setDispensingSearch(e.target.value)}
                  data-testid="input-search-dispensing"
                />
              </div>
            </div>
            <Button variant="outline" onClick={() => exportDispensingToCsv(filteredDispensing)} disabled={filteredDispensing.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Export CSV ({filteredDispensing.length})
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Dispensed By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array(5).fill(0).map((_, i) => (
                        <TableRow key={i}>
                          {Array(6).fill(0).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-[80px]" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredDispensing.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No dispensing records found.</TableCell>
                      </TableRow>
                    ) : (
                      filteredDispensing.map((r) => (
                        <TableRow key={r.id} data-testid={`row-dispensing-${r.id}`}>
                          <TableCell className="font-medium">{r.medicineName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-blue-600 border-blue-200">{r.quantityDispensed}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {r.unitPrice ? `GH₵${r.unitPrice.toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell className="font-medium text-emerald-600">
                            {r.totalPrice ? `GH₵${r.totalPrice.toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{r.patientName || <span className="italic text-xs">Anonymous</span>}</TableCell>
                          <TableCell>{r.dispensedByName}</TableCell>
                          <TableCell>{r.date ? format(new Date(r.date), "MMM d, yyyy") : "-"}</TableCell>
                          <TableCell className="text-muted-foreground text-xs max-w-[180px] truncate">{r.notes || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search medicine, supplier, batch..."
                className="pl-8"
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                data-testid="input-search-stock"
              />
            </div>
            <Button variant="outline" onClick={() => exportStockEntriesToCsv(filteredStock)} disabled={filteredStock.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Export CSV ({filteredStock.length})
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead>Qty Received</TableHead>
                      <TableHead>Batch No.</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Date Received</TableHead>
                      <TableHead>Logged By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array(5).fill(0).map((_, i) => (
                        <TableRow key={i}>
                          {Array(6).fill(0).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-[80px]" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredStock.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No stock entries found.</TableCell>
                      </TableRow>
                    ) : (
                      filteredStock.map((e) => (
                        <TableRow key={e.id} data-testid={`row-stock-${e.id}`}>
                          <TableCell className="font-medium">{e.medicineName}</TableCell>
                          <TableCell className="font-semibold text-green-600">+{e.quantityReceived}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{e.batchNumber}</TableCell>
                          <TableCell>{e.expiryDate ? format(new Date(e.expiryDate), "MMM d, yyyy") : "-"}</TableCell>
                          <TableCell>{e.dateReceived ? format(new Date(e.dateReceived), "MMM d, yyyy") : "-"}</TableCell>
                          <TableCell className="text-muted-foreground">{e.createdBy}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
