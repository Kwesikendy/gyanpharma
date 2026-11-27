import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Redirect, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill, Loader2, ArrowRight, Eye, EyeOff, Lock, DownloadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useInstallPWA } from "@/hooks/useInstallPWA";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function Login() {
  const { login, currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { isInstallable, installPWA } = useInstallPWA();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (currentUser) {
    return <Redirect to="/dashboard" />;
  }

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast({ title: "Welcome back", description: "Successfully logged in." });
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center neu-surface p-4">
      <motion.div
        className="w-full max-w-md space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Unified Deep Forest-Green Brand Banner */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-[#0F2F20] px-6 py-6 text-white border border-emerald-950/60 shadow-sm"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="border-l-2 border-emerald-400 pl-3 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200/90 mb-2">
                Pharmacy Management
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-white">Gyan Chemicals</h1>
              <p className="text-emerald-100/80 mt-1 text-xs">
                Inventory, dispensing, and sales portal
              </p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 border border-white/15 text-emerald-300">
              <Pill className="h-6 w-6" aria-hidden="true" />
            </div>
          </div>
        </motion.div>

        {/* Soft UI Neumorphic Sign-In Card */}
        <motion.div variants={itemVariants} className="neu-raised p-6 sm:p-7">
          <div className="flex items-center gap-3 mb-6">
            <div className="neu-icon-badge h-10 w-10 text-emerald-700 dark:text-emerald-400 shrink-0">
              <Lock className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Sign In</h2>
              <p className="text-xs text-muted-foreground">Enter your staff credentials to continue</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="staff@gyanchem.com"
                        className="h-11 bg-white dark:bg-background border-input focus-visible:ring-primary"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="h-11 pr-10 bg-white dark:bg-background border-input focus-visible:ring-primary"
                          {...field}
                        />
                        <button
                          type="button"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-11 mt-2 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                )}
                Sign In
              </Button>
            </form>
          </Form>

          {isInstallable && (
            <div className="mt-5 pt-4 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={installPWA}
                className="w-full gap-2 bg-white dark:bg-card text-foreground border-border"
              >
                <DownloadCloud className="h-4 w-4 text-primary" aria-hidden="true" />
                Install App on This Device
              </Button>
            </div>
          )}
        </motion.div>

        {/* Setup link */}
        <motion.p variants={itemVariants} className="text-center text-xs text-muted-foreground">
          First time here?{" "}
          <Link href="/setup" className="text-primary font-semibold hover:underline inline-flex items-center gap-1">
            Set up your admin account <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
