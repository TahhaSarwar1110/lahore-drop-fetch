import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  DollarSign,
  Bike,
  Users,
  UserCircle,
  Download,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReportsSidebarProps {
  activeSection: string;
}

const sidebarItems = [
  {
    id: "overview",
    label: "Business Overview",
    icon: LayoutDashboard,
    href: "/admin/reports",
  },
  {
    id: "orders",
    label: "Orders Report",
    icon: ShoppingCart,
    href: "/admin/reports/orders",
  },
  {
    id: "sales",
    label: "Sales & Revenue",
    icon: DollarSign,
    href: "/admin/reports/sales",
  },
  {
    id: "riders",
    label: "Rider Performance",
    icon: Bike,
    href: "/admin/reports/riders",
  },
  {
    id: "managers",
    label: "Manager Performance",
    icon: Users,
    href: "/admin/reports/managers",
  },
  {
    id: "customers",
    label: "Customer Insights",
    icon: UserCircle,
    href: "/admin/reports/customers",
  },
  {
    id: "export",
    label: "Export & Filters",
    icon: Download,
    href: "/admin/reports/export",
  },
];

export const ReportsSidebar = ({ activeSection }: ReportsSidebarProps) => {
  return (
    <aside className="w-full lg:w-64 flex-shrink-0">
      <div className="bg-card rounded-xl border border-border p-4 sticky top-24">
        <Link to="/admin">
          <Button variant="ghost" size="sm" className="mb-4 gap-2 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        
        <h2 className="text-lg font-semibold text-foreground mb-4 px-2">Reports</h2>
        
        <nav className="space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <Link
                key={item.id}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
