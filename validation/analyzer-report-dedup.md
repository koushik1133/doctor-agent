# Analyzer validation — MTSamples

Run: 2026-11-25T14:49:48.848Z · engine: rules (offline) · split: dedup · reports evaluated: 455

| Specialty label | Reports | Top-1 | Top-3 | No finding |
|---|---:|---:|---:|---:|
| Cardiovascular / Pulmonary | 99 | 72.7% | 81.8% | 7.1% |
| Orthopedic | 68 | 66.2% | 77.9% | 11.8% |
| Gastroenterology | 48 | 68.8% | 85.4% | 6.3% |
| Neurology | 47 | 66.0% | 83.0% | 4.3% |
| Urology | 33 | 69.7% | 78.8% | 6.1% |
| Obstetrics / Gynecology | 30 | 76.7% | 90.0% | 3.3% |
| ENT - Otolaryngology | 23 | 91.3% | 100.0% | 0.0% |
| Nephrology | 22 | 40.9% | 54.5% | 4.5% |
| Ophthalmology | 18 | 88.9% | 88.9% | 11.1% |
| Psychiatry / Psychology | 16 | 68.8% | 81.3% | 6.3% |
| Hematology - Oncology | 14 | 42.9% | 78.6% | 7.1% |
| Neurosurgery | 12 | 75.0% | 91.7% | 8.3% |
| Dermatology | 11 | 36.4% | 63.6% | 18.2% |
| Sleep Medicine | 5 | 80.0% | 100.0% | 0.0% |
| Rheumatology | 4 | 75.0% | 75.0% | 25.0% |
| Endocrinology | 3 | 0.0% | 66.7% | 0.0% |
| Allergy / Immunology | 2 | 50.0% | 50.0% | 0.0% |
| **All** | **455** | **68.4%** | **81.5%** | 7.0% |

Top-3 among reports where the analyzer found anything: **87.7%**

## Sample misses
- **Urology** → got cardiology, obgyn, ent (conditions: Ear infection / otitis; Peripheral artery disease; Pregnancy / delivery)
- **Urology** → got general_surgery, cardiology (conditions: Hernia)
- **Urology** → got general_surgery, allergy (conditions: Hernia; Allergies)
- **Urology** → got pulmonology (conditions: Asthma)
- **Urology** → got obgyn (conditions: Pregnancy / delivery)
- **Psychiatry / Psychology** → got gastroenterology, cardiology, neurology (conditions: Essential hypertension; Gastro-esophageal reflux disease; Chronic viral hepatitis; Cirrhosis of liver)
- **Psychiatry / Psychology** → got pulmonology, neurology, nephrology (conditions: Asthma; Chronic headache)
- **Orthopedic** → got cardiology, hematology (conditions: Blood clot (DVT/PE); History of heart attack)
- **Orthopedic** → got oncology, dermatology (conditions: Mass or tumor under evaluation)
- **Orthopedic** → got neurology (conditions: Peripheral neuropathy)
- **Orthopedic** → got neurology (conditions: Essential hypertension; Multiple sclerosis)
- **Orthopedic** → got cardiology, nephrology, pulmonology (conditions: Coronary artery disease; Atrial fibrillation; Heart failure; Angina / chest pain)
- **Orthopedic** → got neurology (conditions: Weakness / neurological deficit)
- **Orthopedic** → got cardiology, endocrinology (conditions: Peripheral artery disease; Thyroid disorder)
- **Obstetrics / Gynecology** → got oncology, cardiology, pulmonology (conditions: Angina / chest pain; Essential hypertension; Peripheral neuropathy; Breast cancer)
- **Obstetrics / Gynecology** → got primary_care (conditions: Breast cancer)
- **Neurology** → got psychiatry, pulmonology (conditions: COPD; Schizophrenia / psychosis)
- **Neurology** → got cardiology, ent, orthopedics (conditions: Coronary artery disease; Essential hypertension; Hyperlipidemia; Hearing loss)
- **Neurology** → got orthopedics (conditions: Neck, back or limb pain)
- **Neurology** → got pulmonology (conditions: Pneumonia / lung infection)
- **Neurology** → got ophthalmology, rheumatology, endocrinology (conditions: Coronary artery disease; Gout; Eye condition; Mass or tumor under evaluation)
- **Neurology** → got infectious_disease, orthopedics, ent (conditions: Essential hypertension; Hyperlipidemia; Asthma; Breast cancer)
- **Nephrology** → got hematology, urology (conditions: Blood clot (DVT/PE))
- **Nephrology** → got endocrinology, oncology, urology (conditions: Malignant neoplasm; Thyroid disorder)
- **Nephrology** → got hematology, cardiology, oncology (conditions: Essential hypertension; Chronic kidney disease; Malignant neoplasm; Blood clot (DVT/PE))
