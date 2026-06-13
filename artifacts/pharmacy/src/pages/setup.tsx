import { useState, useEffect } from "react";
import { getUsers } from "@/lib/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill, ShieldCheck, Loader2, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function Setup() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"checking" | "ready" | "done" | "already_setup">("checking");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getUsers().then((users) => {
      setStatus(users.length > 0 ? "already_setup" : "ready");
    });
  }, []);

  async function createAdminAccount() {
    setCreating(true);
    setError("");
    try {
      const email = "admin@gyanchem.com";
      const password = "GyanChem@2024";
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), {
        email,
        displayName: "Admin",
        role: "admin",
        createdAt: serverTimestamp(),
      });
      setStatus("done");
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 p-4 overflow-hidden relative">
      {/* Background blobs */}
      <motion.div
        className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full bg-primary/10 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-10%] right-[-10%] w-80 h-80 rounded-full bg-cyan-400/10 blur-3xl"
        animate={{ x: [0, -30, 0], y: [0, -40, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      <motion.div
        className="w-full max-w-md space-y-8 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo */}
        <motion.div variants={itemVariants} className="flex flex-col items-center text-center">
          <motion.div
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl mb-4"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <Pill className="h-8 w-8" />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gyan Chemicals</h1>
          <p className="text-slate-500 mt-2">First-time Setup</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {status === "checking" && (
            <motion.div key="checking" variants={itemVariants}>
              <Card>
                <CardContent className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {status === "already_setup" && (
            <motion.div
              key="already"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Setup Already Complete</CardTitle>
                  <CardDescription>An admin account already exists. Sign in to continue.</CardDescription>
                </CardHeader>
                <CardContent>
                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                    <Button className="w-full gap-2" onClick={() => setLocation("/login")}>
                      Go to Login <ArrowRight className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {status === "ready" && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="border-slate-200 shadow-2xl backdrop-blur-sm bg-white/90">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    </motion.div>
                    Create Admin Account
                  </CardTitle>
                  <CardDescription>
                    No accounts found. This will create the default admin account.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <motion.div
                    className="rounded-lg bg-muted p-4 space-y-2 text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {[
                      { label: "Email", value: "admin@gyanchem.com" },
                      { label: "Password", value: "GyanChem@2024" },
                      { label: "Role", value: "Admin" },
                    ].map((row, i) => (
                      <motion.div
                        key={row.label}
                        className="flex justify-between"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.08 }}
                      >
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className={`font-mono font-semibold ${row.label === "Role" ? "text-primary" : ""}`}>
                          {row.value}
                        </span>
                      </motion.div>
                    ))}
                  </motion.div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-destructive bg-destructive/10 rounded-md p-3"
                    >
                      {error}
                    </motion.p>
                  )}

                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                    <Button className="w-full gap-2" onClick={createAdminAccount} disabled={creating}>
                      {creating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Create Admin Account
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {status === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <Card className="border-green-200 shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </motion.div>
                    Account Created!
                  </CardTitle>
                  <CardDescription>Your admin account is ready. Use these credentials to sign in.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <motion.div
                    className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-2 text-sm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {[
                      { label: "Email", value: "admin@gyanchem.com" },
                      { label: "Password", value: "GyanChem@2024" },
                    ].map((row, i) => (
                      <motion.div
                        key={row.label}
                        className="flex justify-between"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                      >
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-mono font-semibold">{row.value}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Button className="w-full gap-2" onClick={() => setLocation("/login")}>
                      Sign In Now <ArrowRight className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
