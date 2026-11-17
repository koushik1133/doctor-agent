# Analyzer validation — MTSamples

Run: 2026-11-17T15:52:02.576Z · engine: rules (offline) · split: tune · reports evaluated: 1032

| Specialty label | Reports | Top-1 | Top-3 | No finding |
|---|---:|---:|---:|---:|
| Cardiovascular / Pulmonary | 184 | 74.5% | 82.1% | 11.4% |
| Orthopedic | 176 | 58.5% | 70.5% | 17.6% |
| Neurology | 113 | 53.1% | 73.5% | 7.1% |
| Gastroenterology | 111 | 61.3% | 81.1% | 9.9% |
| Urology | 79 | 67.1% | 74.7% | 8.9% |
| Obstetrics / Gynecology | 78 | 74.4% | 82.1% | 10.3% |
| ENT - Otolaryngology | 48 | 56.3% | 68.8% | 12.5% |
| Neurosurgery | 47 | 74.5% | 91.5% | 2.1% |
| Hematology - Oncology | 46 | 65.2% | 80.4% | 10.9% |
| Ophthalmology | 42 | 71.4% | 71.4% | 23.8% |
| Nephrology | 39 | 20.5% | 41.0% | 5.1% |
| Psychiatry / Psychology | 27 | 55.6% | 66.7% | 11.1% |
| Dermatology | 14 | 42.9% | 71.4% | 14.3% |
| Sleep Medicine | 11 | 90.9% | 90.9% | 9.1% |
| Endocrinology | 9 | 55.6% | 88.9% | 11.1% |
| Allergy / Immunology | 4 | 25.0% | 100.0% | 0.0% |
| Rheumatology | 4 | 50.0% | 75.0% | 0.0% |
| **All** | **1032** | **62.8%** | **75.9%** | 11.3% |

Top-3 among reports where the analyzer found anything: **85.6%**

## Sample misses
- **Urology** → got oncology (conditions: Mass or tumor under evaluation)
- **Urology** → got cardiology, allergy, ent (conditions: Essential hypertension; Allergies)
- **Urology** → got gastroenterology (conditions: Abdominal / bowel symptoms)
- **Urology** → got hematology (conditions: Blood clot (DVT/PE))
- **Urology** → got general_surgery (conditions: Hernia)
- **Urology** → got general_surgery (conditions: Hernia)
- **Urology** → got general_surgery (conditions: Hernia)
- **Urology** → got oncology, hematology, dermatology (conditions: Malignant neoplasm; Blood clot (DVT/PE); Skin condition)
- **Urology** → got obgyn, oncology (conditions: Malignant neoplasm; Pregnancy; Uterine fibroids; Mass or tumor under evaluation)
- **Urology** → got cardiology, allergy, dermatology (conditions: Angina / chest pain; Essential hypertension; Benign prostatic hyperplasia; Allergic rhinitis)
- **Urology** → got psychiatry, allergy (conditions: ADHD; Allergies)
- **Urology** → got cardiology, endocrinology, pulmonology (conditions: Angina / chest pain; Asthma; Gout; Skin condition)
- **Urology** → got general_surgery, endocrinology, oncology (conditions: Hernia; Mass or tumor under evaluation; Thyroid disorder)
- **Rheumatology** → got neurology, nephrology, orthopedics (conditions: Epilepsy / seizures; End-stage renal disease; Joint / tendon injury)
- **Psychiatry / Psychology** → got nephrology, endocrinology, hematology (conditions: Anemia; End-stage renal disease; Thyroid disorder)
- **Psychiatry / Psychology** → got obgyn, neurology (conditions: Epilepsy / seizures; Pregnancy; Pregnancy / delivery)
- **Psychiatry / Psychology** → got neurology, cardiology, urology (conditions: Coronary artery disease; Essential hypertension; Hyperlipidemia; Epilepsy / seizures)
- **Psychiatry / Psychology** → got neurology (conditions: Dementia / memory loss)
- **Psychiatry / Psychology** → got neurology (conditions: Weakness / neurological deficit)
- **Psychiatry / Psychology** → got orthopedics, allergy, neurology (conditions: Fracture; Weakness / neurological deficit; Allergies)
- **Orthopedic** → got rheumatology (conditions: Gout)
- **Orthopedic** → got allergy (conditions: Allergies)
- **Orthopedic** → got hematology (conditions: Blood clot (DVT/PE))
- **Orthopedic** → got oncology, psychiatry, neurology (conditions: Peripheral neuropathy; Lung cancer; Major depressive disorder; Mass or tumor under evaluation)
- **Orthopedic** → got cardiology, pulmonology, psychiatry (conditions: Coronary artery disease; Essential hypertension; COPD; Anxiety disorder)
