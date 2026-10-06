-- Manual migration: adds learner bio/interests and a narrowly scoped profile-save RPC.
-- Review and run in Supabase SQL Editor. No changes to roles, passwords or account status.
begin;
alter table public.users add column if not exists short_bio text;
alter table public.users add column if not exists study_interests text;
create or replace function public.complete_learner_profile(details jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  full_name text := btrim(details->>'name');
  field text;
begin
  if uid is null or not exists (
    select 1 from auth.users where id=uid and email_confirmed_at is not null
      and email ~* '^[^[:space:]@]+@carsu[.]edu[.]ph$'
  ) then raise exception 'Verified CSU session required'; end if;
  if not exists (select 1 from public.users where user_id=uid and account_status='active')
    or not exists (select 1 from public.user_roles where user_id=uid and role='learner' and is_active)
    then raise exception 'Active learner account required'; end if;
  foreach field in array array['name','studentId','phone','bio','interests','program','year','college'] loop
    if nullif(btrim(details->>field),'') is null then raise exception 'Complete every required field'; end if;
  end loop;
  if (details->>'year') !~ '^[1-6]$'
    or btrim(details->>'phone') !~ '^[+0-9 ()-]{7,20}$'
    or length(full_name)>150 or length(details->>'studentId')>50
    or length(details->>'bio')>1000 or length(details->>'interests')>1000
    or length(details->>'program')>150 or length(details->>'college')>150
    then raise exception 'Invalid profile fields'; end if;
  -- BEGIN GENERATED ACADEMIC VALIDATION (scripts/generate-academic-validation.mjs)
  if not exists (
    select 1 from jsonb_array_elements($catalogue$[["College of Agriculture and Agri-Industries","Bachelor of Science in Agriculture"],["College of Agriculture and Agri-Industries","Bachelor in Agricultural Technology"],["College of Agriculture and Agri-Industries","Bachelor of Science in Food Technology"],["College of Computing and Information Sciences","Bachelor of Science in Computer Science"],["College of Computing and Information Sciences","Bachelor of Science in Information Systems"],["College of Computing and Information Sciences","Bachelor of Science in Information Technology"],["College of Education","Bachelor of Elementary Education"],["College of Education","Bachelor of Secondary Education"],["College of Education","Diploma in Teachers Certificate Program"],["College of Engineering and Geo-Sciences","Bachelor of Science in Agricultural and Biosystems Engineering"],["College of Engineering and Geo-Sciences","Bachelor of Science in Civil Engineering"],["College of Engineering and Geo-Sciences","Bachelor of Science in Electronics Engineering"],["College of Engineering and Geo-Sciences","Bachelor of Science in Geodetic Engineering"],["College of Engineering and Geo-Sciences","Bachelor of Science in Geology"],["College of Engineering and Geo-Sciences","Bachelor of Science in Mining Engineering"],["College of Engineering and Geo-Sciences","Bachelor of Science in Architecture"],["College of Engineering and Geo-Sciences","Bachelor of Science in Mechanical Engineering"],["College of Humanities and Social Sciences","Bachelor of Science in Psychology"],["College of Humanities and Social Sciences","Bachelor of Science in Social Work"],["College of Humanities and Social Sciences","Bachelor of Arts in Sociology"],["College of Mathematics and Natural Sciences","Bachelor of Science in Applied Mathematics"],["College of Mathematics and Natural Sciences","Bachelor of Science in Biology"],["College of Mathematics and Natural Sciences","Bachelor of Science in Chemistry"],["College of Mathematics and Natural Sciences","Bachelor of Science in Marine Biology"],["College of Mathematics and Natural Sciences","Bachelor of Science in Mathematics"],["College of Mathematics and Natural Sciences","Bachelor of Science in Physics"],["College of Forestry and Environmental Sciences","Bachelor of Science in Agroforestry"],["College of Forestry and Environmental Sciences","Bachelor of Science in Forestry"],["College of Forestry and Environmental Sciences","Bachelor of Science in Environmental Science"]]$catalogue$::jsonb) as pair
    where pair->>0 = details->>'college' and pair->>1 = details->>'program'
  ) then raise exception 'Select a valid college and its corresponding program'; end if;
  -- END GENERATED ACADEMIC VALIDATION
  update public.users set
    first_name=split_part(full_name,' ',1),
    last_name=ltrim(substr(full_name,length(split_part(full_name,' ',1))+1)),
    student_id=btrim(details->>'studentId'), phone_number=btrim(details->>'phone'),
    short_bio=btrim(details->>'bio'), study_interests=btrim(details->>'interests'),
    program=btrim(details->>'program'), college=btrim(details->>'college'),
    year_level=(details->>'year')::integer, updated_at=now()
  where user_id=uid;
end;
$$;
revoke all on function public.complete_learner_profile(jsonb) from public, anon;
grant execute on function public.complete_learner_profile(jsonb) to authenticated;
commit;
