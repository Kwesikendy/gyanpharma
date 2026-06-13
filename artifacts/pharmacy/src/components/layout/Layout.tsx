import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  Pill,
  Users,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { userProfile, logout, isAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/inventory", label: "Inventory", icon: Package },
    { href: "/stock-entry", label: "Stock Entry", icon: ArrowDownToLine },
    { href: "/dispensing", label: "Dispensing", icon: Pill },
    { href: "/suppliers", label: "Suppliers", icon: Building2 },
    { href: "/reports", label: "Reports", icon: FileText },
    ...(isAdmin ? [{ href: "/users", label: "Users", icon: Users }] : []),
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            key="overlay"
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out md:static md:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center justify-between px-6 bg-sidebar-primary/10 border-b border-sidebar-border">
          <motion.div
            className="flex items-center gap-2 font-bold text-lg text-white"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Pill className="h-6 w-6 text-sidebar-primary" />
            </motion.div>
            <span>Gyan Chemicals</span>
          </motion.div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-sidebar-foreground"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item, i) => {
            const isActive =
              location === item.href || location.startsWith(`${item.href}/`);
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 + 0.1, duration: 0.35 }}
              >
                <Link href={item.href}>
                  <motion.div
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer relative overflow-hidden",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute left-0 top-0 bottom-0 w-0.5 bg-sidebar-primary rounded-full"
                        transition={{ duration: 0.25 }}
                      />
                    )}
                    <motion.div
                      animate={isActive ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                    </motion.div>
                    {item.label}
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* User footer */}
        <motion.div
          className="p-4 border-t border-sidebar-border bg-sidebar-accent/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground font-bold"
              whileHover={{ scale: 1.1 }}
            >
              {userProfile?.displayName?.charAt(0).toUpperCase() || "U"}
            </motion.div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-white">
                {userProfile?.displayName}
              </span>
              <span className="truncate text-xs text-sidebar-foreground/70 capitalize">
                {userProfile?.role}
              </span>
            </div>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 bg-transparent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
              onClick={() => logout()}
            >
              <motion.div
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.3 }}
              >
                <LogOut className="h-4 w-4" />
              </motion.div>
              Logout
            </Button>
          </motion.div>
        </motion.div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-card px-6 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="font-semibold">Gyan Chemicals</div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-background">
          <div className="mx-auto max-w-7xl">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
