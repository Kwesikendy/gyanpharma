import { useState, useEffect, useMemo } from "react";
import { subscribeToDispensingRecords, DispensingRecord } from "@/lib/firestore";
import { exportDispensingToCsv } from "@/lib/exportUtils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  History, 
  Download, 
  Search, 
  Receipt, 
  TrendingUp, 
  Pill, 
  Calendar, 
  User, 
  FileText, 
  ArrowUpDown, 
  Eye, 
  Printer, 
  CheckCircle2, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  Clock,
  DollarSign
} from "lucide-react";
import { format, isToday, isThisWeek, isThisMonth, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 320, damping: 24 },
  },
};

export default function SalesHistory() {
  const { userProfile, isAdmin } = useAuth();
  const { toast } = useToast();
  
  // Raw records from Firestore
  const [allRecords, setAllRecords] = useState<DispensingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & Sorting State
  const [searchQuery, setSearchQuery] = useState("");
  const [scope, setScope] = useState<"my" | "all">("all"); // 'my' personal sales or 'all' store sales
  const [datePreset, setDatePreset] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortOrder, setSortOrder] = useState<"oldest" | "newest">("newest");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);
  
  // Modal State for viewing receipt details
  const [selectedRecord, setSelectedRecord] = useState<DispensingRecord | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToDispensingRecords((recs) => {
      setAllRecords(recs);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, scope, datePreset, dateFrom, dateTo, sortOrder, pageSize]);

  // Filter and Sort logic
  const filteredAndSortedRecords = useMemo(() => {
    return allRecords
      .filter((r) => {
        // Scope filter: If scope is 'my' OR user is not admin/pharmacist, filter by current user ID
        if (scope === "my" || (!isAdmin && userProfile?.role === "sales")) {
          if (r.dispensedBy !== userProfile?.uid) return false;
        }

        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchMed = r.medicineName.toLowerCase().includes(q);
          const matchPatient = (r.patientName || "").toLowerCase().includes(q);
          const matchStaff = (r.dispensedByName || "").toLowerCase().includes(q);
          const matchNotes = (r.notes || "").toLowerCase().includes(q);
          const matchId = r.id.toLowerCase().includes(q);
          if (!matchMed && !matchPatient && !matchStaff && !matchNotes && !matchId) return false;
        }

        // Date Preset filter
        if (datePreset !== "all" && r.date) {
          const recordDate = parseISO(r.date);
          if (datePreset === "today" && !isToday(recordDate)) return false;
          if (datePreset === "week" && !isThisWeek(recordDate)) return false;
          if (datePreset === "month" && !isThisMonth(recordDate)) return false;
        }

        // Custom Date range filter
        if (datePreset === "custom") {
          if (dateFrom && r.date < dateFrom) return false;
          if (dateTo && r.date > dateTo) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = a.createdAt ? a.createdAt.getTime() : new Date(a.date).getTime();
        const timeB = b.createdAt ? b.createdAt.getTime() : new Date(b.date).getTime();
        
        // If sortOrder is 'oldest', sort from very first sale to the last!
        if (sortOrder === "oldest") {
          return timeA - timeB;
        }
        // Otherwise newest first
        return timeB - timeA;
      });
  }, [allRecords, scope, isAdmin, userProfile, searchQuery, datePreset, dateFrom, dateTo, sortOrder]);

  // KPI Calculations
  const totalTransactions = filteredAndSortedRecords.length;
  const totalRevenue = useMemo(() => {
    return filteredAndSortedRecords.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
  }, [filteredAndSortedRecords]);
  const totalItemsSold = useMemo(() => {
    return filteredAndSortedRecords.reduce((sum, r) => sum + (r.quantityDispensed || 0), 0);
  }, [filteredAndSortedRecords]);
  const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Pagination Slice
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalTransactions / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    if (pageSize === -1) return filteredAndSortedRecords;
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedRecords.slice(start, start + pageSize);
  }, [filteredAndSortedRecords, currentPage, pageSize]);

  function handleOpenReceipt(record: DispensingRecord) {
    setSelectedRecord(record);
    setIsReceiptOpen(true);
  }

  function handlePrintReceipt() {
    window.print();
  }

  return (
    <motion.div 
      className="space-y-6 pb-12"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header Banner ── */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-indigo-500/20"
      >
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-8 h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/30 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
              <span>Full Transaction Archive</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <History className="h-8 w-8 text-indigo-400" />
              Sales History
            </h1>
            <p className="text-slate-300 max-w-xl text-sm sm:text-base leading-relaxed">
              Explore your complete dispensing log from the very first sale to the last. Filter, analyze, and inspect individual transaction receipts in real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <div className="inline-flex rounded-xl bg-slate-800/80 p-1 border border-slate-700/60 backdrop-blur-md shadow-inner">
                <button
                  type="button"
                  onClick={() => setScope("my")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5",
                    scope === "my"
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                  )}
                >
                  <User className="h-3.5 w-3.5" />
                  My Sales
                </button>
                <button
                  type="button"
                  onClick={() => setScope("all")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5",
                    scope === "all"
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                  )}
                >
                  <Receipt className="h-3.5 w-3.5" />
                  All Staff ({allRecords.length})
                </button>
              </div>
            )}

            <Button 
              variant="outline" 
              onClick={() => exportDispensingToCsv(filteredAndSortedRecords)} 
              disabled={filteredAndSortedRecords.length === 0}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-sm backdrop-blur-md transition-all"
            >
              <Download className="mr-2 h-4 w-4" /> Export CSV ({totalTransactions})
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── KPI Summary Cards ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden border bg-gradient-to-br from-background to-muted/30 shadow-sm hover:shadow-md transition-all duration-200 border-l-4 border-l-indigo-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">{totalTransactions.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  {scope === "my" ? "Your personal sales" : "Total store records"}
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
                <Receipt className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border bg-gradient-to-br from-background to-muted/30 shadow-sm hover:shadow-md transition-all duration-200 border-l-4 border-l-emerald-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold tracking-tight text-emerald-600">GH₵ {totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-emerald-600/80 font-medium flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Gross sales value
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border bg-gradient-to-br from-background to-muted/30 shadow-sm hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Units Dispensed</p>
                <p className="text-2xl font-bold tracking-tight text-blue-600">{totalItemsSold.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total medication quantity</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                <Pill className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border bg-gradient-to-br from-background to-muted/30 shadow-sm hover:shadow-md transition-all duration-200 border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg. Sale Value</p>
                <p className="text-2xl font-bold tracking-tight text-amber-600">GH₵ {averageOrderValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-muted-foreground">Per transaction average</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Controls & Filters Bar ── */}
      <motion.div variants={itemVariants}>
        <Card className="border shadow-sm bg-card/80 backdrop-blur-md overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Search & Sort */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search medicine, patient, staff, or receipt ID..."
                    className="pl-9 h-10 text-sm bg-background/60 focus:bg-background transition-colors"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-2.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Sort Order Selector (Highlighting: From very first sale to the last!) */}
                <div className="flex items-center gap-2">
                  <Select value={sortOrder} onValueChange={(val: any) => setSortOrder(val)}>
                    <SelectTrigger className="w-[220px] h-10 bg-background/60 font-medium text-sm">
                      <ArrowUpDown className="h-3.5 w-3.5 mr-2 text-indigo-600 shrink-0" />
                      <SelectValue placeholder="Sort Order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest" className="font-medium">
                        Newest to Oldest (Latest first)
                      </SelectItem>
                      <SelectItem value="oldest" className="font-medium text-indigo-600">
                        Oldest to Newest (First to last)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date Presets */}
              <div className="flex flex-wrap items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/50">
                {[
                  { id: "all", label: "All Time" },
                  { id: "today", label: "Today" },
                  { id: "week", label: "This Week" },
                  { id: "month", label: "This Month" },
                  { id: "custom", label: "Custom Range" },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setDatePreset(preset.id as any)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
                      datePreset === preset.id
                        ? "bg-background text-foreground shadow-sm border border-border/80"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range Inputs (shown when Custom Range is selected) */}
            <AnimatePresence>
              {datePreset === "custom" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-2 border-t flex flex-wrap items-center gap-3 overflow-hidden"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>Select Range:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-9 w-[150px] text-xs bg-background"
                    />
                    <span className="text-muted-foreground text-xs">—</span>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="h-9 w-[150px] text-xs bg-background"
                    />
                  </div>
                  {(dateFrom || dateTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDateFrom("");
                        setDateTo("");
                      }}
                      className="h-8 text-xs text-muted-foreground hover:text-destructive"
                    >
                      Reset dates
                    </Button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Transactions Table ── */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden border shadow-md bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 bg-muted/30 border-b">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-lg font-bold">Transaction Records</CardTitle>
              <Badge variant="secondary" className="ml-2 bg-indigo-50 text-indigo-700 border-indigo-200 font-mono text-xs">
                {sortOrder === "oldest" ? "Chronological (First → Last)" : "Reverse Chronological (Last → First)"}
              </Badge>
            </div>

            {/* Page size selector */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Show:</span>
              <Select value={String(pageSize)} onValueChange={(val) => setPageSize(Number(val))}>
                <SelectTrigger className="w-[100px] h-8 text-xs font-medium bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 rows</SelectItem>
                  <SelectItem value="30">30 rows</SelectItem>
                  <SelectItem value="50">50 rows</SelectItem>
                  <SelectItem value="100">100 rows</SelectItem>
                  <SelectItem value="-1">All ({totalTransactions})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-[120px] font-semibold text-xs">Receipt ID</TableHead>
                    <TableHead className="w-[160px] font-semibold text-xs">Date & Time</TableHead>
                    <TableHead className="font-semibold text-xs">Medicine</TableHead>
                    <TableHead className="text-center font-semibold text-xs">Qty</TableHead>
                    <TableHead className="text-right font-semibold text-xs">Unit Price</TableHead>
                    <TableHead className="text-right font-semibold text-xs">Total Amount</TableHead>
                    <TableHead className="font-semibold text-xs">Patient</TableHead>
                    <TableHead className="font-semibold text-xs">Dispensed By</TableHead>
                    <TableHead className="w-[90px] text-center font-semibold text-xs">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(6).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        {Array(9).fill(0).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : paginatedRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                          <History className="h-10 w-10 opacity-20" />
                          <p className="font-medium text-base">No sale history found</p>
                          <p className="text-xs text-muted-foreground max-w-sm">
                            No transactions match your current filters or search query. Try resetting your filters.
                          </p>
                          {(searchQuery || datePreset !== "all") && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => { setSearchQuery(""); setDatePreset("all"); }}
                              className="mt-2 text-xs"
                            >
                              Reset all filters
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRecords.map((rec) => {
                      const shortId = `#REC-${rec.id.slice(-6).toUpperCase()}`;
                      const formattedTime = rec.createdAt 
                        ? format(rec.createdAt, "MMM d, yyyy • h:mm a")
                        : rec.date ? format(parseISO(rec.date), "MMM d, yyyy") : "-";

                      return (
                        <TableRow 
                          key={rec.id} 
                          className="group hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors cursor-pointer"
                          onClick={() => handleOpenReceipt(rec)}
                        >
                          <TableCell className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                            {shortId}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                            {formattedTime}
                          </TableCell>
                          <TableCell className="font-semibold text-foreground">
                            <div className="flex items-center gap-2">
                              <span className="truncate max-w-[180px] sm:max-w-[220px]">{rec.medicineName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 font-bold px-2 py-0.5">
                              {rec.quantityDispensed}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {rec.unitPrice ? `GH₵ ${rec.unitPrice.toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            {rec.totalPrice ? `GH₵ ${rec.totalPrice.toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {rec.patientName ? (
                              <span className="font-medium text-foreground">{rec.patientName}</span>
                            ) : (
                              <span className="italic text-muted-foreground text-xs">Walk-in</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className="h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                {(rec.dispensedByName || "U").charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate max-w-[120px] text-muted-foreground">{rec.dispensedByName || "Unknown"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenReceipt(rec)}
                              className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 group-hover:scale-110 transition-all"
                              title="View Receipt"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* ── Pagination Footer ── */}
            {pageSize !== -1 && totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t bg-muted/20">
                <div className="text-xs text-muted-foreground font-medium">
                  Showing <span className="font-bold text-foreground">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                  <span className="font-bold text-foreground">
                    {Math.min(currentPage * pageSize, totalTransactions)}
                  </span>{" "}
                  of <span className="font-bold text-foreground">{totalTransactions}</span> total sales
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-3 text-xs font-medium"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
                  </Button>
                  
                  <div className="flex items-center gap-1 px-2 text-xs font-semibold">
                    Page {currentPage} of {totalPages}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-3 text-xs font-medium"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Transaction Receipt Modal (`Dialog`) ── */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-md overflow-hidden p-0 border shadow-2xl bg-card">
          {selectedRecord && (
            <div>
              {/* Receipt Header Banner */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white text-center relative overflow-hidden">
                <div className="absolute right-0 top-0 -mt-6 -mr-6 h-24 w-24 rounded-full bg-indigo-500/20 blur-xl pointer-events-none" />
                
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 mb-3 border border-emerald-500/30">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                
                <DialogTitle className="text-xl font-bold text-white tracking-tight">
                  Gyan Chemicals Pharmacy
                </DialogTitle>
                <DialogDescription className="text-indigo-200 text-xs mt-0.5 font-mono">
                  OFFICIAL TRANSACTION RECEIPT
                </DialogDescription>
                
                <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-xs text-slate-300 font-mono">
                  <span>REF: #REC-{selectedRecord.id.slice(-6).toUpperCase()}</span>
                  <span>
                    {selectedRecord.createdAt 
                      ? format(selectedRecord.createdAt, "dd/MM/yyyy h:mm a")
                      : selectedRecord.date}
                  </span>
                </div>
              </div>

              {/* Receipt Body */}
              <div className="p-6 space-y-5">
                {/* Cashier & Patient Info */}
                <div className="grid grid-cols-2 gap-4 rounded-xl bg-muted/40 p-3 text-xs border">
                  <div>
                    <span className="text-muted-foreground block mb-0.5">Dispensed By (Cashier):</span>
                    <span className="font-semibold text-foreground">{selectedRecord.dispensedByName || "Unknown Staff"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-0.5">Patient / Customer:</span>
                    <span className="font-semibold text-foreground">{selectedRecord.patientName || "Walk-in Customer"}</span>
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Item Breakdown</h4>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="h-8 text-xs font-semibold">Medicine</TableHead>
                          <TableHead className="h-8 text-xs font-semibold text-center">Qty</TableHead>
                          <TableHead className="h-8 text-xs font-semibold text-right">Price</TableHead>
                          <TableHead className="h-8 text-xs font-semibold text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium text-xs py-3">{selectedRecord.medicineName}</TableCell>
                          <TableCell className="text-center text-xs font-bold py-3">{selectedRecord.quantityDispensed}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground py-3">
                            GH₵ {(selectedRecord.unitPrice || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-bold text-emerald-600 dark:text-emerald-400 py-3">
                            GH₵ {(selectedRecord.totalPrice || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Total Calculation */}
                <div className="rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 p-4 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
                  <span className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Total Amount Paid:</span>
                  <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    GH₵ {(selectedRecord.totalPrice || 0).toFixed(2)}
                  </span>
                </div>

                {/* Notes if any */}
                {selectedRecord.notes && (
                  <div className="rounded-lg bg-amber-50/50 dark:bg-amber-950/20 p-3 border border-amber-200/60 dark:border-amber-900/40 text-xs">
                    <span className="font-semibold text-amber-800 dark:text-amber-300 block mb-0.5">Special Notes / Instructions:</span>
                    <p className="text-amber-700 dark:text-amber-400">{selectedRecord.notes}</p>
                  </div>
                )}

                <div className="text-center pt-2 text-[11px] text-muted-foreground italic">
                  Thank you for choosing Gyan Chemicals Pharmacy!
                </div>
              </div>

              {/* Receipt Footer Actions */}
              <DialogFooter className="bg-muted/30 px-6 py-4 border-t flex flex-row items-center justify-between gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsReceiptOpen(false)} className="flex-1">
                  Close
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handlePrintReceipt} 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                >
                  <Printer className="mr-2 h-4 w-4" /> Print Receipt
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
