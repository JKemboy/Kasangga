-- Retain authentication, ownership and private-storage validation.
CREATE OR REPLACE FUNCTION public.submit_tutor_application(p_details jsonb, p_documents jsonb, p_application_id bigint DEFAULT NULL::bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid := auth.uid();
  app_id bigint;
  doc jsonb;
  doc_type text;
  doc_path text;
  full_name text;
  app_details jsonb := p_details;
  applicant public.users%rowtype;
begin
  if uid is null or not exists (
    select 1 from auth.users au
    where au.id=uid and au.email_confirmed_at is not null
      and au.email ~* '^[^[:space:]@]+@carsu[.]edu[.]ph$'
  ) then
    raise exception 'Verified CSU session required';
  end if;
  if not exists (
    select 1 from public.users u
    where u.user_id=uid and u.account_status='active'
  ) or not exists (
    select 1 from public.user_roles r
    where r.user_id=uid and r.role='learner' and r.is_active
  ) then
    raise exception 'Active learner account required';
  end if;
  if jsonb_typeof(p_details) is distinct from 'object'
    or jsonb_typeof(p_documents) is distinct from 'array' then
    raise exception 'Invalid tutor application details or documents';
  end if;

  select * into applicant from public.users u
  where u.user_id=uid and u.account_status='active'
  for update;
  full_name := btrim(concat_ws(' ',applicant.first_name,applicant.last_name));
  app_details := p_details || jsonb_build_object(
    'name',full_name,
    'studentId',applicant.student_id,
    'email',applicant.csu_email,
    'college',applicant.college,
    'program',applicant.program,
    'year',applicant.year_level
  );
  if jsonb_typeof(app_details->'subjects') is distinct from 'array' then
    raise exception 'Choose at least one tutoring subject';
  end if;
  if jsonb_array_length(app_details->'subjects') = 0 then
    raise exception 'Choose at least one tutoring subject';
  end if;
  if length(btrim(coalesce(app_details->>'bio',''))) not between 30 and 400
    or length(btrim(coalesce(app_details->>'motivation',''))) not between 20 and 300
    or coalesce(full_name,'') = '' then
    raise exception 'Complete all required tutor application information';
  end if;
  if coalesce((app_details->>'certified')::boolean,false) is not true then
    raise exception 'Confirm the application certification before submitting';
  end if;

  if coalesce(app_details->>'applicationVersion','') = '2' then
    if length(btrim(coalesce(app_details->>'courseCode',''))) not between 1 and 50
      or length(btrim(coalesce(app_details->>'courseDescription',''))) not between 1 and 1000
      or length(btrim(coalesce(app_details->>'gcashName',''))) not between 1 and 150
      or coalesce(app_details->>'gcashNumber','') !~ '^\+639[0-9]{9}$'
      or jsonb_array_length(app_details->'subjects') > 20
      or exists (select 1 from jsonb_array_elements(app_details->'subjects') subject where jsonb_typeof(subject) <> 'string' or length(btrim(subject #>> '{}')) not between 1 and 100)
    then raise exception 'Complete the course information, subject expertise and valid GCash payout details'; end if;
  end if;
  if jsonb_array_length(p_documents) > 13
    or (select count(*) from jsonb_array_elements(p_documents)) <> (select count(distinct value->>'file_path') from jsonb_array_elements(p_documents) value)
    or (select count(*) from jsonb_array_elements(p_documents) value where value->>'document_type'='awards') > 10
    or exists (select 1 from jsonb_array_elements(p_documents) value where value->>'document_type'<>'awards' group by value->>'document_type' having count(*) > 1)
    or exists (select 1 from unnest(array['enrollment','grades']) required_type where not exists (select 1 from jsonb_array_elements(p_documents) item where item->>'document_type'=required_type))
  then raise exception 'Current enrollment proof and relevant grade evidence are required; upload up to 10 distinct awards'; end if;

  for doc in select value from jsonb_array_elements(p_documents)
  loop
    doc_type := doc->>'document_type';
    doc_path := doc->>'file_path';
    if coalesce(doc_type,'') not in ('studentId','enrollment','grades','awards')
      or coalesce(split_part(doc_path,'/',1),'') <> uid::text
      or cardinality(string_to_array(doc_path,'/')) <> 3
      or coalesce(split_part(doc_path,'/',2),'') = ''
      or coalesce(split_part(doc_path,'/',3),'') = ''
      or coalesce(doc->>'mime_type','') not in ('application/pdf','image/jpeg','image/png')
      or nullif(btrim(doc->>'file_name'),'') is null
      or not exists (
        select 1 from storage.objects o
        where o.bucket_id='apply-as-tutor' and o.name=doc_path
      ) then
      raise exception 'A tutor application document is invalid or missing from private storage';
    end if;
  end loop;

  if p_application_id is null then
    if exists (
      select 1 from public.tutor_applications a
      where a.user_id=uid
        and lower(a.application_status) in (
          'pending','under_review','resubmission_required'
        )
    ) then
      raise exception 'You already have an active tutor application';
    end if;
    insert into public.tutor_applications (
      user_id, application_status, submitted_at, application_details,
      review_history, reviewed_by, reviewed_at, rejection_reason, admin_notes
    ) values (uid,'pending',now(),app_details,'[]'::jsonb,null,null,null,null)
    returning application_id into app_id;
  else
    update public.tutor_applications
    set application_status='pending',
        submitted_at=now(),
        application_details=app_details,
        review_history=review_history || jsonb_build_array(jsonb_build_object(
          'action','resubmitted','at',now()
        )),
        reviewed_by=null,
        reviewed_at=null,
        rejection_reason=null,
        admin_notes=null
    where application_id=p_application_id
      and user_id=uid
      and lower(application_status)='resubmission_required'
    returning application_id into app_id;
    if app_id is null then
      raise exception 'This application is not available for resubmission';
    end if;
    delete from public.verification_documents
    where application_id=app_id;
  end if;

  for doc in select value from jsonb_array_elements(p_documents)
  loop
    insert into public.verification_documents (
      application_id, document_type, file_path, file_name, mime_type,
      manual_review_required, review_status
    ) values (
      app_id, doc->>'document_type', doc->>'file_path', doc->>'file_name',
      doc->>'mime_type', true, 'pending'
    );
  end loop;

  return app_id;
end;
$function$
;
