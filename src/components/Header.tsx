import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import logo from "@/assets/desi-drop-logo.jpeg";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { usePermissions } from "@/hooks/usePermissions";

export const Header = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRiderOnly, setIsRiderOnly] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  useEffect(() => {
    if (isAuthenticated) {
      checkUserRole();
    } else {
      setIsAdmin(false);
      setIsRiderOnly(false);
    }
  }, [isAuthenticated]);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      if (roles && roles.length > 0) {
        const userRoles = roles.map(r => r.role);
        setIsAdmin(userRoles.includes("admin"));
        // User is rider-only if they have rider role but not admin or manager
        setIsRiderOnly(
          userRoles.includes("rider") && 
          !userRoles.includes("admin") && 
          !userRoles.includes("manager")
        );
      }
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
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
      <div className="container mx-auto flex h-14 md:h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center">
          <img src={logo} alt="Desi Drop Logo" className="h-10 md:h-12 w-auto" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {!isRiderOnly && (
            <Link to="/" className="text-sm font-medium transition-colors hover:text-primary">
              Home
            </Link>
          )}
          {isAuthenticated ? (
            <>
              {!isRiderOnly && (
                <>
                  <Link to="/place-order" className="text-sm font-medium transition-colors hover:text-primary">
                    Place Order
                  </Link>
                  <Link to="/orders" className="text-sm font-medium transition-colors hover:text-primary">
                    My Orders
                  </Link>
                  <Link to="/track" className="text-sm font-medium transition-colors hover:text-primary">
                    Track
                  </Link>
                </>
              )}
              <Link to="/contact" className="text-sm font-medium transition-colors hover:text-primary">
                Contact
              </Link>
              {isAdmin && (
                <Link to="/admin" className="text-sm font-medium transition-colors hover:text-primary flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              )}
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/contact" className="text-sm font-medium transition-colors hover:text-primary">
                Contact
              </Link>
              <Link to="/login">
                <Button variant="default" size="sm">
                  Login
                </Button>
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Navigation */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <nav className="flex flex-col space-y-4 mt-8">
              {!isRiderOnly && (
                <Link 
                  to="/" 
                  className="text-base font-medium transition-colors hover:text-primary py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </Link>
              )}
              {isAuthenticated ? (
                <>
                  {!isRiderOnly && (
                    <>
                      <Link 
                        to="/place-order" 
                        className="text-base font-medium transition-colors hover:text-primary py-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Place Order
                      </Link>
                      <Link 
                        to="/orders" 
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
                  )}
                  <Link 
                    to="/contact" 
                    className="text-base font-medium transition-colors hover:text-primary py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Contact
                  </Link>
                  {isAdmin && (
                    <Link 
                      to="/admin" 
                      className="text-base font-medium transition-colors hover:text-primary py-2 flex items-center gap-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Shield className="h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  )}
                  <Button 
                    variant="outline" 
                    className="justify-start" 
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
                    <Button variant="default" className="w-full">
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
