"use client";

import { useSession, signOut } from "next-auth/react";
import { Bell, Search, Settings, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

const planColors: Record<string, string> = {
  FREE: "bg-muted text-muted-foreground",
  PRO: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  AGENCY: "bg-purple-500/20 text-purple-400 border-purple-500/50",
};

export function Header() {
  const { data: session } = useSession();
  const user = session?.user;

  const getInitials = (name?: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur">
      {/* Search */}
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search leads, sequences..."
          className="pl-10 bg-secondary border-0 focus-visible:ring-accent"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
        </Button>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name || ""}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium">
                    {getInitials(user.name)}
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">{user.name || "User"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Badge
                  variant="outline"
                  className={`ml-2 ${planColors[(user as any).plan || "FREE"]}`}
                >
                  {(user as any).plan || "FREE"}
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{user.name || "User"}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <Link href="/settings">
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Configuración
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
