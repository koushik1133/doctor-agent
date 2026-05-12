-- Doctor Agent — schema
-- Run this in Supabase SQL editor once, then run seed.sql.

create extension if not exists vector;

create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  date_of_birth date not null,
  phone text,
  created_at timestamptz default now()
);

-- Free-form clinical records (visit notes, prescriptions, lab results, etc.)
create table if not exists records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  kind text not null,           -- 'visit_note' | 'prescription' | 'lab' | 'transcript' | 'other'
  title text not null,
  body text not null,
  created_at timestamptz default now()
);

-- Calls = one phone/web session
create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete set null,
  started_at timestamptz default now(),
  ended_at timestamptz,
  urgency text,                 -- 'emergency' | 'urgent' | 'routine' | 'info' | null
  escalated boolean default false,
  summary text
);

-- One row per turn (user or assistant)
create table if not exists messages (
  id bigserial primary key,
  call_id uuid not null references calls(id) on delete cascade,
  role text not null,           -- 'user' | 'assistant' | 'system'
  content text not null,
  created_at timestamptz default now()
);

create index if not exists idx_records_patient on records(patient_id);
create index if not exists idx_messages_call on messages(call_id);
create index if not exists idx_calls_patient on calls(patient_id);
