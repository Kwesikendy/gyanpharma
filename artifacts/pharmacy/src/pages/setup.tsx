import { useState, useEffect } from "react";
import { getUsers } from "@/lib/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";

export default function Setup() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"checking" | "ready" | "done" | "already_setup">("checking");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getUsers().then((users) => {
      if (users.length > 0) {
        setStatus("already_setup");
      } else {
        setStatus("ready");
      }
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg mb-4">
            <Pill className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gyan Chemicals</h1>
          <p className="text-slate-500 mt-2">First-time Setup</p>
        </div>

        {status === "checking" && (
          <Card>
            <CardContent className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {status === "already_setup" && (
          <Card>
            <CardHeader>
              <CardTitle>Setup Already Complete</CardTitle>
              <CardDescription>An admin account already exists. Go to the login page to sign in.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setLocation("/login")}>
                Go to Login
              </Button>
            </CardContent>
          </Card>
        )}

        {status === "ready" && (
          <Card className="border-slate-200 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Create Admin Account
              </CardTitle>
              <CardDescription>
                No accounts found. This will create the default admin account for Gyan Chemicals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-mono font-semibold">admin@gyanchem.com</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Password</span>
                  <span className="font-mono font-semibold">GyanChem@2024</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-semibold text-primary">Admin</span>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</p>
              )}

              <Button className="w-full" onClick={createAdminAccount} disabled={creating}>
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Create Admin Account
              </Button>
            </CardContent>
          </Card>
        )}

        {status === "done" && (
          <Card className="border-green-200 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                Account Created!
              </CardTitle>
              <CardDescription>Your admin account is ready. Use these credentials to sign in.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-mono font-semibold">admin@gyanchem.com</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Password</span>
                  <span className="font-mono font-semibold">GyanChem@2024</span>
                </div>
              </div>
              <Button className="w-full" onClick={() => setLocation("/login")}>
                Go to Login
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
