import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, Menu } from "lucide-react";
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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link to="/" className="flex items-center py-2">
          <img src={logo} alt="PickyRider Logo" className="h-14 md:h-16 w-auto object-contain" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link to="/" className="text-sm font-medium text-foreground/80 transition-all duration-300 hover:text-accent">
            Home
          </Link>
          {isAuthenticated ? (
            <>
              {(!isRider && !isManager) || isAdmin ? (
                <>
                  <Link to="/place-order" className="text-sm font-medium text-foreground/80 transition-all duration-300 hover:text-accent">
                    Place Order
                  </Link>
                  <Link to="/order-history" className="text-sm font-medium text-foreground/80 transition-all duration-300 hover:text-accent">
                    My Orders
                  </Link>
                  <Link to="/track" className="text-sm font-medium text-foreground/80 transition-all duration-300 hover:text-accent">
                    Track
                  </Link>
                </>
              ) : null}
              {isRider && (
                <Link to="/orders" className="text-sm font-medium text-foreground/80 transition-all duration-300 hover:text-accent">
                  Orders
                </Link>
              )}
              <Link to="/contact" className="text-sm font-medium text-foreground/80 transition-all duration-300 hover:text-accent">
                Contact
              </Link>
              {isAdmin && (
                <Link to="/admin" className="text-sm font-medium text-foreground/80 transition-all duration-300 hover:text-accent flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              )}
              {isManager && (
                <>
                  <Link to="/manager" className="text-sm font-medium text-foreground/80 transition-all duration-300 hover:text-accent">
                    Manager
                  </Link>
                  <Link to="/manager/pricing" className="text-sm font-medium text-foreground/80 transition-all duration-300 hover:text-accent">
                    Pricing
                  </Link>
                </>
              )}
              <NotificationBell />
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-foreground/80 hover:text-accent transition-all duration-300">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/contact" className="text-sm font-medium text-foreground/80 transition-all duration-300 hover:text-accent">
                Contact
              </Link>
              <Link to="/login">
                <Button className="btn-cta rounded-xl px-6">
                  Login
                </Button>
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Navigation */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="transition-all duration-300 hover:text-accent">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 bg-card">
            <nav className="flex flex-col space-y-4 mt-8">
              <Link 
                to="/" 
                className="text-base font-medium text-foreground transition-colors hover:text-accent py-2"
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
                        className="text-base font-medium text-foreground transition-colors hover:text-accent py-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Place Order
                      </Link>
                      <Link 
                        to="/order-history" 
                        className="text-base font-medium text-foreground transition-colors hover:text-accent py-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        My Orders
                      </Link>
                      <Link 
                        to="/track" 
                        className="text-base font-medium text-foreground transition-colors hover:text-accent py-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Track
                      </Link>
                    </>
                  ) : null}
                  {isRider && (
                    <Link 
                      to="/orders" 
                      className="text-base font-medium text-foreground transition-colors hover:text-accent py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Orders
                    </Link>
                  )}
                  <Link 
                    to="/contact" 
                    className="text-base font-medium text-foreground transition-colors hover:text-accent py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Contact
                  </Link>
                  {isAdmin && (
                    <Link 
                      to="/admin" 
                      className="text-base font-medium text-foreground transition-colors hover:text-accent py-2 flex items-center gap-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Shield className="h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  )}
                  {isManager && (
                    <>
                      <Link 
                        to="/manager" 
                        className="text-base font-medium text-foreground transition-colors hover:text-accent py-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Manager Dashboard
                      </Link>
                      <Link 
                        to="/manager/pricing" 
                        className="text-base font-medium text-foreground transition-colors hover:text-accent py-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Pricing Management
                      </Link>
                    </>
                  )}
                  <Button 
                    variant="outline" 
                    className="justify-start border-border hover:border-accent hover:text-accent transition-all duration-300" 
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
                    className="text-base font-medium text-foreground transition-colors hover:text-accent py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Contact
                  </Link>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full btn-cta rounded-xl">
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