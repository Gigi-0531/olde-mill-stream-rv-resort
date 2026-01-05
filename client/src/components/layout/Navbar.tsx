import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { 
  LogOut, 
  Map as MapIcon, 
  Calendar, 
  Users, 
  Home,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import logoImg from "@/assets/logo.jpg";

export function Navbar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const baseRoute = isAdmin ? '/admin' : '/dashboard';

  const NavLink = ({ href, icon: Icon, children }: { href: string; icon: any; children: React.ReactNode }) => {
    const isActive = location === href;
    return (
      <Link href={href} className={`
        flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200
        ${isActive 
          ? 'bg-primary text-primary-foreground shadow-md' 
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'}
      `} onClick={() => setIsMobileMenuOpen(false)}>
        <Icon className="w-4 h-4" />
        <span className="font-medium">{children}</span>
      </Link>
    );
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href={baseRoute} className="flex items-center gap-2 group">
              <div className="relative w-10 h-10 overflow-hidden rounded-full border-2 border-primary shadow-sm group-hover:scale-105 transition-transform">
                <img src={logoImg} alt="Olde Mill Stream" className="w-full h-full object-cover" />
              </div>
              <span className="font-display font-bold text-xl text-primary hidden sm:block">
                Olde Mill Stream
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-2">
            <NavLink href={baseRoute} icon={Home}>Home</NavLink>
            {!isAdmin && <NavLink href="/map" icon={MapIcon}>Map</NavLink>}
            {!isAdmin && <NavLink href="/activities" icon={Calendar}>Activities</NavLink>}
            <NavLink href="/directory" icon={Users}>Directory</NavLink>
            <div className="h-6 w-px bg-border mx-2" />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => logout()}
              className="text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-border">
          <div className="px-4 pt-2 pb-4 space-y-1">
            <NavLink href={baseRoute} icon={Home}>Home</NavLink>
            {!isAdmin && <NavLink href="/map" icon={MapIcon}>Map</NavLink>}
            {!isAdmin && <NavLink href="/activities" icon={Calendar}>Activities</NavLink>}
            <NavLink href="/directory" icon={Users}>Directory</NavLink>
            <Button 
              variant="destructive" 
              className="w-full justify-start mt-4" 
              onClick={() => logout()}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
