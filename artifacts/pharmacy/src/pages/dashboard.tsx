import { useEffect, useState } from "react";
import { subscribeToDashboardStats, DashboardStats } from "@/lib/firestore";
import { Card, CardContent } from "@/components/ui/card";
import {
  Package, AlertTriangle, AlertCircle, ArrowDownToLine,
  Pill, TrendingUp, Activity, Stethoscope,
  ShieldCheck, DollarSign, ShoppingCart
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

function AnimatedNumber({ value, duration = 700, isCurrency = false }: { value: number; duration?: number; isCurrency?: boolean }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * value);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value, duration]);
  return <>{isCurrency ? `GH₵${display.toFixed(2)}` : Math.round(display)}</>;
}

const containerVariants: any = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function Dashboard() {
  const { userProfile, isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToDashboardStats(userProfile?.uid, (newStats) => {
      setStats(newStats);
      setLoading(false);
    });
    const tick = setInterval(() => setTime(new Date()), 1000);
    return () => {
      unsub();
      clearInterval(tick);
    };
  }, [userProfile?.uid]);

  const greeting = () => {
    // Use UTC hour since Ghana is in GMT (UTC+0) year-round
    const h = new Date().getUTCHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36 w-full rounded-[20px]" />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-[20px]" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!stats) return <div>Failed to load stats</div>;

  const statCards = [
    {
      title: "Total Medicines",
      value: stats.totalMedicines,
      sub: "Items in catalog",
      icon: Package,
      iconColor: "text-emerald-700 dark:text-emerald-400",
      valueColor: "text-foreground",
      badge: "Active catalog",
      badgeIcon: ShieldCheck,
      isAlert: false,
    },
    {
      title: "Low Stock",
      value: stats.lowStockCount,
      sub: "Need restocking",
      icon: AlertTriangle,
      iconColor: stats.lowStockCount > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground",
      valueColor: stats.lowStockCount > 0 ? "text-amber-700 dark:text-amber-400" : "text-foreground",
      badge: stats.lowStockCount > 0 ? "Action needed" : "Stock healthy",
      badgeIcon: TrendingUp,
      isAlert: stats.lowStockCount > 0,
      alertBorder: "border-amber-500/40",
    },
    {
      title: "Expired Items",
      value: stats.expiredCount,
      sub: "Past expiry date",
      icon: AlertCircle,
      iconColor: stats.expiredCount > 0 ? "text-rose-700 dark:text-rose-400" : "text-muted-foreground",
      valueColor: stats.expiredCount > 0 ? "text-rose-700 dark:text-rose-400" : "text-foreground",
      badge: stats.expiredCount > 0 ? "Remove promptly" : "None expired",
      badgeIcon: Activity,
      isAlert: stats.expiredCount > 0,
      alertBorder: "border-rose-500/40",
    },
    {
      title: !isAdmin ? "My Revenue Today" : "Store Revenue Today",
      value: !isAdmin ? (stats.myTodayRevenue || 0) : (stats.todayRevenue || 0),
      sub: !isAdmin ? "Your personal sales today" : "All staff sales today",
      icon: DollarSign,
      iconColor: "text-emerald-700 dark:text-emerald-400",
      valueColor: "text-emerald-800 dark:text-emerald-400",
      badge: "Today's revenue",
      badgeIcon: Activity,
      isCurrency: true,
      isAlert: false,
    },
    {
      title: !isAdmin ? "My Units Sold Today" : "Units Sold Today",
      value: !isAdmin ? (stats.myItemsSoldToday || 0) : (stats.itemsSoldToday || 0),
      sub: !isAdmin ? "Your personal units dispensed" : "All units dispensed today",
      icon: ShoppingCart,
      iconColor: "text-emerald-700 dark:text-emerald-400",
      valueColor: "text-foreground",
      badge: "Daily volume",
      badgeIcon: TrendingUp,
      isAlert: false,
    },
  ];

  if (isAdmin) {
    statCards.splice(1, 0, {
      title: "Total Stock Value",
      value: stats.totalInventoryValue || 0,
      sub: "Potential gross revenue",
      icon: DollarSign,
      iconColor: "text-emerald-700 dark:text-emerald-400",
      valueColor: "text-foreground",
      badge: "Inventory valuation",
      badgeIcon: Package,
      isCurrency: true,
      isAlert: false,
    });
  }

  return (
    <motion.div
      className="space-y-7"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Banner */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl bg-[#0F2F20] px-6 py-7 sm:px-8 text-white border border-emerald-950/60 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <p className="border-l-2 border-emerald-400 pl-3 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200/90 mb-2">
              Gyan Chemicals Pharmacy
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {greeting()}, {userProfile?.displayName?.split(" ")[0] || "there"}
            </h1>
            <p className="mt-1.5 text-emerald-100/80 text-sm">
              {format(new Date(), "EEEE, MMMM d, yyyy")} - Daily operations overview
            </p>
          </div>

          {/* Live clock */}
          <div className="flex flex-col items-center justify-center rounded-xl bg-white/10 px-5 py-3 border border-white/15 min-w-[116px] self-start sm:self-center">
            <span className="text-2xl font-bold font-mono tabular-nums tracking-tight text-white">
              {format(time, "HH:mm")}
            </span>
            <span className="text-xs text-emerald-200 font-mono tabular-nums">
              {format(time, "ss")}s GMT
            </span>
          </div>
        </div>
      </motion.div>

      {/* Selective Neumorphic Stat Cards */}
      <motion.div
        variants={containerVariants}
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {statCards.map((card, i) => (
          <motion.div
            key={card.title}
            variants={itemVariants}
            className={`neu-raised neu-raised--press p-5 flex flex-col justify-between ${card.isAlert && card.alertBorder ? card.alertBorder : ""}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {card.title}
                </p>
                <div className={`mt-2 text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight ${card.valueColor}`}>
                  <AnimatedNumber value={card.value} duration={600 + i * 80} isCurrency={card.isCurrency} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
              </div>
              <div className={`neu-icon-badge h-12 w-12 shrink-0 ${card.iconColor}`}>
                <card.icon className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <card.badgeIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {card.badge}
              </span>
              {card.isAlert && (
                <span className={`h-2 w-2 rounded-full ${card.title === "Expired Items" ? "bg-rose-500" : "bg-amber-500"}`} aria-hidden="true" />
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Today's Sales by Staff (Admin Only) */}
      {isAdmin && stats.todaySalesByStaff && stats.todaySalesByStaff.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/40">
              <div className="flex items-center gap-3">
                <div className="neu-icon-badge h-9 w-9 text-emerald-700 dark:text-emerald-400">
                  <DollarSign className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm text-foreground">Today's Performance by Staff</h2>
                  <p className="text-xs text-muted-foreground">{stats.todaySalesByStaff.length} staff members active today</p>
                </div>
              </div>
            </div>
            <CardContent className="p-0">
              <div className="divide-y">
                {stats.todaySalesByStaff.map((staff) => (
                  <div key={staff.userId} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {staff.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{staff.name}</p>
                        <p className="text-xs text-muted-foreground">{staff.itemsSold} items sold</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                        GH₵{staff.revenue.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* My Items Sold Today (For Sales/Pharmacist Staff) */}
      {!isAdmin && stats.myTodayRecords && (
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/40">
              <div className="flex items-center gap-3">
                <div className="neu-icon-badge h-9 w-9 text-emerald-700 dark:text-emerald-400">
                  <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm text-foreground">My Items Sold Today</h2>
                  <p className="text-xs text-muted-foreground">{stats.myTodayRecords.length} items dispensed by you today</p>
                </div>
              </div>
            </div>
            <CardContent className="p-0">
              {stats.myTodayRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <Pill className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
                  <p className="text-sm font-medium">No sales recorded yet today</p>
                  <p className="text-xs text-muted-foreground/70">Items you dispense today will appear here</p>
                </div>
              ) : (
                <div className="divide-y max-h-96 overflow-y-auto">
                  {stats.myTodayRecords.map((rec) => (
                    <div key={rec.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold text-xs font-mono">
                          {rec.quantityDispensed}x
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{rec.medicineName}</p>
                          <p className="text-xs text-muted-foreground">
                            {rec.createdAt ? format(rec.createdAt, "h:mm a") : "Today"} {rec.patientName ? `· Patient: ${rec.patientName}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                          GH₵{(rec.totalPrice || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">GH₵{(rec.unitPrice || 0).toFixed(2)}/unit</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recent Activity */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden border shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/40">
            <div className="flex items-center gap-3">
              <div className="neu-icon-badge h-9 w-9 text-emerald-700 dark:text-emerald-400">
                <Activity className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-semibold text-sm text-foreground">Recent Activity</h2>
                <p className="text-xs text-muted-foreground">{stats.recentActivity.length} recent events</p>
              </div>
            </div>
            <div className="neu-pill px-3 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" aria-hidden="true" />
              Live sync
            </div>
          </div>

          <CardContent className="p-0">
            {stats.recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-2.5">
                <Stethoscope className="h-9 w-9 text-muted-foreground/40" aria-hidden="true" />
                <p className="text-sm font-medium">No recent activity yet</p>
                <p className="text-xs text-muted-foreground/70">Activity will appear here as your team works</p>
              </div>
            ) : (
              <div className="divide-y">
                {stats.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 px-6 py-4 hover:bg-muted/30 transition-colors"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                        activity.type === "dispensed"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900"
                          : "bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                      }`}
                    >
                      {activity.type === "dispensed" ? (
                        <Pill className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm font-medium leading-snug text-foreground truncate">
                        {activity.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-md font-medium ${
                          activity.type === "dispensed"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                            : "bg-secondary text-secondary-foreground"
                        }`}>
                          {activity.type === "dispensed" ? "Dispensed" : "Stock In"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {activity.timestamp
                            ? format(activity.timestamp, "MMM d, h:mm a")
                            : "Unknown time"}
                        </span>
                        {isAdmin && activity.by && (
                          <span className="text-xs text-muted-foreground">· {activity.by}</span>
                        )}
                        {activity.amount !== undefined && (
                          <span className="text-xs font-semibold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 ml-auto bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                            GH₵{activity.amount.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
