import { useState, useEffect } from "react";
import {
  getMedicines, deleteMedicine, addMedicine, updateMedicine,
  Medicine, MedicineInput,
  getLowStockMedicines, isExpired, isExpiringSoon,
} from "@/lib/firestore";
import { exportMedicinesToCsv } from "@/lib/exportUtils";
import { MedicineDialog } from "@/components/inventory/MedicineDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, Plus, AlertTriangle, AlertCircle, Edit, Trash2, Package } from "lucide-react";
import { format } from "date-fns";

const STATUS_FILTER_ALL = "__all__";

export default function Inventory() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(STATUS_FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const meds = await getMedicines();
      setMedicines(meds);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const categories = Array.from(new Set(medicines.map((m) => m.category))).sort();

  const filteredMedicines = medicines.filter((m) => {
    const matchesSearch =
      !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === STATUS_FILTER_ALL || m.category === categoryFilter;
    const matchesStatus = statusFilter === STATUS_FILTER_ALL || m.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const lowStockCount = getLowStockMedicines(medicines).length;
  const expiringCount = medicines.filter((m) => isExpired(m.expiryDate) || isExpiringSoon(m.expiryDate)).length;

  function openAdd() {
    setEditingMedicine(null);
    setDialogOpen(true);
  }

  function openEdit(medicine: Medicine) {
    setEditingMedicine(medicine);
    setDialogOpen(true);
  }

  async function handleSave(data: MedicineInput) {
    setSubmitting(true);
    try {
      if (editingMedicine) {
        await updateMedicine(editingMedicine.id, data);
        toast({ title: "Medicine updated", description: `${data.name} has been updated.` });
      } else {
        await addMedicine(data);
        toast({ title: "Medicine added", description: `${data.name} added to inventory.` });
      }
      setDialogOpen(false);
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    try {
      await deleteMedicine(id);
      toast({ title: "Deleted", description: `${name} removed from inventory.` });
      fetchAll();
    } catch (err) {
      toast({ title: "Error", description: "Could not delete medicine.", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Package className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportMedicinesToCsv(filteredMedicines)} data-testid="button-export-csv">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          {isAdmin && (
            <Button onClick={openAdd} data-testid="button-add-medicine">
              <Plus className="mr-2 h-4 w-4" /> Add Medicine
            </Button>
          )}
        </div>
      </div>

      {/* Alert banners */}
      {(lowStockCount > 0 || expiringCount > 0) && (
        <div className="flex flex-wrap gap-3">
          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span><strong>{lowStockCount}</strong> item{lowStockCount > 1 ? "s" : ""} below stock threshold</span>
            </div>
          )}
          {expiringCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span><strong>{expiringCount}</strong> item{expiringCount > 1 ? "s" : ""} expired or expiring soon</span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search name or category..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-category-filter">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={STATUS_FILTER_ALL}>All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={STATUS_FILTER_ALL}>All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="discontinued">Discontinued</SelectItem>
          </SelectContent>
        </Select>
        {(search || categoryFilter !== STATUS_FILTER_ALL || statusFilter !== STATUS_FILTER_ALL) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setCategoryFilter(STATUS_FILTER_ALL); setStatusFilter(STATUS_FILTER_ALL); }}>
            Clear filters
          </Button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">{filteredMedicines.length} of {medicines.length} items</span>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array(6).fill(0).map((_, i) => (
                <TableRow key={i}>
                  {Array(7).fill(0).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-[80px]" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredMedicines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No medicines found. {isAdmin && !search && <span className="text-primary cursor-pointer hover:underline" onClick={openAdd}>Add your first medicine.</span>}
                </TableCell>
              </TableRow>
            ) : (
              filteredMedicines.map((medicine) => {
                const lowStock = medicine.quantity <= medicine.lowStockThreshold;
                const expired = isExpired(medicine.expiryDate);
                const expiringSoon = isExpiringSoon(medicine.expiryDate);

                return (
                  <TableRow
                    key={medicine.id}
                    className={expired ? "bg-red-50/50 dark:bg-red-950/20" : lowStock ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}
                    data-testid={`row-medicine-${medicine.id}`}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {medicine.name}
                        {expired && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                        {!expired && lowStock && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                      </div>
                      {medicine.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{medicine.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{medicine.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className={`font-semibold ${expired ? "text-destructive" : lowStock ? "text-amber-600" : "text-green-700"}`}>
                        {medicine.quantity}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">{medicine.unit}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">min: {medicine.lowStockThreshold}</div>
                    </TableCell>
                    <TableCell className="text-sm">GH₵{medicine.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className={`text-sm ${expired ? "text-destructive font-semibold" : expiringSoon ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                        {format(new Date(medicine.expiryDate), "MMM d, yyyy")}
                        {expired && <div className="text-xs">Expired</div>}
                        {!expired && expiringSoon && <div className="text-xs">Expiring soon</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={medicine.status === "active" ? "default" : "secondary"}
                        className={`capitalize ${medicine.status === "active" ? "bg-green-100 text-green-700 border-green-200" : ""}`}
                      >
                        {medicine.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {isAdmin && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(medicine)} data-testid={`button-edit-${medicine.id}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" data-testid={`button-delete-${medicine.id}`}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Medicine</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete <strong>{medicine.name}</strong>? This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(medicine.id, medicine.name)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {isAdmin && (
        <MedicineDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          medicine={editingMedicine}
          submitting={submitting}
          onSubmit={handleSave}
        />
      )}
    </div>
  );
}
