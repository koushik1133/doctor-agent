# Analyzer validation — MTSamples

Run: 2026-11-17T15:52:10.526Z · engine: rules (offline) · split: holdout · reports evaluated: 1025

| Specialty label | Reports | Top-1 | Top-3 | No finding |
|---|---:|---:|---:|---:|
| Cardiovascular / Pulmonary | 185 | 73.0% | 80.5% | 8.6% |
| Orthopedic | 175 | 56.0% | 66.3% | 16.6% |
| Gastroenterology | 111 | 66.7% | 79.3% | 13.5% |
| Neurology | 110 | 53.6% | 71.8% | 8.2% |
| Obstetrics / Gynecology | 77 | 71.4% | 81.8% | 3.9% |
| Urology | 76 | 67.1% | 76.3% | 7.9% |
| ENT - Otolaryngology | 48 | 79.2% | 87.5% | 6.3% |
| Neurosurgery | 47 | 68.1% | 87.2% | 8.5% |
| Hematology - Oncology | 44 | 63.6% | 81.8% | 4.5% |
| Nephrology | 42 | 42.9% | 54.8% | 2.4% |
| Ophthalmology | 41 | 63.4% | 63.4% | 17.1% |
| Psychiatry / Psychology | 26 | 73.1% | 84.6% | 3.8% |
| Dermatology | 15 | 46.7% | 66.7% | 26.7% |
| Endocrinology | 10 | 40.0% | 90.0% | 0.0% |
| Sleep Medicine | 9 | 88.9% | 100.0% | 0.0% |
| Rheumatology | 6 | 50.0% | 50.0% | 16.7% |
| Allergy / Immunology | 3 | 33.3% | 66.7% | 0.0% |
| **All** | **1025** | **64.0%** | **75.7%** | 9.9% |

Top-3 among reports where the analyzer found anything: **84.0%**

## Sample misses
- **Urology** → got general_surgery (conditions: Hernia)
- **Urology** → got general_surgery (conditions: Hernia)
- **Urology** → got allergy (conditions: Allergies)
- **Urology** → got cardiology, obgyn, ent (conditions: Ear infection / otitis; Peripheral artery disease; Pregnancy / delivery)
- **Urology** → got general_surgery, cardiology (conditions: Hernia)
- **Urology** → got general_surgery (conditions: Hernia)
- **Urology** → got general_surgery (conditions: Hernia)
- **Urology** → got general_surgery (conditions: Hernia)
- **Urology** → got general_surgery, allergy (conditions: Hernia; Allergies)
- **Urology** → got general_surgery (conditions: Hernia)
- **Urology** → got pulmonology (conditions: Asthma)
- **Urology** → got obgyn (conditions: Pregnancy / delivery)
- **Rheumatology** → got allergy, obgyn, orthopedics (conditions: Psoriasis; Pregnancy; Allergic rhinitis; Joint / tendon injury)
- **Rheumatology** → got cardiology, hematology, neurology (conditions: Coronary artery disease; Heart failure; Essential hypertension; COPD)
- **Psychiatry / Psychology** → got gastroenterology, cardiology, neurology (conditions: Essential hypertension; Gastro-esophageal reflux disease; Chronic viral hepatitis; Cirrhosis of liver)
- **Psychiatry / Psychology** → got pulmonology, neurology, nephrology (conditions: Asthma; Chronic headache)
- **Psychiatry / Psychology** → got obgyn, neurology, oncology (conditions: Pregnancy; Weakness / neurological deficit; Pneumonia / lung infection; Pregnancy / delivery)
- **Orthopedic** → got dermatology (conditions: Skin condition)
- **Orthopedic** → got cardiology, hematology (conditions: Blood clot (DVT/PE); History of heart attack)
- **Orthopedic** → got oncology, dermatology (conditions: Mass or tumor under evaluation)
- **Orthopedic** → got cardiology (conditions: Peripheral artery disease)
- **Orthopedic** → got psychiatry, neurology (conditions: Major depressive disorder; Anxiety disorder)
- **Orthopedic** → got cardiology, psychiatry, neurology (conditions: Essential hypertension; Hyperlipidemia; Epilepsy / seizures; Low back pain / disc disease)
- **Orthopedic** → got allergy (conditions: Allergies)
- **Orthopedic** → got neurology (conditions: Peripheral neuropathy)
