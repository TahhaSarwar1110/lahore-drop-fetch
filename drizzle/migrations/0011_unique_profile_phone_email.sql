-- Canonical phone normalization shared by the uniqueness trigger and the signup check.
create or replace function public.normalize_profile_phone(raw text)
returns text
language plpgsql
immutable
as $$
declare
  d text;
begin
  d := regexp_replace(coalesce(raw, ''), '[^0-9]', '', 'g');
  if d like '00%' then
    d := substr(d, 3);
  end if;
  if length(d) = 11 and d like '03%' then
    d := '92' || substr(d, 2);
  end if;
  if length(d) = 10 and d like '3%' then
    d := '92' || d;
  end if;
  if d = '' then
    return coalesce(raw, '');
  end if;
  return '+' || d;
end;
$$;

-- Signup pre-check: lets the signup screen show a friendly message before creating the auth user.
create or replace function public.check_signup_contact(p_phone text, p_email text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'phone_taken', p_phone is not null and exists (
      select 1 from public.profiles pr
      where public.normalize_profile_phone(pr.phone) = public.normalize_profile_phone(p_phone)
    ),
    'email_taken', coalesce(btrim(p_email, ''), '') <> '' and exists (
      select 1 from public.profiles pr
      where pr.email is not null
        and lower(btrim(pr.email)) = lower(btrim(p_email))
    )
  );
$$;

-- Enforces unique mobile number and email on every profile insert/update.
-- Blocks only when the contact value actually changes, so saving an unchanged
-- profile of a legacy duplicate account still works.
create or replace function public.enforce_unique_profile_contact()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  norm_phone text;
  prev_phone text;
  norm_email text;
begin
  norm_phone := public.normalize_profile_phone(new.phone);
  prev_phone := case when tg_op = 'UPDATE' then public.normalize_profile_phone(old.phone) else '' end;
  if norm_phone is distinct from prev_phone then
    if exists (
      select 1 from public.profiles p
      where p.id <> new.id
        and public.normalize_profile_phone(p.phone) = norm_phone
    ) then
      raise exception 'This mobile number is already registered. Please login instead.';
    end if;
    new.phone := norm_phone;
  end if;

  norm_email := lower(btrim(coalesce(new.email, '')));
  if norm_email <> '' and norm_email not like '%@tabedaar.local' then
    if tg_op = 'INSERT' or norm_email is distinct from lower(btrim(coalesce(old.email, ''))) then
      if exists (
        select 1 from public.profiles p
        where p.id <> new.id
          and p.email is not null
          and lower(btrim(p.email)) = norm_email
      ) then
        raise exception 'This email address is already registered. Please login instead.';
      end if;
    end if;
    new.email := norm_email;
  end if;
  return new;
end;
$$;

-- Database-level backstop for unique real emails (multiple NULLs allowed).
create unique index profiles_email_unique_idx
  on public.profiles (lower(btrim(email)))
  where email is not null;

create trigger profiles_unique_contact
  before insert or update on public.profiles
  for each row execute function public.enforce_unique_profile_contact();

grant execute on function public.check_signup_contact(text, text) to anon, authenticated;
