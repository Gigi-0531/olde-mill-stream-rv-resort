import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { 
  LogOut, 
  Map as MapIcon, 
  Calendar, 
  Users, 
  Home,
  Image,
  ChevronDown,
  LogIn
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import logoImg from "@/assets/logo.jpg";

function RVIcon({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 60" 
      className={className}
      fill="currentColor"
    >
      <rect x="5" y="20" width="70" height="30" rx="3" />
      <rect x="60" y="15" width="35" height="35" rx="3" />
      <rect x="65" y="20" width="12" height="10" rx="1" fill="currentColor" className="opacity-30" />
      <rect x="80" y="20" width="12" height="10" rx="1" fill="currentColor" className="opacity-30" />
      <rect x="10" y="25" width="15" height="10" rx="1" fill="currentColor" className="opacity-30" />
      <rect x="28" y="25" width="15" height="10" rx="1" fill="currentColor" className="opacity-30" />
      <rect x="46" y="25" width="10" height="20" rx="1" fill="currentColor" className="opacity-30" />
      <circle cx="20" cy="52" r="7" />
      <circle cx="20" cy="52" r="3" fill="currentColor" className="opacity-30" />
      <circle cx="50" cy="52" r="7" />
      <circle cx="50" cy="52" r="3" fill="currentColor" className="opacity-30" />
      <circle cx="80" cy="52" r="7" />
      <circle cx="80" cy="52" r="3" fill="currentColor" className="opacity-30" />
      <rect x="0" y="35" width="8" height="3" rx="1" />
    </svg>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isLoggedIn = !!user;
  const isAdmin = user?.role === 'admin';
  const baseRoute = isAdmin ? '/admin' : isLoggedIn ? '/dashboard' : '/';

  const NavLink = ({ href, icon: Icon, children }: { href: string; icon: any; children: React.ReactNode }) => {
    const isActive = location === href;
    return (
      <Link 
        href={href} 
        className={`
          flex items-center gap-3 px-4 py-3 transition-all duration-200
          ${isActive 
            ? 'bg-primary text-primary-foreground' 
            : 'text-foreground hover:bg-accent'}
        `} 
        onClick={() => setIsMenuOpen(false)}
        data-testid={`nav-link-${children?.toString().toLowerCase().replace(/\s+/g, '-')}`}
      >
        <Icon className="w-5 h-5" />
        <span className="font-medium">{children}</span>
      </Link>
    );
  };

  return (
    <nav className="fixed top-4 right-4 z-50">
      <div className="relative" ref={menuRef}>
        <Button
          variant="default"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center gap-2 px-4 py-3 h-auto rounded-full shadow-lg bg-primary hover:bg-primary/90"
          data-testid="button-rv-menu"
        >
          <RVIcon className="w-10 h-6 text-white" />
          <ChevronDown className={`w-4 h-4 text-white transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
        </Button>

        {isMenuOpen && (
          <div 
            className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
            data-testid="dropdown-menu"
          >
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <RVIcon className="w-8 h-5 text-primary" />
                <span className="font-display font-semibold text-primary text-sm">Navigate</span>
              </div>
            </div>
            
            <div className="py-1">
              {isLoggedIn ? (
                <>
                  <NavLink href={baseRoute} icon={Home}>Home</NavLink>
                  {!isAdmin && <NavLink href="/map" icon={MapIcon}>Park Map</NavLink>}
                  {!isAdmin && <NavLink href="/activities" icon={Calendar}>Activities</NavLink>}
                  {!isAdmin && <NavLink href="/gallery" icon={Image}>Gallery</NavLink>}
                  <NavLink href="/directory" icon={Users}>Directory</NavLink>
                </>
              ) : (
                <NavLink href="/" icon={LogIn}>Login</NavLink>
              )}
            </div>

            {isLoggedIn && (
              <div className="border-t border-border p-2">
                <Button 
                  variant="destructive" 
                  className="w-full justify-start" 
                  onClick={() => {
                    setIsMenuOpen(false);
                    logout();
                  }}
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
