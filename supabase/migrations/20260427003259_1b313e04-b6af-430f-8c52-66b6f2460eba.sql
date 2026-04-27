CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (user_id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (user_id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
        updated_at = now();

  if lower(new.email) = 'savannahsafarisadmin@gmail.com'
     or coalesce(new.raw_user_meta_data->>'account_type', '') = 'admin' then
    insert into public.user_roles (user_id, role)
    values
      (new.id, 'super_admin'),
      (new.id, 'admin'),
      (new.id, 'editor')
    on conflict (user_id, role) do nothing;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_admin_roles(_user_id uuid, _email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null or auth.uid() <> _user_id then
    return false;
  end if;

  if lower(coalesce(_email, '')) <> 'savannahsafarisadmin@gmail.com'
     and not exists (
       select 1
       from public.profiles
       where user_id = _user_id
         and email = _email
     ) then
    return false;
  end if;

  insert into public.user_roles (user_id, role)
  values
    (_user_id, 'super_admin'),
    (_user_id, 'admin'),
    (_user_id, 'editor')
  on conflict (user_id, role) do nothing;

  return true;
end;
$function$;