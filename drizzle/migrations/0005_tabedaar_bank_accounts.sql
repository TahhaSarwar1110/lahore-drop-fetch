CREATE TABLE public.bank_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 bank_name text NOT NULL CHECK (char_length(bank_name) BETWEEN 2 AND 100),
 account_title text NOT NULL CHECK (char_length(account_title) BETWEEN 2 AND 150),
 account_number text NOT NULL CHECK (char_length(account_number) BETWEEN 5 AND 40),
 iban text CHECK (iban IS NULL OR char_length(iban) BETWEEN 15 AND 34),
 instructions text NOT NULL DEFAULT '' CHECK (char_length(instructions) <= 1000),
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read active payment accounts or admin accounts" ON public.bank_accounts FOR SELECT TO authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins create payment accounts" ON public.bank_accounts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins edit payment accounts" ON public.bank_accounts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete payment accounts" ON public.bank_accounts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));