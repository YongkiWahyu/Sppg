import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, LogIn, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoMark } from "@/pages/LogoMark";

/** Login demo sederhana di frontend (tanpa autentikasi backend). */
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";
const AUTH_KEY = "sppg-admin-auth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (username.trim() === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, "1");
      navigate("/admin/menu");
    } else {
      setError("Username atau password salah. Coba lagi.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <LogoMark />
          <div>
            <h1 className="text-lg font-bold tracking-tight">SPPG Babayo Love Cecep</h1>
            <p className="text-xs text-muted-foreground">Login Admin</p>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Masuk ke panel menu</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    className="pl-9"
                    placeholder="Masukkan username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError("");
                    }}
                    autoComplete="username"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    className="pl-9"
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full gap-2">
                <LogIn className="h-4 w-4" />
                Masuk
              </Button>
            </form>

            <div className="hidden">
              Akun demo: <span className="font-semibold text-foreground">admin</span> /{" "}
              <span className="font-semibold text-foreground">admin123</span> 
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke halaman menu
          </Link>
        </div>
      </div>
    </div>
  );
}
