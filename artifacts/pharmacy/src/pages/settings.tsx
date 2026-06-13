import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings, User, ShieldCheck, Mail, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function SettingsPage() {
  const { userProfile } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <div className="max-w-lg">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Access Rights</CardTitle>
          <CardDescription>What you can do based on your role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
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
  );
}
