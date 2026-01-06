import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { 
  LogOut, 
  Map as MapIcon, 
  Calendar, 
  Home,
  Image,
  ChevronDown,
  LogIn
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import logoImg from "@/assets/logo.jpg";
import rvIcon from "@assets/image_1767656588622.png";

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
    <>
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#1E3A5F] shadow-md">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href={baseRoute} className="flex items-center gap-3">
            <span className="font-display text-white text-lg font-semibold">Olde Mill Stream RV Resort</span>
          </Link>
        </div>
      </header>

      {/* RV Menu Button */}
      <nav className="fixed top-16 right-4 z-50">
        <div className="relative" ref={menuRef}>
          <Button
            variant="default"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2 px-3 py-2 h-auto rounded-full shadow-lg bg-white hover:bg-gray-50 border border-border"
            data-testid="button-rv-menu"
          >
            <img src={rvIcon} alt="Menu" className="w-10 h-10 object-contain" />
            <ChevronDown className={`w-4 h-4 text-primary transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
          </Button>

        {isMenuOpen && (
          <div 
            className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
            data-testid="dropdown-menu"
          >
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <img src={rvIcon} alt="RV" className="w-6 h-6 object-contain" />
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
    </>
  );
}
