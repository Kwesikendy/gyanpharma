import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Settings,
  User,
  ShieldCheck,
  Mail,
  Calendar,
  Download,
  Package,
  ArrowDownToLine,
  Pill,
  Users,
  Truck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DatabaseBackup,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";
import { format } from "date-fns";
import { exportAllData } from "@/lib/firestore";
import { motion, AnimatePresence } from "framer-motion";

type BackupState = "idle" | "loading" | "success" | "error";

export default function SettingsPage() {
  const { userProfile, isAdmin } = useAuth();
  const [backupState, setBackupState] = useState<BackupState>("idle");
  const [backupCounts, setBackupCounts] = useState<Record<string, number> | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(
    () => localStorage.getItem("gyanchem_last_backup")
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState(userProfile?.email || "");
  const [newName, setNewName] = useState(userProfile?.displayName || "");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { updateUserPassword, updateUserEmailAndName } = useAuth();

  async function handleUpdatePassword() {
    if (!newPassword || newPassword.length < 6) return;
    setUpdatingPassword(true);
    try {
      await updateUserPassword(newPassword);
      toast({ title: "Password Updated", description: "Your password has been changed successfully." });
      setNewPassword("");
    } catch (err: any) {
      if (err.code === "auth/requires-recent-login") {
        toast({ title: "Security Requirement", description: "Please log out and log back in before changing your password.", variant: "destructive" });
      } else {
        toast({ title: "Update Failed", description: err.message || "Failed to update password.", variant: "destructive" });
      }
    } finally {
      setUpdatingPassword(false);
    }
  }

  async function handleUpdateProfile() {
    if (!newEmail || !newName) return;
    setUpdatingProfile(true);
    try {
      await updateUserEmailAndName(newEmail, newName);
      toast({ title: "Profile Updated", description: "Your email and name have been updated successfully." });
    } catch (err: any) {
      if (err.code === "auth/requires-recent-login") {
        toast({ title: "Security Requirement", description: "Please log out and log back in before changing your email.", variant: "destructive" });
      } else {
        toast({ title: "Update Failed", description: err.message || "Failed to update profile.", variant: "destructive" });
      }
    } finally {
      setUpdatingProfile(false);
    }
  }

  async function handleExport() {
    if (!userProfile?.email) return;
    setBackupState("loading");
    setErrorMsg("");
    try {
      const data = await exportAllData(userProfile.email);
      setBackupCounts(data.meta.counts);

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = format(new Date(), "yyyy-MM-dd_HH-mm");
      a.href = url;
      a.download = `gyanchem-backup-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const now = new Date().toISOString();
      localStorage.setItem("gyanchem_last_backup", now);
      setLastBackup(now);
      setBackupState("success");
      setTimeout(() => setBackupState("idle"), 5000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Export failed");
      setBackupState("error");
      setTimeout(() => setBackupState("idle"), 6000);
    }
  }

  const collectionMeta = [
    { key: "medicines", label: "Medicines (Inventory)", icon: Package, color: "text-emerald-600 bg-emerald-50" },
    { key: "stockEntries", label: "Stock Entries", icon: ArrowDownToLine, color: "text-blue-600 bg-blue-50" },
    { key: "dispensingRecords", label: "Dispensing Records", icon: Pill, color: "text-violet-600 bg-violet-50" },
    { key: "suppliers", label: "Suppliers", icon: Truck, color: "text-amber-600 bg-amber-50" },
    { key: "users", label: "Users", icon: Users, color: "text-rose-600 bg-rose-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Account Information ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Account Information
            </CardTitle>
            <CardDescription>Your profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-2xl">
                {userProfile?.displayName?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <div className="text-lg font-semibold">{userProfile?.displayName}</div>
                <Badge
                  variant="outline"
                  className={`mt-1 flex w-fit items-center gap-1 ${userProfile?.role === "admin" ? "border-primary/30 text-primary" : "border-muted-foreground/30"}`}
                >
                  {userProfile?.role === "admin" ? <ShieldCheck className="h-3 w-3" /> : <User className="h-3 w-3" />}
                  {userProfile?.role}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Email</div>
                  <div className="text-sm">{userProfile?.email}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <ShieldCheck className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Role</div>
                  <div className="text-sm capitalize">{userProfile?.role}</div>
                </div>
              </div>

              {userProfile?.createdAt && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Member Since</div>
                    <div className="text-sm">{format(userProfile.createdAt, "MMMM d, yyyy")}</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Security (Change Password & Profile) ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Security & Profile
            </CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium border-b pb-2">Profile Details</h3>
              <div className="grid gap-2">
                <label htmlFor="new-name" className="text-sm font-medium leading-none">Full Name</label>
                <Input
                  id="new-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Your display name"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="new-email" className="text-sm font-medium leading-none">Email Address</label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  disabled={true}
                  className="bg-muted text-muted-foreground"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Emails cannot be changed here due to Firebase security rules. To change your email, please create a new account from the Users page.
                </p>
              </div>
              <Button 
                onClick={handleUpdateProfile} 
                disabled={!newName || updatingProfile || (newName === userProfile?.displayName)}
                variant="secondary"
                className="w-full sm:w-auto"
              >
                {updatingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Update Profile
              </Button>
            </div>

            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-medium border-b pb-2">Change Password</h3>
              <div className="grid gap-2">
              <label htmlFor="new-password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">New Password</label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button onClick={handleUpdatePassword} disabled={!newPassword || newPassword.length < 6 || updatingPassword} className="w-full sm:w-auto">
              {updatingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update Password
            </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Access Rights ── */}
        <Card>
          <CardHeader>
            <CardTitle>Access Rights</CardTitle>
            <CardDescription>What you can do based on your role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-1">
              {[
                { label: "View inventory", allowed: true },
                { label: "Add medicines", allowed: userProfile?.role === "admin" },
                { label: "Edit medicines", allowed: userProfile?.role === "admin" },
                { label: "Delete medicines", allowed: userProfile?.role === "admin" },
                { label: "Log stock entry", allowed: true },
                { label: "Record dispensing", allowed: true },
                { label: "View reports & export", allowed: true },
                { label: "Manage users", allowed: userProfile?.role === "admin" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm">{item.label}</span>
                  <Badge
                    variant={item.allowed ? "default" : "secondary"}
                    className={item.allowed ? "bg-green-100 text-green-700 border-green-200" : "bg-muted text-muted-foreground"}
                  >
                    {item.allowed ? "Allowed" : "Restricted"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Data Backup — Admin only ── */}
      {isAdmin && (
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-800">
              <DatabaseBackup className="h-5 w-5 text-emerald-600" />
              Data Backup
            </CardTitle>
            <CardDescription>
              Export a full copy of all Firestore data as a JSON file. Keep this safe — you can use it to restore everything if you ever rebuild the system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Collection breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {collectionMeta.map(({ key, label, icon: Icon, color }) => (
                <div
                  key={key}
                  className="flex flex-col items-center gap-1.5 rounded-xl border bg-white p-3 text-center shadow-sm"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <AnimatePresence mode="wait">
                    {backupCounts ? (
                      <motion.span
                        key="count"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-lg font-bold text-foreground"
                      >
                        {backupCounts[key] ?? 0}
                      </motion.span>
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">—</span>
                    )}
                  </AnimatePresence>
                  <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
                </div>
              ))}
            </div>

            <Separator />

            {/* Last backup info */}
            {lastBackup && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span>
                  Last backup: <span className="font-medium text-foreground">{format(new Date(lastBackup), "MMMM d, yyyy 'at' h:mm a")}</span>
                </span>
              </div>
            )}

            {/* Status feedback */}
            <AnimatePresence>
              {backupState === "success" && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    Backup downloaded successfully —{" "}
                    {backupCounts && Object.values(backupCounts).reduce((a, b) => a + b, 0)} records exported.
                  </span>
                </motion.div>
              )}
              {backupState === "error" && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg || "Export failed. Make sure you are connected to the internet."}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Export button */}
            <Button
              onClick={handleExport}
              disabled={backupState === "loading"}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              size="lg"
            >
              {backupState === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching all data…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export Full Backup (.json)
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground">
              The downloaded file contains every medicine, stock entry, dispensing record, supplier, and user account stored in Firebase.
              All timestamps are preserved as ISO-8601 strings so they can be re-imported exactly.
              <strong className="text-foreground"> Store it somewhere safe — Google Drive, a USB drive, or your email.</strong>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
