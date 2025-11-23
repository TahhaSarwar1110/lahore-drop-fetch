-- Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create role_permissions mapping table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_id uuid REFERENCES public.permissions(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(role, permission_id)
);

-- Create order_assignments table for rider assignments
CREATE TABLE IF NOT EXISTS public.order_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  rider_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by uuid REFERENCES public.profiles(id) NOT NULL,
  UNIQUE(order_id)
);

-- Enable RLS on new tables
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for permissions
CREATE POLICY "Admins can manage permissions"
  ON public.permissions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "All authenticated users can view permissions"
  ON public.permissions FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policies for role_permissions
CREATE POLICY "Admins can manage role permissions"
  ON public.role_permissions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "All authenticated users can view role permissions"
  ON public.role_permissions FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policies for order_assignments
CREATE POLICY "Admins can manage order assignments"
  ON public.order_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Riders can view their assigned orders"
  ON public.order_assignments FOR SELECT
  USING (
    public.has_role(auth.uid(), 'rider') AND rider_id = auth.uid()
  );