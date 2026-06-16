import { useEffect, useState } from "react";
import { getDashboardStats, DashboardStats } from "@/lib/firestore";
import { Card, CardContent } from "@/components/ui/card";
import {
  Package, AlertTriangle, AlertCircle, ArrowDownToLine,
  Pill, TrendingUp, Activity, Plus, Cross, Stethoscope,
  HeartPulse, ShieldCheck, DollarSign, ShoppingCart
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

function AnimatedNumber({ value, duration = 1200, isCurrency = false }: { value: number; duration?: number; isCurrency?: boolean }) {
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

function FloatingCross({ style }: { style: React.CSSProperties }) {
  return (
    <motion.div
      style={style}
      className="absolute text-white/10 pointer-events-none select-none"
      animate={{ y: [-10, 10, -10], rotate: [0, 15, -15, 0] }}
      transition={{ duration: 6 + Math.random() * 4, repeat: Infinity, ease: "easeInOut" }}
    >
      <Plus className="w-8 h-8" />
    </motion.div>
  );
}

function PulseRing({ color }: { color: string }) {
  return (
    <motion.div
      className={`absolute inset-0 rounded-full ${color} opacity-30`}
      animate={{ scale: [1, 1.5, 1.5], opacity: [0.3, 0, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
    />
  );
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.94 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const slideUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const rowVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function Dashboard() {
  const { userProfile, isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    getDashboardStats(userProfile?.id).then(setStats).finally(() => setLoading(false));
    const tick = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, [userProfile?.id]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
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
      gradient: "from-emerald-500 to-green-600",
      glow: "shadow-emerald-200",
      ring: "bg-emerald-400",
      badge: "All active",
      badgeIcon: ShieldCheck,
    },
    {
      title: "Low Stock",
      value: stats.lowStockCount,
      sub: "Need restocking",
      icon: AlertTriangle,
      gradient: "from-amber-400 to-orange-500",
      glow: "shadow-amber-200",
      ring: "bg-amber-400",
      badge: "Action needed",
      badgeIcon: TrendingUp,
    },
    {
      title: "Expired Items",
      value: stats.expiredCount,
      sub: "Past expiry date",
      icon: AlertCircle,
      gradient: "from-rose-500 to-red-600",
      glow: "shadow-rose-200",
      ring: "bg-rose-400",
      badge: "Remove ASAP",
      badgeIcon: Activity,
    },
    {
      title: "Today's Revenue",
      value: userProfile?.role === "sales" ? (stats.myTodayRevenue || 0) : (stats.todayRevenue || 0),
      sub: userProfile?.role === "sales" ? "Your sales today" : "Total sales today",
      icon: DollarSign,
      gradient: "from-blue-500 to-indigo-600",
      glow: "shadow-blue-200",
      ring: "bg-blue-400",
      badge: "Revenue",
      badgeIcon: Activity,
      isCurrency: true,
    },
    {
      title: "Items Sold Today",
      value: userProfile?.role === "sales" ? (stats.myItemsSoldToday || 0) : (stats.itemsSoldToday || 0),
      sub: userProfile?.role === "sales" ? "Your units dispensed" : "Total units dispensed",
      icon: ShoppingCart,
      gradient: "from-purple-500 to-violet-600",
      glow: "shadow-purple-200",
      ring: "bg-purple-400",
      badge: "Volume",
      badgeIcon: TrendingUp,
    },
  ];

  const floatingPositions = [
    { top: "10%", left: "5%" },
    { top: "60%", left: "12%" },
    { top: "25%", right: "8%" },
    { top: "70%", right: "15%" },
    { top: "45%", left: "45%" },
  ];

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Hero Banner ── */}
      <motion.div
        variants={cardVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 p-7 text-white shadow-xl shadow-emerald-200"
      >
        {/* Floating decorative crosses */}
        {floatingPositions.map((pos, i) => (
          <FloatingCross key={i} style={pos as React.CSSProperties} />
        ))}

        {/* Large background circle */}
        <motion.div
          className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/5"
          animate={{ scale: [1, 1.08, 1], rotate: [0, 10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/5"
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="flex items-center gap-2 mb-1"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 1 }}
              >
                <HeartPulse className="h-5 w-5 text-emerald-200" />
              </motion.div>
              <span className="text-emerald-100 text-sm font-medium tracking-wide uppercase">
                Gyan Chemicals
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-3xl font-bold tracking-tight"
            >
              {greeting()}, {userProfile?.displayName?.split(" ")[0] || "there"} 👋
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mt-1 text-emerald-100 text-sm"
            >
              {format(new Date(), "EEEE, MMMM d, yyyy")} — Your pharmacy at a glance
            </motion.p>
          </div>

          {/* Live clock */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-3 border border-white/20 min-w-[110px]"
          >
            <motion.span
              key={time.getSeconds()}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold font-mono tabular-nums"
            >
              {format(time, "HH:mm")}
            </motion.span>
            <motion.span
              key={`s-${time.getSeconds()}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-emerald-200 font-mono"
            >
              {format(time, "ss")}s
            </motion.span>
            <span className="text-xs text-emerald-100 mt-0.5">Live</span>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Stat Cards ── */}
      <motion.div
        variants={containerVariants}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      >
        {statCards.map((card, i) => (
          <motion.div
            key={card.title}
            variants={cardVariants}
            whileHover={{ y: -6, transition: { duration: 0.25, ease: "easeOut" } }}
            whileTap={{ scale: 0.97 }}
          >
            <Card className={`relative overflow-hidden border-0 shadow-lg ${card.glow} h-full`}>
              {/* Gradient header */}
              <div className={`bg-gradient-to-br ${card.gradient} p-5 text-white`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/80 text-xs font-medium uppercase tracking-wider mb-1">{card.title}</p>
                    <motion.div
                      className="text-4xl font-bold"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.5, type: "spring" }}
                    >
                      <AnimatedNumber value={card.value} duration={1000 + i * 200} isCurrency={card.isCurrency} />
                    </motion.div>
                    <p className="text-white/70 text-xs mt-0.5">{card.sub}</p>
                  </div>
                  {/* Icon with pulse ring */}
                  <div className="relative">
                    <PulseRing color={card.ring} />
                    <motion.div
                      className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm"
                      animate={{ rotate: [0, -5, 5, 0] }}
                      transition={{ duration: 4, repeat: Infinity, delay: i * 0.7 }}
                    >
                      <card.icon className="h-6 w-6 text-white" />
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Footer row */}
              <CardContent className="py-3 px-5 bg-white">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                  >
                    <card.badgeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </motion.div>
                  <span className="text-xs text-muted-foreground">{card.badge}</span>
                  <motion.div
                    className="ml-auto h-1.5 rounded-full bg-muted overflow-hidden"
                    style={{ width: 60 }}
                  >
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${card.gradient}`}
                      initial={{ width: 0 }}
                      animate={{ width: card.value > 0 ? "70%" : "8%" }}
                      transition={{ delay: 0.6 + i * 0.15, duration: 0.9, ease: "easeOut" }}
                    />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Today's Sales by Staff (Admin Only) ── */}
      {isAdmin && stats.todaySalesByStaff && stats.todaySalesByStaff.length > 0 && (
        <motion.div variants={slideUp}>
          <Card className="overflow-hidden border shadow-md">
            <div className="flex items-center px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-2">
                <motion.div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </motion.div>
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
                        <p className="text-sm font-medium">{staff.name}</p>
                        <p className="text-xs text-muted-foreground">{staff.itemsSold} items sold</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600">GH₵{staff.revenue.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Recent Activity ── */}
      <motion.div variants={slideUp}>
        <Card className="overflow-hidden border shadow-md">
          {/* Card header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100"
              >
                <Activity className="h-4 w-4 text-emerald-600" />
              </motion.div>
              <div>
                <h2 className="font-semibold text-sm text-foreground">Recent Activity</h2>
                <p className="text-xs text-muted-foreground">{stats.recentActivity.length} recent events</p>
              </div>
            </div>
            <motion.div
              className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
              Live
            </motion.div>
          </div>

          <CardContent className="p-0">
            <AnimatePresence mode="wait">
              {stats.recentActivity.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3"
                >
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  >
                    <Stethoscope className="h-10 w-10 text-emerald-200" />
                  </motion.div>
                  <p className="text-sm">No recent activity yet</p>
                  <p className="text-xs text-muted-foreground/60">Activity will appear here as your team works</p>
                </motion.div>
              ) : (
                <motion.div
                  variants={{ visible: { transition: { staggerChildren: 0.06, delayChildren: 0.25 } } }}
                  initial="hidden"
                  animate="visible"
                >
                  {stats.recentActivity.map((activity, idx) => (
                    <motion.div
                      key={activity.id}
                      variants={rowVariants}
                      whileHover={{ backgroundColor: "rgba(16,185,129,0.03)", x: 4, transition: { duration: 0.15 } }}
                      className="flex items-start gap-4 px-6 py-4 border-b last:border-0 cursor-default transition-colors"
                    >
                      {/* Timeline dot + icon */}
                      <div className="relative flex flex-col items-center">
                        <motion.div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                            activity.type === "dispensed"
                              ? "bg-blue-50 text-blue-600 shadow-blue-100"
                              : "bg-emerald-50 text-emerald-600 shadow-emerald-100"
                          }`}
                          whileHover={{ scale: 1.15, rotate: 8 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          {activity.type === "dispensed" ? (
                            <Pill className="h-4 w-4" />
                          ) : (
                            <ArrowDownToLine className="h-4 w-4" />
                          )}
                        </motion.div>
                        {idx < stats.recentActivity.length - 1 && (
                          <motion.div
                            className="w-px bg-emerald-100 mt-1"
                            initial={{ height: 0 }}
                            animate={{ height: 20 }}
                            transition={{ delay: 0.5 + idx * 0.06, duration: 0.3 }}
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pt-1">
                        <p className="text-sm font-medium leading-snug text-foreground truncate">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                            activity.type === "dispensed"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-emerald-50 text-emerald-700"
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
                            <span className="text-xs font-semibold text-emerald-600 ml-auto bg-emerald-50 px-2 py-0.5 rounded-md">
                              GH₵{activity.amount.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Animated right chevron */}
                      <motion.div
                        className="shrink-0 text-muted-foreground/30 self-center"
                        initial={{ x: -4, opacity: 0 }}
                        whileHover={{ x: 0, opacity: 1 }}
                      >
                        <Cross className="h-3 w-3 rotate-45" />
                      </motion.div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
