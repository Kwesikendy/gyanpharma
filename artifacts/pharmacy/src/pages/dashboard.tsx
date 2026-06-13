import { useEffect, useState } from "react";
import { getDashboardStats, DashboardStats } from "@/lib/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, AlertCircle, Building2, Clock, ArrowDownToLine, Pill } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    let start = 0;
    const duration = 900;
    const step = Math.ceil(value / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return <>{display}</>;
}

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.3 } },
};

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent><Skeleton className="h-8 w-[60px]" /></CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader><Skeleton className="h-6 w-[150px]" /></CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return <div>Failed to load stats</div>;

  const statCards = [
    {
      title: "Total Medicines",
      value: stats.totalMedicines,
      sub: "Active items in catalog",
      icon: Package,
      color: "text-primary",
      border: "border-l-primary",
    },
    {
      title: "Low Stock",
      value: stats.lowStockCount,
      sub: "Items below threshold",
      icon: AlertTriangle,
      color: "text-amber-500",
      border: "border-l-amber-500",
      valueClass: "text-amber-600",
    },
    {
      title: "Expired",
      value: stats.expiredCount,
      sub: "Items past expiry date",
      icon: AlertCircle,
      color: "text-destructive",
      border: "border-l-destructive",
      valueClass: "text-destructive",
    },
    {
      title: "Total Suppliers",
      value: stats.totalSuppliers,
      sub: "Registered vendors",
      icon: Building2,
      color: "text-cyan-500",
      border: "border-l-cyan-500",
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}>
            <Clock className="h-4 w-4" />
          </motion.div>
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.title}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <Card className={`border-l-4 ${card.border} h-full`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                >
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </motion.div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${card.valueClass || ""}`}>
                  <AnimatedNumber value={card.value} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <AnimatePresence>
              {stats.recentActivity.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-6 text-muted-foreground"
                >
                  No recent activity
                </motion.div>
              ) : (
                <motion.div
                  className="space-y-4"
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {stats.recentActivity.map((activity) => (
                    <motion.div
                      key={activity.id}
                      variants={rowVariants}
                      className="flex items-start gap-4 border-b last:border-0 pb-4 last:pb-0"
                    >
                      <motion.div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          activity.type === "dispensed"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-green-100 text-green-600"
                        }`}
                        whileHover={{ scale: 1.2, rotate: 10 }}
                      >
                        {activity.type === "dispensed" ? (
                          <Pill className="h-4 w-4" />
                        ) : (
                          <ArrowDownToLine className="h-4 w-4" />
                        )}
                      </motion.div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{activity.description}</p>
                        <div className="flex items-center text-xs text-muted-foreground gap-2">
                          <span>
                            {activity.timestamp
                              ? format(activity.timestamp, "MMM d, yyyy h:mm a")
                              : "Unknown time"}
                          </span>
                          {activity.by && (
                            <>
                              <span>•</span>
                              <span>By {activity.by}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
