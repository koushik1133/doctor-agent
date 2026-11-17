import type { SpecialtyId } from "../specialties";

// Curated condition lexicon. Patterns are matched case-insensitively against
// sentences in the uploaded document. ICD-10 codes are validated live against
// the NLM ICD-10-CM table at analysis time.

export type ConditionRule = {
  id: string;
  name: string;
  icd10: string;
  specialty: SpecialtyId;
  patterns: RegExp[];
  weight: number; // how strongly this drives a specialist referral (0–1)
};

const r = (s: string) => new RegExp(`\\b(?:${s})\\b`, "i");

export const CONDITIONS: ConditionRule[] = [
  // Cardiology
  { id: "cad", name: "Coronary artery disease", icd10: "I25.10", specialty: "cardiology", weight: 1, patterns: [r("coronary artery disease|CAD|ischemic heart disease|wall motion abnormality")] },
  { id: "afib", name: "Atrial fibrillation", icd10: "I48.91", specialty: "cardiology", weight: 1, patterns: [r("atrial fibrillation|a\\.? ?fib|AF with RVR")] },
  { id: "hf", name: "Heart failure", icd10: "I50.9", specialty: "cardiology", weight: 1, patterns: [r("heart failure|CHF|HFrEF|HFpEF|reduced ejection fraction|cardiomyopathy")] },
  { id: "angina", name: "Angina / chest pain", icd10: "I20.9", specialty: "cardiology", weight: 0.9, patterns: [r("angina|anginal|chest (?:pain|pressure|tightness)")] },
  { id: "htn", name: "Essential hypertension", icd10: "I10", specialty: "cardiology", weight: 0.45, patterns: [r("hypertension|HTN|high blood pressure")] },
  { id: "valve", name: "Heart valve disease", icd10: "I35.0", specialty: "cardiology", weight: 1, patterns: [r("aortic stenosis|mitral regurgitation|valvular disease|heart murmur")] },
  { id: "hld", name: "Hyperlipidemia", icd10: "E78.5", specialty: "cardiology", weight: 0.3, patterns: [r("hyperlipidemia|dyslipidemia|high cholesterol|hypercholesterolemia")] },

  // Endocrinology
  { id: "t2dm", name: "Type 2 diabetes mellitus", icd10: "E11.9", specialty: "endocrinology", weight: 0.85, patterns: [r("type 2 diabetes|type II diabetes|T2DM|diabetes mellitus,? type 2|DM2|NIDDM")] },
  { id: "t1dm", name: "Type 1 diabetes mellitus", icd10: "E10.9", specialty: "endocrinology", weight: 1, patterns: [r("type 1 diabetes|type I diabetes|T1DM|juvenile diabetes")] },
  { id: "prediabetes", name: "Prediabetes", icd10: "R73.03", specialty: "endocrinology", weight: 0.4, patterns: [r("prediabetes|pre-diabetes|impaired fasting glucose")] },
  { id: "hypothyroid", name: "Hypothyroidism", icd10: "E03.9", specialty: "endocrinology", weight: 0.7, patterns: [r("hypothyroidism|hashimoto'?s?|underactive thyroid")] },
  { id: "hyperthyroid", name: "Hyperthyroidism", icd10: "E05.90", specialty: "endocrinology", weight: 0.9, patterns: [r("hyperthyroidism|graves'? disease|overactive thyroid")] },
  { id: "thyroid_nodule", name: "Thyroid nodule", icd10: "E04.1", specialty: "endocrinology", weight: 0.9, patterns: [r("thyroid nodule|nodular goiter")] },
  { id: "osteoporosis", name: "Osteoporosis", icd10: "M81.0", specialty: "endocrinology", weight: 0.6, patterns: [r("osteoporosis|osteopenia")] },

  // GI / liver
  { id: "gerd", name: "Gastro-esophageal reflux disease", icd10: "K21.9", specialty: "gastroenterology", weight: 0.6, patterns: [r("GERD|acid reflux|gastroesophageal reflux")] },
  { id: "ibd", name: "Inflammatory bowel disease", icd10: "K50.90", specialty: "gastroenterology", weight: 1, patterns: [r("crohn'?s(?: disease)?|ulcerative colitis|inflammatory bowel disease|IBD")] },
  { id: "ibs", name: "Irritable bowel syndrome", icd10: "K58.9", specialty: "gastroenterology", weight: 0.6, patterns: [r("irritable bowel|IBS")] },
  { id: "nafld", name: "Fatty liver disease", icd10: "K76.0", specialty: "gastroenterology", weight: 0.8, patterns: [r("fatty liver|NAFLD|MASLD|hepatic steatosis|NASH")] },
  { id: "hepatitis", name: "Chronic viral hepatitis", icd10: "B18.9", specialty: "gastroenterology", weight: 1, patterns: [r("hepatitis [BC]|HCV|HBV|chronic hepatitis")] },
  { id: "cirrhosis", name: "Cirrhosis of liver", icd10: "K74.60", specialty: "gastroenterology", weight: 1, patterns: [r("cirrhosis")] },
  { id: "gi_bleed", name: "GI bleeding", icd10: "K92.2", specialty: "gastroenterology", weight: 1, patterns: [r("GI bleed|melena|hematochezia|rectal bleeding|blood in (?:the )?stool")] },
  { id: "colon_polyp", name: "Colon polyp", icd10: "K63.5", specialty: "gastroenterology", weight: 0.8, patterns: [r("colon polyps?|adenomatous polyps?|polyp of colon")] },

  // Kidney / urology
  { id: "ckd", name: "Chronic kidney disease", icd10: "N18.9", specialty: "nephrology", weight: 0.7, patterns: [r("chronic kidney disease|CKD(?: stage)?|renal insufficiency|diabetic nephropathy")] },
  { id: "kidney_stone", name: "Kidney stone", icd10: "N20.0", specialty: "urology", weight: 0.9, patterns: [r("kidney stones?|nephrolithiasis|renal calcul(?:us|i)|ureteral stone")] },
  { id: "bph", name: "Benign prostatic hyperplasia", icd10: "N40.0", specialty: "urology", weight: 0.8, patterns: [r("BPH|benign prostatic hyperplasia|enlarged prostate")] },
  { id: "hematuria", name: "Hematuria", icd10: "R31.9", specialty: "urology", weight: 0.8, patterns: [r("hematuria|blood in (?:the )?urine")] },

  // Lungs
  { id: "asthma", name: "Asthma", icd10: "J45.909", specialty: "pulmonology", weight: 0.7, patterns: [r("asthma")] },
  { id: "copd", name: "COPD", icd10: "J44.9", specialty: "pulmonology", weight: 1, patterns: [r("COPD|chronic obstructive pulmonary|emphysema|chronic bronchitis")] },
  { id: "osa", name: "Obstructive sleep apnea", icd10: "G47.33", specialty: "pulmonology", weight: 0.8, patterns: [r("sleep apnea|OSA")] },
  { id: "lung_nodule", name: "Lung nodule", icd10: "R91.1", specialty: "pulmonology", weight: 1, patterns: [r("(?:lung|pulmonary) nodule|solitary nodule")] },

  // Neuro
  { id: "migraine", name: "Migraine", icd10: "G43.909", specialty: "neurology", weight: 0.7, patterns: [r("migraines?")] },
  { id: "epilepsy", name: "Epilepsy / seizures", icd10: "G40.909", specialty: "neurology", weight: 1, patterns: [r("epilepsy|seizures?|convulsions?")] },
  { id: "parkinsons", name: "Parkinson's disease", icd10: "G20.A1", specialty: "neurology", weight: 1, patterns: [r("parkinson'?s(?: disease)?")] },
  { id: "ms", name: "Multiple sclerosis", icd10: "G35.D", specialty: "neurology", weight: 1, patterns: [r("multiple sclerosis")] },
  { id: "neuropathy", name: "Peripheral neuropathy", icd10: "G62.9", specialty: "neurology", weight: 0.7, patterns: [r("(?:peripheral )?neuropathy|numbness and tingling")] },
  { id: "stroke_hx", name: "History of stroke / TIA", icd10: "Z86.73", specialty: "neurology", weight: 0.9, patterns: [r("history of stroke|prior stroke|TIA|transient ischemic attack|CVA")] },
  { id: "dementia", name: "Dementia / memory loss", icd10: "F03.90", specialty: "neurology", weight: 0.9, patterns: [r("dementia|alzheimer'?s|memory loss|cognitive decline")] },

  // Oncology / hematology
  { id: "breast_ca", name: "Breast cancer", icd10: "C50.919", specialty: "oncology", weight: 1, patterns: [r("breast cancer|ductal carcinoma|breast carcinoma|BI-?RADS [45]")] },
  { id: "lung_ca", name: "Lung cancer", icd10: "C34.90", specialty: "oncology", weight: 1, patterns: [r("lung cancer|non-small cell|NSCLC|small cell carcinoma")] },
  { id: "prostate_ca", name: "Prostate cancer", icd10: "C61", specialty: "urology", weight: 1, patterns: [r("prostate cancer|prostate adenocarcinoma|gleason")] },
  { id: "colon_ca", name: "Colorectal cancer", icd10: "C18.9", specialty: "oncology", weight: 1, patterns: [r("colon cancer|colorectal cancer|rectal cancer|colonic adenocarcinoma")] },
  { id: "lymphoma", name: "Lymphoma", icd10: "C85.90", specialty: "oncology", weight: 1, patterns: [r("lymphoma")] },
  { id: "leukemia", name: "Leukemia", icd10: "C95.90", specialty: "oncology", weight: 1, patterns: [r("leukemia")] },
  { id: "malignancy", name: "Malignant neoplasm", icd10: "C80.1", specialty: "oncology", weight: 1, patterns: [r("malignan(?:t|cy)|metasta(?:sis|tic)|carcinoma")] },
  { id: "anemia", name: "Anemia", icd10: "D64.9", specialty: "hematology", weight: 0.6, patterns: [r("anemia|anaemia")] },
  { id: "dvt", name: "Blood clot (DVT/PE)", icd10: "I82.409", specialty: "hematology", weight: 0.9, patterns: [r("deep vein thrombosis|DVT|pulmonary embolism|blood clot")] },

  // Musculoskeletal
  { id: "oa_knee", name: "Osteoarthritis of knee", icd10: "M17.9", specialty: "orthopedics", weight: 1, patterns: [r("(?:osteo)?arthritis (?:of the |of |in (?:the |my )?)?(?:right |left |bilateral )?knees?|knee (?:osteo)?arthritis|knee pain")] },
  { id: "oa_hip", name: "Osteoarthritis of hip", icd10: "M16.9", specialty: "orthopedics", weight: 1, patterns: [r("(?:osteo)?arthritis (?:of the |of )?(?:right |left )?hips?|hip (?:osteo)?arthritis|hip pain")] },
  { id: "acl", name: "Knee ligament / meniscus tear", icd10: "S83.209A", specialty: "orthopedics", weight: 1, patterns: [r("ACL tear|meniscus tear|meniscal tear|torn meniscus|ligament tear")] },
  { id: "rotator", name: "Rotator cuff tear", icd10: "M75.100", specialty: "orthopedics", weight: 1, patterns: [r("rotator cuff")] },
  { id: "fracture", name: "Fracture", icd10: "T14.8XXA", specialty: "orthopedics", weight: 1, patterns: [r("fracture[ds]?|broken bone")] },
  { id: "back", name: "Low back pain / disc disease", icd10: "M54.50", specialty: "orthopedics", weight: 0.7, patterns: [r("herniated disc|disc herniation|lumbar radiculopathy|sciatica|spinal stenosis|low back pain|degenerative disc")] },
  { id: "ra", name: "Rheumatoid arthritis", icd10: "M06.9", specialty: "rheumatology", weight: 1, patterns: [r("rheumatoid arthritis|\\bRA\\b|inflammatory arthritis")] },
  { id: "lupus", name: "Systemic lupus erythematosus", icd10: "M32.9", specialty: "rheumatology", weight: 1, patterns: [r("lupus|SLE")] },
  { id: "gout", name: "Gout", icd10: "M10.9", specialty: "rheumatology", weight: 0.8, patterns: [r("gout|gouty")] },

  // Skin
  { id: "psoriasis", name: "Psoriasis", icd10: "L40.9", specialty: "dermatology", weight: 0.9, patterns: [r("psoriasis")] },
  { id: "eczema", name: "Atopic dermatitis", icd10: "L20.9", specialty: "dermatology", weight: 0.7, patterns: [r("eczema|atopic dermatitis")] },
  { id: "melanoma", name: "Melanoma / suspicious lesion", icd10: "D48.5", specialty: "dermatology", weight: 1, patterns: [r("melanoma|suspicious (?:mole|lesion)|atypical nevus|dysplastic nevus")] },
  { id: "acne", name: "Acne", icd10: "L70.9", specialty: "dermatology", weight: 0.5, patterns: [r("acne")] },

  // Mental health
  { id: "depression", name: "Major depressive disorder", icd10: "F32.A", specialty: "psychiatry", weight: 0.8, patterns: [r("depression|depressive disorder|MDD")] },
  { id: "schizophrenia", name: "Schizophrenia / psychosis", icd10: "F20.9", specialty: "psychiatry", weight: 1, patterns: [r("schizophreni[ac]|psychosis|psychotic|schizoaffective|hallucinations")] },
  { id: "ptsd", name: "PTSD", icd10: "F43.10", specialty: "psychiatry", weight: 0.9, patterns: [r("PTSD|post-?traumatic stress")] },
  { id: "substance", name: "Substance use disorder", icd10: "F19.10", specialty: "psychiatry", weight: 0.7, patterns: [r("substance abuse|alcohol dependence|alcohol abuse|opioid (?:use disorder|dependence)|polysubstance")] },
  { id: "anxiety", name: "Anxiety disorder", icd10: "F41.9", specialty: "psychiatry", weight: 0.7, patterns: [r("anxiety|generalized anxiety|GAD|panic disorder")] },
  { id: "bipolar", name: "Bipolar disorder", icd10: "F31.9", specialty: "psychiatry", weight: 1, patterns: [r("bipolar (?:disorder|affective|I{1,2}|depression)|manic depressi(?:on|ve)")] },
  { id: "adhd", name: "ADHD", icd10: "F90.9", specialty: "psychiatry", weight: 0.7, patterns: [r("ADHD|attention deficit")] },

  // Women's health
  { id: "pregnancy", name: "Pregnancy", icd10: "Z34.90", specialty: "obgyn", weight: 1, patterns: [r("pregnan(?:t|cy)|gestation|prenatal")] },
  { id: "pcos", name: "Polycystic ovary syndrome", icd10: "E28.2", specialty: "obgyn", weight: 0.9, patterns: [r("PCOS|polycystic ovar(?:y|ian)")] },
  { id: "endometriosis", name: "Endometriosis", icd10: "N80.9", specialty: "obgyn", weight: 1, patterns: [r("endometriosis")] },
  { id: "fibroids", name: "Uterine fibroids", icd10: "D25.9", specialty: "obgyn", weight: 0.9, patterns: [r("fibroids?|leiomyoma")] },

  // Eyes / ENT
  { id: "cataract", name: "Cataract", icd10: "H26.9", specialty: "ophthalmology", weight: 1, patterns: [r("cataracts?")] },
  { id: "glaucoma", name: "Glaucoma", icd10: "H40.9", specialty: "ophthalmology", weight: 1, patterns: [r("glaucoma")] },
  { id: "retinopathy", name: "Diabetic retinopathy", icd10: "E11.319", specialty: "ophthalmology", weight: 1, patterns: [r("(?:diabetic )?retinopathy|macular degeneration")] },
  { id: "sinusitis", name: "Chronic sinusitis", icd10: "J32.9", specialty: "ent", weight: 0.7, patterns: [r("chronic sinusitis|sinus infection|rhinosinusitis")] },
  { id: "hearing", name: "Hearing loss", icd10: "H91.90", specialty: "ent", weight: 0.8, patterns: [r("hearing loss|tinnitus")] },

  // Infectious / allergy
  { id: "hiv", name: "HIV disease", icd10: "B20", specialty: "infectious_disease", weight: 1, patterns: [r("HIV")] },
  { id: "allergy", name: "Allergic rhinitis", icd10: "J30.9", specialty: "allergy", weight: 0.5, patterns: [r("allergic rhinitis|seasonal allergies|hay fever")] },
  { id: "food_allergy", name: "Food allergy", icd10: "Z91.018", specialty: "allergy", weight: 0.8, patterns: [r("food allergy|peanut allergy|anaphylaxis to")] },

  // Surgery
  { id: "hernia", name: "Hernia", icd10: "K40.90", specialty: "general_surgery", weight: 0.8, patterns: [r("inguinal hernia|umbilical hernia|ventral hernia|incisional hernia")] },
  { id: "gallstones", name: "Gallstones", icd10: "K80.20", specialty: "general_surgery", weight: 0.9, patterns: [r("gallstones?|cholelithiasis|cholecystitis")] },
  { id: "appendicitis", name: "Appendicitis", icd10: "K37", specialty: "general_surgery", weight: 0.9, patterns: [r("appendicitis")] },

  // Added after MTSamples validation (tuned on the even-indexed half only).
  { id: "esrd", name: "End-stage renal disease", icd10: "N18.6", specialty: "nephrology", weight: 1, patterns: [r("ESRD|end-?stage renal|renal failure|kidney failure|acute kidney injury|AKI|proteinuria|nephrotic|glomerulonephritis|hemodialysis|peritoneal dialysis")] },
  { id: "uti", name: "Recurrent urinary tract infection", icd10: "N39.0", specialty: "urology", weight: 0.6, patterns: [r("urinary tract infections?|UTIs?|pyelonephritis|cystitis")] },
  { id: "incontinence", name: "Urinary incontinence / retention", icd10: "R32", specialty: "urology", weight: 0.9, patterns: [r("urinary incontinence|stress incontinence|urinary retention|overactive bladder|neurogenic bladder|urinary frequency")] },
  { id: "ed", name: "Erectile dysfunction", icd10: "N52.9", specialty: "urology", weight: 0.9, patterns: [r("erectile dysfunction|impotence")] },
  { id: "testicular", name: "Scrotal / testicular condition", icd10: "N50.9", specialty: "urology", weight: 0.9, patterns: [r("hydrocele|varicocele|testicular (?:pain|mass|torsion)|undescended testi(?:s|cle)|phimosis|epididymitis")] },
  { id: "bladder_ca", name: "Bladder cancer", icd10: "C67.9", specialty: "urology", weight: 1, patterns: [r("bladder (?:cancer|tumor|carcinoma)|transitional cell carcinoma|urothelial")] },
  { id: "otitis", name: "Ear infection / otitis", icd10: "H66.90", specialty: "ent", weight: 0.9, patterns: [r("otitis(?: media| externa)?|ear infections?|tympanic membrane perforation|cholesteatoma|eustachian tube")] },
  { id: "tonsil", name: "Tonsil / adenoid disease", icd10: "J35.9", specialty: "ent", weight: 0.9, patterns: [r("tonsillitis|adenotonsillar|tonsillar hypertrophy|adenoid hypertrophy|peritonsillar")] },
  { id: "nasal", name: "Nasal obstruction / deviated septum", icd10: "J34.2", specialty: "ent", weight: 0.9, patterns: [r("deviated (?:nasal )?septum|septal deviation|nasal obstruction|nasal polyps?|turbinate hypertrophy|epistaxis")] },
  { id: "dysphonia", name: "Voice / throat disorder", icd10: "R49.0", specialty: "ent", weight: 0.8, patterns: [r("hoarseness|dysphonia|vocal cord|laryngeal|thyroid mass")] },
  { id: "vertigo", name: "Vertigo", icd10: "R42", specialty: "ent", weight: 0.6, patterns: [r("vertigo|meniere'?s")] },
  { id: "headache", name: "Chronic headache", icd10: "R51.9", specialty: "neurology", weight: 0.6, patterns: [r("headaches?|cephalgia")] },
  { id: "carpal", name: "Carpal tunnel syndrome", icd10: "G56.00", specialty: "orthopedics", weight: 0.9, patterns: [r("carpal tunnel")] },
  { id: "neuro_def", name: "Weakness / neurological deficit", icd10: "R29.818", specialty: "neurology", weight: 0.7, patterns: [r("hemiparesis|hemiplegia|aphasia|ataxia|tremors?|syncope|encephalopathy|radiculopathy|myelopathy|cerebral aneurysm|subdural hematoma|intracranial hemorrhage|brain tumor|meningioma|glioma|hydrocephalus")] },
  { id: "arrhythmia", name: "Arrhythmia", icd10: "I49.9", specialty: "cardiology", weight: 0.9, patterns: [r("arrhythmia|bradycardia|tachycardia|palpitations|heart block|sick sinus|ventricular tachycardia|SVT")] },
  { id: "mi", name: "History of heart attack", icd10: "I25.2", specialty: "cardiology", weight: 1, patterns: [r("myocardial infarction|heart attack|NSTEMI|coronary stenosis|ejection fraction")] },
  { id: "pad", name: "Peripheral artery disease", icd10: "I73.9", specialty: "cardiology", weight: 0.8, patterns: [r("peripheral (?:arterial|vascular) disease|PAD|claudication|carotid stenosis|aortic aneurysm")] },
  { id: "pneumonia", name: "Pneumonia / lung infection", icd10: "J18.9", specialty: "pulmonology", weight: 0.8, patterns: [r("pneumonia|pleural effusion|empyema|bronchiectasis|pulmonary fibrosis|interstitial lung|dyspnea|respiratory failure|hypoxia|pneumothorax")] },
  { id: "abdominal", name: "Abdominal / bowel symptoms", icd10: "R10.9", specialty: "gastroenterology", weight: 0.6, patterns: [r("abdominal pain|dysphagia|diverticulitis|diverticulosis|pancreatitis|constipation|diarrhea|bowel obstruction|hemorrhoids|esophagitis|barrett'?s|peptic ulcer|gastritis|dyspepsia|odynophagia")] },
  { id: "pregnancy_cx", name: "Pregnancy / delivery", icd10: "Z34.90", specialty: "obgyn", weight: 1, patterns: [r("cesarean|C-section|vaginal delivery|labor and delivery|gravida|para \\d|intrauterine|preeclampsia|miscarriage|ectopic")] },
  { id: "gyn", name: "Gynecologic condition", icd10: "N94.89", specialty: "obgyn", weight: 0.9, patterns: [r("menorrhagia|dysmenorrhea|pelvic pain|ovarian cysts?|abnormal uterine bleeding|cervical dysplasia|abnormal pap|postmenopausal bleeding|vaginal bleeding|adnexal mass|pelvic organ prolapse|uterine prolapse")] },
  { id: "eye", name: "Eye condition", icd10: "H57.9", specialty: "ophthalmology", weight: 0.9, patterns: [r("retinal detachment|vitreous|macular|visual acuity|blurred vision|diplopia|strabismus|corneal|keratoconus|uveitis|pterygium|intraocular")] },
  { id: "skin_ca", name: "Skin cancer", icd10: "C44.90", specialty: "dermatology", weight: 1, patterns: [r("basal cell carcinoma|squamous cell carcinoma of the skin|actinic keratosis|skin cancer")] },
  { id: "skin", name: "Skin condition", icd10: "L98.9", specialty: "dermatology", weight: 0.7, patterns: [r("rash|dermatitis|urticaria|hives|rosacea|alopecia|vitiligo|pruritus|skin lesions?|warts?|nevus|seborrheic keratosis")] },
  { id: "tumor", name: "Mass or tumor under evaluation", icd10: "R22.9", specialty: "oncology", weight: 0.6, patterns: [r("chemotherapy|radiation therapy|neoplasm|tumor|metastases|oncology")] },
  { id: "msk", name: "Joint / tendon injury", icd10: "M25.50", specialty: "orthopedics", weight: 0.7, patterns: [r("tendinitis|tendonitis|bursitis|sprain|dislocation|plantar fasciitis|trigger finger|de quervain|epicondylitis|joint pain|shoulder pain|ankle pain|arthroplasty|arthroscopy|scoliosis|spondylosis|spondylolisthesis")] },
  { id: "thyroid", name: "Thyroid disorder", icd10: "E07.9", specialty: "endocrinology", weight: 0.8, patterns: [r("thyroid(?: disease| disorder)?|goiter|thyroiditis|parathyroid|hyperparathyroidism|adrenal|cushing'?s|pituitary")] },
  // Second pass after MTSamples validation (tune split only): orthopedics, neurology.
  { id: "foot", name: "Foot / ankle deformity", icd10: "M20.10", specialty: "orthopedics", weight: 0.9, patterns: [r("bunions?|bunionectomy|hallux (?:abducto)?valgus|hallux rigidus|hammer ?toes?|metatarsalgia|metatarsal (?:fracture|osteotomy)|achilles (?:tendon )?(?:rupture|tear|tendinopathy)|ankle (?:sprain|instability)|peroneal tendon")] },
  { id: "tendon", name: "Tendon or ligament tear", icd10: "M66.9", specialty: "orthopedics", weight: 0.9, patterns: [r("tendon (?:rupture|tear)|ruptured tendon|torn tendon|biceps tendon|pectoralis (?:major )?tendon|quadriceps tendon|patellar tendon")] },
  { id: "joint_pain2", name: "Neck, back or limb pain", icd10: "M54.9", specialty: "orthopedics", weight: 0.6, patterns: [r("(?:lower|upper|mid) back pain|back pain|neck pain|wrist pain|hand pain|elbow pain|foot pain|cervicalgia|whiplash")] },
  { id: "bone_infection", name: "Bone or joint infection", icd10: "M86.9", specialty: "orthopedics", weight: 0.9, patterns: [r("osteomyelitis|septic arthritis|subperiosteal abscess|prosthetic joint infection")] },
  { id: "stroke", name: "Stroke / brain infarct", icd10: "I63.9", specialty: "neurology", weight: 1, patterns: [r("(?:acute |ischemic |hemorrhagic )?stroke|cerebral infarct(?:ion)?|lacunar infarct(?:ion)?s?|cerebrovascular accident|basal ganglia infarct")] },
  { id: "spinal_cord", name: "Spinal cord or nerve root disorder", icd10: "G95.9", specialty: "neurology", weight: 0.9, patterns: [r("spinal cord (?:injury|compression|lesion|infarction)|transverse myelitis|myelitis|cauda equina|conus medullaris|syringomyelia|epidural (?:hematoma|abscess|lipoma)")] },
  { id: "gait", name: "Gait or movement problem", icd10: "R26.9", specialty: "neurology", weight: 0.7, patterns: [r("gait (?:difficulty|disturbance|abnormality|instability)|unsteady gait|dystonia|chorea|myoclonus|muscle cramps|fasciculations|developmental delay|delayed motor development")] },
  { id: "crps", name: "Complex regional pain syndrome", icd10: "G90.50", specialty: "neurology", weight: 0.9, patterns: [r("reflex sympathetic dystrophy|complex regional pain syndrome|CRPS")] },
  { id: "allergy_gen", name: "Allergies", icd10: "T78.40XA", specialty: "allergy", weight: 0.6, patterns: [r("allergies|allergic reaction|angioedema")] },
  { id: "arthralgia", name: "Inflammatory joint / autoimmune symptoms", icd10: "M25.50", specialty: "rheumatology", weight: 0.6, patterns: [r("fibromyalgia|vasculitis|polymyalgia|sjogren'?s|scleroderma|ankylosing spondylitis|psoriatic arthritis|ANA positive|positive ANA")] },
];

// Procedures and tests. They have no ICD-10-CM diagnosis code, so they are
// kept separate from conditions, shown as "mentioned procedures", and count for
// less than a diagnosis when choosing a specialist. Added after MTSamples
// validation (tune split only).
export type ProcedureRule = { id: string; name: string; specialty: SpecialtyId; weight: number; pattern: RegExp };

export const PROCEDURES: ProcedureRule[] = [
  { id: "cysto", name: "Cystoscopy / bladder procedure", specialty: "urology", weight: 0.8, pattern: r("cystoscopy|cystourethroscopy|cysto|TURBT|TURP|transurethral resection|retrograde pyelogram|ureteral stent|double-?J stent|urodynamics?") },
  { id: "uro_surg", name: "Urologic surgery", specialty: "urology", weight: 0.9, pattern: r("vasectomy|prostatectomy|orchi(?:d)?opexy|orchiectomy|spermatocele(?:ctomy)?|penile prosthesis|peyronie'?s|paraphimosis|circumcision|nephrectomy|pyeloplasty|lithotripsy|nephrolithotomy|nephrostomy|ureteroscopy|brachytherapy of the prostate|prostate biopsy|sextant biopsy|azoospermi[ac]") },
  { id: "uro_dx", name: "Kidney / prostate finding", specialty: "urology", weight: 0.7, pattern: r("prostatitis|renal mass|renal cell carcinoma|ureteral calculus|ureteropelvic junction|hydronephrosis|bladder neck obstruction|ureteral obstruction") },
  { id: "dialysis", name: "Dialysis access / kidney transplant", specialty: "nephrology", weight: 1, pattern: r("AV fistula|arteriovenous fistula|dialysis (?:access|fistula|catheter)|renal transplant|kidney transplant|renal biopsy|renal insufficiency") },
  { id: "endo_gi", name: "GI endoscopy", specialty: "gastroenterology", weight: 0.8, pattern: r("colonoscopy|EGD|esophagogastroduodenoscopy|upper endoscopy|sigmoidoscopy|ERCP|capsule endoscopy|polypectomy") },
  { id: "cardiac_test", name: "Cardiac test or procedure", specialty: "cardiology", weight: 0.8, pattern: r("echocardiogram|echocardiography|cardiac catheterization|left heart cath(?:eterization)?|coronary angiogra(?:m|phy)|stress test|holter|pacemaker|defibrillator|AICD|cardioversion|ablation|stent placement|CABG|coronary artery bypass|valve replacement") },
  { id: "neuro_test", name: "Neurological test", specialty: "neurology", weight: 0.8, pattern: r("EEG|electroencephalogram|EMG|electromyography|nerve conduction|lumbar puncture|MRI (?:of the )?brain|brain MRI|cerebral angiogra(?:m|phy)|neurologic(?:al)? exam(?:ination)?|cranial nerves") },
  { id: "neurosurg", name: "Brain / spine surgery", specialty: "neurology", weight: 0.7, pattern: r("craniotomy|craniectomy|ventriculoperitoneal shunt|VP shunt|laminectomy|discectomy|microdiscectomy|anterior cervical") },
  { id: "pulm_test", name: "Lung test or procedure", specialty: "pulmonology", weight: 0.8, pattern: r("bronchoscopy|pulmonary function tests?|PFTs?|spirometry|thoracentesis|polysomnogra(?:m|phy)|sleep study|CPAP|BiPAP") },
  { id: "eye_surg", name: "Eye procedure", specialty: "ophthalmology", weight: 0.9, pattern: r("phacoemulsification|vitrectomy|trabeculectomy|LASIK|keratoplasty|intraocular lens|slit lamp|fundus exam(?:ination)?|tonometry") },
  { id: "ent_surg", name: "Ear, nose or throat procedure", specialty: "ent", weight: 0.9, pattern: r("tonsillectomy|adenoidectomy|septoplasty|turbinate reduction|sinus surgery|FESS|myringotomy|tympanostomy|tympanoplasty|laryngoscopy|audiogram|audiometry") },
  { id: "gyn_surg", name: "Gynecologic procedure", specialty: "obgyn", weight: 0.9, pattern: r("hysterectomy|myomectomy|dilation and curettage|D&C|colposcopy|LEEP|hysteroscopy|salpingectomy|oophorectomy|tubal ligation|endometrial ablation|pap smear") },
  { id: "derm_proc", name: "Skin procedure", specialty: "dermatology", weight: 0.8, pattern: r("mohs|shave biopsy|punch biopsy|excision of (?:skin )?lesion|cryotherapy|electrodesiccation") },
  { id: "ortho_proc", name: "Orthopedic procedure", specialty: "orthopedics", weight: 0.8, pattern: r("osteotomy|internal (?:screw )?fixation|in situ pinning|K-?wires?|ORIF|open reduction|total knee|total hip|knee replacement|hip replacement|arthroplasty|arthroscop(?:y|ic)|carpal tunnel release|rotator cuff repair|ACL reconstruction|spinal fusion|cast(?:ing)? (?:applied|placed)") },
  { id: "onc_tx", name: "Cancer treatment", specialty: "oncology", weight: 0.7, pattern: r("chemotherapy|immunotherapy|radiation therapy|port-?a-?cath|mediport|PET(?:/CT)? scan|oncology follow-?up") },
  { id: "psych_eval", name: "Psychiatric evaluation", specialty: "psychiatry", weight: 0.8, pattern: r("psychiatric evaluation|psychosocial evaluation|mental status exam(?:ination)?|suicidal ideation|antidepressants?|SSRI") },
];

// Lab analytes we parse with reference thresholds. `when` returns a finding
// label when the value is clinically notable.
export type LabRule = {
  id: string;
  name: string;
  pattern: RegExp; // must capture the numeric value in group 1
  unit: string;
  specialty: SpecialtyId;
  icd10?: string;
  evaluate: (v: number) => { label: string; severity: "abnormal" | "critical" } | null;
};

const num = "(\\d{1,4}(?:\\.\\d{1,3})?)";
const lab = (names: string) => new RegExp(`\\b(?:${names})\\b[^\\d\\n]{0,24}?${num}`, "i");

export const LABS: LabRule[] = [
  {
    id: "a1c", name: "HbA1c", unit: "%", specialty: "endocrinology", icd10: "E11.65",
    pattern: lab("hba1c|hb ?a1c|a1c|hemoglobin a1c|glycated hemoglobin"),
    evaluate: (v) => (v >= 10 ? { label: "Very poorly controlled blood sugar", severity: "critical" } : v >= 6.5 ? { label: "In the diabetic range", severity: "abnormal" } : v >= 5.7 ? { label: "Prediabetic range", severity: "abnormal" } : null),
  },
  {
    id: "glucose", name: "Fasting glucose", unit: "mg/dL", specialty: "endocrinology",
    pattern: lab("fasting glucose|fasting blood sugar|FBG|FBS"),
    evaluate: (v) => (v >= 300 ? { label: "Dangerously high", severity: "critical" } : v >= 126 ? { label: "Above diabetic threshold", severity: "abnormal" } : v < 54 ? { label: "Dangerously low", severity: "critical" } : null),
  },
  {
    id: "ldl", name: "LDL cholesterol", unit: "mg/dL", specialty: "cardiology", icd10: "E78.00",
    pattern: lab("LDL(?:-C)?|low[- ]density lipoprotein"),
    evaluate: (v) => (v >= 190 ? { label: "Severely elevated", severity: "abnormal" } : v >= 160 ? { label: "High", severity: "abnormal" } : null),
  },
  {
    id: "egfr", name: "eGFR", unit: "mL/min/1.73m²", specialty: "nephrology", icd10: "N18.30",
    pattern: lab("eGFR|estimated GFR|GFR"),
    evaluate: (v) => (v < 15 ? { label: "Kidney failure range", severity: "critical" } : v < 30 ? { label: "Severely reduced kidney function", severity: "abnormal" } : v < 60 ? { label: "Reduced kidney function", severity: "abnormal" } : null),
  },
  {
    id: "creatinine", name: "Creatinine", unit: "mg/dL", specialty: "nephrology",
    pattern: lab("creatinine|Cr"),
    evaluate: (v) => (v >= 4 ? { label: "Markedly elevated", severity: "critical" } : v > 1.3 ? { label: "Elevated", severity: "abnormal" } : null),
  },
  {
    id: "alt", name: "ALT", unit: "U/L", specialty: "gastroenterology", icd10: "R74.01",
    pattern: lab("ALT|SGPT|alanine aminotransferase"),
    evaluate: (v) => (v >= 200 ? { label: "Markedly elevated liver enzyme", severity: "critical" } : v > 45 ? { label: "Elevated liver enzyme", severity: "abnormal" } : null),
  },
  {
    id: "tsh", name: "TSH", unit: "mIU/L", specialty: "endocrinology",
    pattern: lab("TSH|thyroid stimulating hormone"),
    evaluate: (v) => (v > 10 ? { label: "Underactive thyroid range", severity: "abnormal" } : v > 4.5 ? { label: "Mildly high", severity: "abnormal" } : v < 0.1 ? { label: "Overactive thyroid range", severity: "abnormal" } : null),
  },
  {
    id: "hgb", name: "Hemoglobin", unit: "g/dL", specialty: "hematology", icd10: "D64.9",
    pattern: /\b(?:hemoglobin|hgb|hb)\b(?!\s*a1c)[^\d\n]{0,24}?(\d{1,2}(?:\.\d{1,2})?)/i,
    evaluate: (v) => (v < 7 ? { label: "Severe anemia", severity: "critical" } : v < 11 ? { label: "Anemia", severity: "abnormal" } : null),
  },
  {
    id: "psa", name: "PSA", unit: "ng/mL", specialty: "urology", icd10: "R97.20",
    pattern: lab("PSA|prostate specific antigen"),
    evaluate: (v) => (v >= 10 ? { label: "Markedly elevated", severity: "abnormal" } : v > 4 ? { label: "Elevated", severity: "abnormal" } : null),
  },
  {
    id: "troponin", name: "Troponin", unit: "ng/mL", specialty: "cardiology", icd10: "R79.89",
    pattern: lab("troponin(?: [IT])?|hs-?TnT|hs-?TnI"),
    evaluate: (v) => (v > 0.04 && v < 50 ? { label: "Elevated — possible heart injury", severity: "critical" } : null),
  },
  {
    id: "bp", name: "Blood pressure (systolic)", unit: "mmHg", specialty: "cardiology", icd10: "I10",
    pattern: /\b(?:BP|blood pressure)\b[^\d\n]{0,16}?(\d{2,3})\s*\/\s*\d{2,3}/i,
    evaluate: (v) => (v >= 180 ? { label: "Hypertensive crisis range", severity: "critical" } : v >= 140 ? { label: "Stage 2 hypertension range", severity: "abnormal" } : null),
  },
];

// Phrases that indicate the patient should seek emergency care now rather
// than book a specialist.
export const RED_FLAGS: { pattern: RegExp; message: string }[] = [
  { pattern: r("chest pain at rest|crushing chest|STEMI|acute MI|myocardial infarction"), message: "Possible heart attack" },
  { pattern: r("stroke symptoms|facial droop|slurred speech|sudden weakness"), message: "Possible stroke" },
  { pattern: r("suicidal|suicide|self-harm"), message: "Risk of self-harm" },
  { pattern: r("anaphylaxis|throat (?:closing|swelling)"), message: "Severe allergic reaction" },
  { pattern: r("shortness of breath at rest|can'?t breathe|respiratory distress"), message: "Breathing emergency" },
];

// Negation / context cues (NegEx-style). If a match is preceded within the
// same clause by one of these, it's not counted as a current condition.
export const NEGATION = /\b(?:no|not|denies|denied|negative for|without|free of|ruled out|rule out|r\/o|absence of|resolved)\b[^.;:\n]{0,40}$/i;
export const FAMILY = /\b(?:family history|fhx|fh of|mother|father|brother|sister|maternal|paternal)\b[^.;\n]{0,50}$/i;
