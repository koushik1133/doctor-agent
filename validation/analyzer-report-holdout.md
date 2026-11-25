# Analyzer validation — MTSamples

Run: 2026-11-25T14:49:46.314Z · engine: rules (offline) · split: holdout · reports evaluated: 1025

| Specialty label | Reports | Top-1 | Top-3 | No finding |
|---|---:|---:|---:|---:|
| Cardiovascular / Pulmonary | 185 | 72.4% | 80.5% | 8.1% |
| Orthopedic | 175 | 64.6% | 76.6% | 10.9% |
| Gastroenterology | 111 | 65.8% | 79.3% | 11.7% |
| Neurology | 110 | 58.2% | 78.2% | 7.3% |
| Obstetrics / Gynecology | 77 | 70.1% | 81.8% | 3.9% |
| Urology | 76 | 67.1% | 76.3% | 7.9% |
| ENT - Otolaryngology | 48 | 79.2% | 87.5% | 6.3% |
| Neurosurgery | 47 | 70.2% | 87.2% | 8.5% |
| Hematology - Oncology | 44 | 61.4% | 81.8% | 4.5% |
| Nephrology | 42 | 40.5% | 54.8% | 2.4% |
| Ophthalmology | 41 | 63.4% | 63.4% | 17.1% |
| Psychiatry / Psychology | 26 | 73.1% | 84.6% | 3.8% |
| Dermatology | 15 | 46.7% | 66.7% | 20.0% |
| Endocrinology | 10 | 40.0% | 90.0% | 0.0% |
| Sleep Medicine | 9 | 88.9% | 100.0% | 0.0% |
| Rheumatology | 6 | 50.0% | 50.0% | 16.7% |
| Allergy / Immunology | 3 | 33.3% | 66.7% | 0.0% |
| **All** | **1025** | **65.6%** | **78.1%** | 8.4% |

Top-3 among reports where the analyzer found anything: **85.3%**

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
- **Rheumatology** → got cardiology, neurology, hematology (conditions: Coronary artery disease; Heart failure; Essential hypertension; COPD)
- **Psychiatry / Psychology** → got gastroenterology, cardiology, neurology (conditions: Essential hypertension; Gastro-esophageal reflux disease; Chronic viral hepatitis; Cirrhosis of liver)
- **Psychiatry / Psychology** → got pulmonology, neurology, nephrology (conditions: Asthma; Chronic headache)
- **Psychiatry / Psychology** → got obgyn, neurology, oncology (conditions: Pregnancy; Weakness / neurological deficit; Pneumonia / lung infection; Pregnancy / delivery)
- **Orthopedic** → got cardiology, hematology (conditions: Blood clot (DVT/PE); History of heart attack)
- **Orthopedic** → got oncology, dermatology (conditions: Mass or tumor under evaluation)
- **Orthopedic** → got psychiatry, neurology (conditions: Major depressive disorder; Anxiety disorder; Gait or movement problem)
- **Orthopedic** → got neurology, cardiology, psychiatry (conditions: Essential hypertension; Hyperlipidemia; Epilepsy / seizures; Low back pain / disc disease)
- **Orthopedic** → got allergy (conditions: Allergies)
- **Orthopedic** → got neurology (conditions: Peripheral neuropathy)
- **Orthopedic** → got neurology (conditions: )
- **Orthopedic** → got endocrinology (conditions: Osteoporosis)
