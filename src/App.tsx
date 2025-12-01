import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import PlaceOrder from "./pages/PlaceOrder";
import OrderHistory from "./pages/OrderHistory";
import OrderDetails from "./pages/OrderDetails";
import TrackOrder from "./pages/TrackOrder";
import Contact from "./pages/Contact";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrderDetails from "./pages/admin/AdminOrderDetails";
import RiderDashboard from "./pages/rider/RiderDashboard";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import ManagerOrderDetails from "./pages/manager/ManagerOrderDetails";
import { PricingManagement } from "./pages/manager/PricingManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/place-order" element={<PlaceOrder />} />
          <Route path="/order-history" element={<OrderHistory />} />
          <Route path="/order-details" element={<OrderDetails />} />
          <Route path="/orders" element={<RiderDashboard />} />
          <Route path="/track" element={<TrackOrder />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/orders/:orderId" element={<AdminOrderDetails />} />
          <Route path="/manager" element={<ManagerDashboard />} />
          <Route path="/manager/orders/:orderId" element={<ManagerOrderDetails />} />
          <Route path="/manager/pricing" element={<PricingManagement />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
