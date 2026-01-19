import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, Menu, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import logo from "@/assets/pickyrider-logo.png";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "@/hooks/useAuth";

export const Header = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const { isAuthenticated, isAdmin, isManager, isRider, signOut, isLoading } = useAuth();

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

  // Check if we're on the home page (hero section has dark background)
  const isHomePage = window.location.pathname === "/";
  
  // Dynamic classes based on page
  const headerBg = isHomePage ? "" : "bg-primary shadow-md";
  const logoFilter = "brightness-0 invert"; // Always white logo on dark backgrounds

  return (
    <header className={`${isHomePage ? "absolute" : "sticky"} top-0 left-0 right-0 z-50 w-full ${headerBg}`}>
      <div className="container mx-auto flex h-20 md:h-24 items-center justify-between px-4">
        <Link to="/" className="flex items-center py-2">
          <img src={logo} alt="PickyRider Logo" className={`h-16 md:h-20 w-auto object-contain ${logoFilter}`} />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link to="/" className="text-sm font-medium text-white/90 transition-all duration-300 hover:text-white hover:scale-110">
            Home
          </Link>
          {isAuthenticated ? (
            <>
              {(!isRider && !isManager) || isAdmin ? (
                <>
                  <Link to="/place-order" className="text-sm font-medium text-white/90 transition-all duration-300 hover:text-white hover:scale-110">
                    Place Order
                  </Link>
                  <Link to="/order-history" className="text-sm font-medium text-white/90 transition-all duration-300 hover:text-white hover:scale-110">
                    My Orders
                  </Link>
                  <Link to="/track" className="text-sm font-medium text-white/90 transition-all duration-300 hover:text-white hover:scale-110">
                    Track
                  </Link>
                </>
              ) : null}
              {isRider && (
                <Link to="/orders" className="text-sm font-medium text-white/90 transition-all duration-300 hover:text-white hover:scale-110">
                  Orders
                </Link>
              )}
              <Link to="/contact" className="text-sm font-medium text-white/90 transition-all duration-300 hover:text-white hover:scale-110">
                Contact
              </Link>
              {isAdmin && (
                <>
                  <Link to="/admin" className="text-sm font-medium text-white/90 transition-all duration-300 hover:text-white hover:scale-110 flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    Admin
                  </Link>
                  <Link to="/admin/reports" className="text-sm font-medium text-white/90 transition-all duration-300 hover:text-white hover:scale-110 flex items-center gap-1">
                    <BarChart3 className="h-4 w-4" />
                    Reports
                  </Link>
                </>
              )}
              {isManager && (
                <>
                  <Link to="/manager" className="text-sm font-medium text-white/90 transition-all duration-300 hover:text-white hover:scale-110">
                    Manager
                  </Link>
                  <Link to="/manager/pricing" className="text-sm font-medium text-white/90 transition-all duration-300 hover:text-white hover:scale-110">
                    Pricing
                  </Link>
                </>
              )}
              <NotificationBell />
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white/90 hover:text-white hover:bg-white/10 transition-all duration-300 hover:scale-105">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/contact" className="text-sm font-medium text-white/90 transition-all duration-300 hover:text-white hover:scale-110">
                Contact
              </Link>
              <Link to="/login">
                <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-all duration-300 hover:scale-105">
                  Login
                </Button>
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Navigation */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 transition-all duration-300 hover:scale-110">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <nav className="flex flex-col space-y-4 mt-8">
              <Link 
                to="/" 
                className="text-base font-medium transition-colors hover:text-primary py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              {isAuthenticated ? (
                <>
                  {(!isRider && !isManager) || isAdmin ? (
                    <>
                      <Link 
                        to="/place-order" 
                        className="text-base font-medium transition-colors hover:text-primary py-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Place Order
                      </Link>
                      <Link 
                        to="/order-history" 
                        className="text-base font-medium transition-colors hover:text-primary py-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        My Orders
                      </Link>
                      <Link 
                        to="/track" 
                        className="text-base font-medium transition-colors hover:text-primary py-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Track
                      </Link>
                    </>
                  ) : null}
                  {isRider && (
                    <Link 
                      to="/orders" 
                      className="text-base font-medium transition-colors hover:text-primary py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Orders
                    </Link>
                  )}
                  <Link 
                    to="/contact" 
                    className="text-base font-medium transition-colors hover:text-primary py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Contact
                  </Link>
                  {isAdmin && (
                    <>
                      <Link 
                        to="/admin" 
                        className="text-base font-medium transition-colors hover:text-primary py-2 flex items-center gap-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Shield className="h-4 w-4" />
                        Admin Dashboard
                      </Link>
                      <Link 
                        to="/admin/reports" 
                        className="text-base font-medium transition-colors hover:text-primary py-2 flex items-center gap-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <BarChart3 className="h-4 w-4" />
                        Reports
                      </Link>
                    </>
                  )}
                  {isManager && (
                    <>
                      <Link 
                        to="/manager" 
                        className="text-base font-medium transition-colors hover:text-primary py-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Manager Dashboard
                      </Link>
                      <Link 
                        to="/manager/pricing" 
                        className="text-base font-medium transition-colors hover:text-primary py-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Pricing Management
                      </Link>
                    </>
                  )}
                  <Button 
                    variant="outline" 
                    className="justify-start transition-all duration-300 hover:scale-105" 
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link 
                    to="/contact" 
                    className="text-base font-medium transition-colors hover:text-primary py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Contact
                  </Link>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="default" className="w-full transition-all duration-300 hover:scale-105">
                      Login
                    </Button>
                  </Link>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};
