import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Bell,
  Bike,
  BriefcaseBusiness,
  Headphones,
  History,
  Home,
  LogIn,
  LogOut,
  Menu,
  Search,
  Shield,
  ShoppingBag,
  Tags,
  UserCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import logo from "@/assets/tabedaar-logo-header.png";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const { user, isAuthenticated, isAdmin, isManager, isRider, signOut } = useAuth();

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const isActiveRoute = (href: string) =>
    href === "/" ? location.pathname === href : location.pathname.startsWith(href);

  const accountLabel = isAdmin ? "Administrator" : isManager ? "Manager" : isRider ? "Rider" : "Customer";

  const MobileMenuLink = ({
    to,
    label,
    icon: Icon,
  }: {
    to: string;
    label: string;
    icon: typeof Home;
  }) => {
    const active = isActiveRoute(to);

    return (
      <Link
        to={to}
        onClick={closeMobileMenu}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
          active
            ? "bg-secondary text-secondary-foreground shadow-sm"
            : "text-foreground hover:bg-muted hover:text-primary",
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            active ? "bg-secondary-foreground/15" : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span>{label}</span>
      </Link>
    );
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Logged out successfully!",
      });
      navigate("/login");
    }
  };

  return (
    <header className="sticky top-0 left-0 right-0 z-50 w-full bg-primary shadow-md safe-area-top">
      <div className="container mx-auto flex h-20 md:h-28 lg:h-32 items-center justify-between px-3 md:px-4">
        <Link to="/" className="flex min-w-0 items-center" aria-label="Tabedaar.com home">
          <span className="rounded-xl bg-card px-3 py-1.5 shadow-sm">
            <img
              src={logo}
              alt="Tabedaar.com Logo"
              className="block h-auto w-36 max-w-[50vw] object-contain sm:w-44 md:w-52 lg:w-60"
            />
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link to="/" className="text-sm font-medium text-primary-foreground/80 transition-all duration-300 hover:text-secondary hover:scale-110">
            Home
          </Link>
          {isAuthenticated ? (
            <>
              {(!isRider && !isManager) || isAdmin ? (
                <>
                  <Link to="/place-order" className="text-sm font-medium text-primary-foreground/80 transition-all duration-300 hover:text-secondary hover:scale-110">
                    Place Order
                  </Link>
                  <Link to="/order-history" className="text-sm font-medium text-primary-foreground/80 transition-all duration-300 hover:text-secondary hover:scale-110">
                    My Orders
                  </Link>
                  <Link to="/track" className="text-sm font-medium text-primary-foreground/80 transition-all duration-300 hover:text-secondary hover:scale-110">
                    Track
                  </Link>
                </>
              ) : null}
              {isRider && (
                <Link to="/orders" className="text-sm font-medium text-primary-foreground/80 transition-all duration-300 hover:text-secondary hover:scale-110">
                  Orders
                </Link>
              )}
              <Link to="/contact" className="text-sm font-medium text-primary-foreground/80 transition-all duration-300 hover:text-secondary hover:scale-110">
                Contact
              </Link>
              {isAdmin && (
                <>
                  <Link to="/admin" className="text-sm font-medium text-primary-foreground/80 transition-all duration-300 hover:text-secondary hover:scale-110 flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    Admin
                  </Link>
                  <Link to="/admin/reports" className="text-sm font-medium text-primary-foreground/80 transition-all duration-300 hover:text-secondary hover:scale-110 flex items-center gap-1">
                    <BarChart3 className="h-4 w-4" />
                    Reports
                  </Link>
                </>
              )}
              {isManager && (
                <>
                  <Link to="/manager" className="text-sm font-medium text-primary-foreground/80 transition-all duration-300 hover:text-secondary hover:scale-110">
                    Manager
                  </Link>
                  <Link to="/manager/pricing" className="text-sm font-medium text-primary-foreground/80 transition-all duration-300 hover:text-secondary hover:scale-110">
                    Pricing
                  </Link>
                </>
              )}
              <NotificationBell />
              <Link to="/profile" aria-label="My Profile" className="text-sm font-medium text-primary-foreground/80 transition-all duration-300 hover:text-secondary hover:scale-110 flex items-center gap-1">
                <UserCircle className="h-4 w-4" />
                Profile
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-primary-foreground/80 hover:text-secondary hover:bg-primary-foreground/10 transition-all duration-300 hover:scale-105">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/contact" className="text-sm font-medium text-primary-foreground/80 transition-all duration-300 hover:text-secondary hover:scale-110">
                Contact
              </Link>
              <Link to="/login">
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:scale-105">
                  Login
                </Button>
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Navigation */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Open navigation menu" className="text-primary-foreground hover:bg-primary-foreground/10 transition-all duration-300 hover:scale-110">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="flex h-full w-[min(88vw,22rem)] flex-col gap-0 overflow-hidden border-l-0 bg-background p-0 [&>button]:right-3 [&>button]:top-[max(1rem,env(safe-area-inset-top))] [&>button]:text-primary-foreground [&>button]:ring-offset-primary"
          >
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>

            <div className="safe-area-top shrink-0 bg-primary px-5 pb-5 pt-5">
              <div className="mb-5 inline-flex rounded-md bg-card px-3 py-2 shadow-sm">
                <img src={logo} alt="Tabedaar.com" className="h-auto w-36 object-contain" />
              </div>

              {isAuthenticated ? (
                <Link
                  to="/profile"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-md bg-primary-foreground/10 p-3 transition-colors hover:bg-primary-foreground/15"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <UserCircle className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-primary-foreground">My Profile</span>
                    <span className="block truncate text-xs text-primary-foreground/70">
                      {user?.email ?? accountLabel}
                    </span>
                    <span className="mt-0.5 block text-xs font-medium text-secondary">{accountLabel}</span>
                  </span>
                </Link>
              ) : (
                <p className="max-w-[15rem] text-sm leading-6 text-primary-foreground/75">
                  Shop in Lahore and receive your purchases anywhere in the world.
                </p>
              )}
            </div>

            <nav className="native-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4" aria-label="Mobile navigation">
              <div className="space-y-1">
                <MobileMenuLink to="/" label="Home" icon={Home} />

                {isAuthenticated ? (
                  <>
                  {(!isRider && !isManager) || isAdmin ? (
                    <>
                      <MobileMenuLink to="/place-order" label="Place Order" icon={ShoppingBag} />
                      <MobileMenuLink to="/order-history" label="My Orders" icon={History} />
                      <MobileMenuLink to="/track" label="Track Order" icon={Search} />
                    </>
                  ) : null}
                  {isRider && (
                    <MobileMenuLink to="/orders" label="Rider Orders" icon={Bike} />
                  )}
                  {isAdmin && (
                    <>
                      <MobileMenuLink to="/admin" label="Admin Dashboard" icon={Shield} />
                      <MobileMenuLink to="/admin/reports" label="Reports" icon={BarChart3} />
                    </>
                  )}
                  {isManager && (
                    <>
                      <MobileMenuLink to="/manager" label="Manager Dashboard" icon={BriefcaseBusiness} />
                      <MobileMenuLink to="/manager/pricing" label="Pricing Management" icon={Tags} />
                    </>
                  )}
                    <div className="my-3 border-t border-border" />
                    <MobileMenuLink to="/notifications" label="Notifications" icon={Bell} />
                    <MobileMenuLink to="/profile" label="My Profile" icon={UserCircle} />
                  </>
                ) : null}

                <MobileMenuLink to="/contact" label="Contact Us" icon={Headphones} />
              </div>

              <div className="mt-auto border-t border-border pt-4">
                {isAuthenticated ? (
                  <Button
                    variant="ghost"
                    className="min-h-12 w-full justify-start gap-3 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      closeMobileMenu();
                      void handleLogout();
                    }}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-destructive/10">
                      <LogOut className="h-4 w-4" />
                    </span>
                    Logout
                  </Button>
                ) : (
                  <Button asChild className="min-h-12 w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
                    <Link to="/login" onClick={closeMobileMenu}>
                      <LogIn className="h-4 w-4" />
                      Login
                    </Link>
                  </Button>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};
