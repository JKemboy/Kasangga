BEGIN;
DO $migration$ DECLARE definition text; BEGIN
 SELECT pg_get_functiondef('public.osas_save_record(text,bigint,text,jsonb,text)'::regprocedure) INTO definition;
 IF position('Use the two-step case review' in definition)=0 THEN
  IF position(' notes:=btrim(coalesce(p_value' in definition)=0 THEN RAISE EXCEPTION 'Legacy gateway changed; review migration.'; END IF;
  definition:=replace(definition,' notes:=btrim(coalesce(p_value',E' if p_kind in (''incident'',''evidence'',''case'',''clearance'',''hold'') then raise exception ''Use the two-step case review and Student Clearance actions.''; end if;\n notes:=btrim(coalesce(p_value');
  EXECUTE definition;
 END IF;
END $migration$;
COMMIT;
