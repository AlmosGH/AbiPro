-- Supabase-specific objects that are intentionally outside the Drizzle TypeScript model.
-- The role starts without LOGIN. Set a generated password after migrating with:
-- alter role abipro_app login password '<generated-and-uncommitted-password>';

do $$
begin
	if not exists (select 1 from pg_roles where rolname = 'abipro_app') then
		create role abipro_app nologin nosuperuser nocreatedb nocreaterole noinherit;
	end if;
end
$$;
--> statement-breakpoint

revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to abipro_app;
grant select on all tables in schema app_private to abipro_app;
grant insert, update, delete on
	app_private.curricula,
	app_private.historical_periods,
	app_private.topics,
	app_private.exam_sessions,
	app_private.tasks,
	app_private.task_versions,
	app_private.task_version_topics,
	app_private.assets,
	app_private.sources,
	app_private.questions,
	app_private.assessment_attempts,
	app_private.attempt_tasks,
	app_private.attempt_answers,
	app_private.grading_runs
to abipro_app;
grant update (display_name, updated_at) on app_private.profiles to abipro_app;
grant usage, select on all sequences in schema app_private to abipro_app;
--> statement-breakpoint

alter default privileges in schema app_private revoke all on tables from public, anon, authenticated;
alter default privileges in schema app_private revoke all on sequences from public, anon, authenticated;
--> statement-breakpoint

create or replace function app_private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
	insert into app_private.profiles (id, display_name)
	values (new.id, nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''))
	on conflict (id) do nothing;
	return new;
end;
$$;

revoke all on function app_private.handle_new_auth_user() from public, anon, authenticated;
--> statement-breakpoint

create trigger on_auth_user_created
	after insert on auth.users
	for each row execute function app_private.handle_new_auth_user();
--> statement-breakpoint

create or replace function app_private.handle_deleted_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
	delete from app_private.profiles where id = old.id;
	return old;
end;
$$;

revoke all on function app_private.handle_deleted_auth_user() from public, anon, authenticated;
--> statement-breakpoint

create trigger on_auth_user_deleted
	after delete on auth.users
	for each row execute function app_private.handle_deleted_auth_user();
--> statement-breakpoint

create or replace function app_private.protect_task_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	if tg_op = 'DELETE' then
		if old.status <> 'draft' then
			raise exception 'Published or retired task versions are immutable';
		end if;
		return old;
	end if;

	if old.status = 'draft' then
		return new;
	end if;

	if old.status = 'published'
		and new.status = 'retired'
		and (to_jsonb(new) - array['status', 'updated_at']) = (to_jsonb(old) - array['status', 'updated_at']) then
		return new;
	end if;

	raise exception 'Published or retired task versions are immutable';
end;
$$;

create trigger protect_task_version
	before update or delete on app_private.task_versions
	for each row execute function app_private.protect_task_version();
--> statement-breakpoint

create or replace function app_private.protect_task_version_child()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
	version_id bigint;
	version_status app_private.task_version_status;
begin
	version_id = case when tg_op = 'DELETE' then old.task_version_id else new.task_version_id end;
	select status into version_status from app_private.task_versions where id = version_id;
	if version_status is distinct from 'draft' then
		raise exception 'Content belonging to a published or retired task version is immutable';
	end if;
	return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger protect_source_version before insert or update or delete on app_private.sources
	for each row execute function app_private.protect_task_version_child();
create trigger protect_question_version before insert or update or delete on app_private.questions
	for each row execute function app_private.protect_task_version_child();
create trigger protect_topic_version before insert or update or delete on app_private.task_version_topics
	for each row execute function app_private.protect_task_version_child();
--> statement-breakpoint

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;
--> statement-breakpoint

do $$
declare
	table_name text;
begin
	foreach table_name in array array[
		'profiles', 'curricula', 'historical_periods', 'topics', 'exam_sessions',
		'tasks', 'task_versions', 'assets', 'sources', 'questions',
		'assessment_attempts', 'attempt_answers'
	]
	loop
		execute format(
			'create trigger set_updated_at before update on app_private.%I for each row execute function app_private.set_updated_at()',
			table_name
		);
	end loop;
end
$$;
--> statement-breakpoint

insert into app_private.curricula (code, name)
values
	('NAT_2007', 'NAT 2007'),
	('NAT_2012', 'NAT 2012'),
	('NAT_2020', 'NAT 2020')
on conflict (code) do update set name = excluded.name;
--> statement-breakpoint

insert into storage.buckets (id, name, public, file_size_limit)
values ('exam-assets', 'exam-assets', false, 10485760)
on conflict (id) do update
set name = excluded.name,
	public = false,
	file_size_limit = excluded.file_size_limit;
