-- Mock patients for demo. Run after schema.sql.

insert into patients (id, full_name, date_of_birth, phone) values
  ('11111111-1111-1111-1111-111111111111', 'Koushik Sharma',  '1995-03-12', '+1-555-0101'),
  ('22222222-2222-2222-2222-222222222222', 'Anita Reddy',     '1962-08-04', '+1-555-0102'),
  ('33333333-3333-3333-3333-333333333333', 'Marcus Chen',     '1978-11-22', '+1-555-0103')
on conflict (id) do nothing;

-- Patient 1: Type 2 diabetic, on metformin. Asks about alcohol.
insert into records (patient_id, kind, title, body) values
('11111111-1111-1111-1111-111111111111', 'visit_note', 'Annual physical 2026-02-14',
'Patient is a 31 y/o male with Type 2 diabetes diagnosed 2023. HbA1c 7.1 (improved from 7.8). BMI 28. BP 128/82. No retinopathy or neuropathy noted. Liver enzymes mildly elevated (ALT 48). Counseled on diet and alcohol moderation. Continues metformin 1000mg BID.'),
('11111111-1111-1111-1111-111111111111', 'prescription', 'Current medications',
'1. Metformin 1000mg twice daily with meals. 2. Atorvastatin 20mg nightly. 3. Vitamin D3 2000 IU daily. NKDA.'),
('11111111-1111-1111-1111-111111111111', 'lab', 'Labs 2026-02-14',
'HbA1c 7.1%. Fasting glucose 132. ALT 48 (mildly elevated). AST 36. eGFR 92. LDL 118.');

-- Patient 2: Hypertension + recent cardiac workup. Will trigger emergency on chest pain.
insert into records (patient_id, kind, title, body) values
('22222222-2222-2222-2222-222222222222', 'visit_note', 'Cardiology follow-up 2026-04-02',
'63 y/o female with HTN x15 years, hyperlipidemia, family h/o CAD (father MI age 58). Recent stress echo showed mild apical wall motion abnormality — cardiology recommended outpatient cath if any anginal symptoms. Currently asymptomatic. BP 142/88 on lisinopril 20mg.'),
('22222222-2222-2222-2222-222222222222', 'prescription', 'Current medications',
'1. Lisinopril 20mg daily. 2. Atorvastatin 40mg nightly. 3. Aspirin 81mg daily. 4. Metoprolol 25mg BID.'),
('22222222-2222-2222-2222-222222222222', 'transcript', 'Phone call 2026-03-10',
'Patient called reporting brief lightheadedness on standing. Reviewed meds — likely orthostatic from lisinopril/metoprolol combo. Advised to rise slowly, hydrate, call back if recurs or any chest discomfort.');

-- Patient 3: Post-op appendectomy, asks about wound care.
insert into records (patient_id, kind, title, body) values
('33333333-3333-3333-3333-333333333333', 'visit_note', 'Post-op day 5 follow-up 2026-05-08',
'47 y/o male, POD#5 from laparoscopic appendectomy. Three port site incisions healing well, no erythema or drainage. Steri-strips intact. Tolerating regular diet. Pain controlled with ibuprofen. Cleared for light activity. Return precautions reviewed: fever >101, increasing redness, drainage, severe pain.'),
('33333333-3333-3333-3333-333333333333', 'prescription', 'Discharge medications',
'1. Ibuprofen 600mg q6h PRN pain. 2. Docusate 100mg BID PRN constipation. NKDA.');
