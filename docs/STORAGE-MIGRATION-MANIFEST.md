# Firebase Storage Migration Manifest & Asset Audit
**Project:** Aakash Das Personal Website & Educational Archive  
**Target Bucket:** `gs://aakashdas-live.firebasestorage.app`  
**Generated At:** 2026-11-23  
**Status:** Local Audit Complete / Ready for Staged Migration (Phase 9)

---

## 1. Storage Organization & Quota Policy

Per `storage.rules`, files are organized into isolated directories with strict validation:

| Directory Pattern | Purpose | Allowed MIME Types | Max Size | Read Access | Write Access |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `uploads/profile/*` | Profile & hero portraits | JPEG, PNG, WebP, SVG, AVIF, GIF | 10 MB | Public | Admin Only (`aakashdas.photo@gmail.com`) |
| `uploads/site/*` | Brand icons, favicons | JPEG, PNG, WebP, SVG, AVIF, GIF | 10 MB | Public | Admin Only (`aakashdas.photo@gmail.com`) |
| `uploads/resources/{id}/*` | Educational attachments & covers | PDF, DOCX, DOC, XLSX, XLS, CSV, TXT, Images | 50 MB (Docs) / 10 MB (Images) | Public | Admin Only (`aakashdas.photo@gmail.com`) |
| `uploads/journals/{slug}/*` | Article covers & inline graphics | JPEG, PNG, WebP, SVG, AVIF, GIF | 10 MB | Public | Admin Only (`aakashdas.photo@gmail.com`) |

---

## 2. Inventoried Asset Manifest

### 2.1 Profile & Author Photographs
| ID | Local Source Path | Target Storage Path | Referencing Document | MIME Type | File Size | Upload Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `img-profile-webp` | `public/images/aakash-das.webp` | `uploads/profile/aakash-das.webp` | `pages/home`, `siteSettings/general` | `image/webp` | 37.1 KB (37,968 B) | `local-only` |
| `img-profile-jpg` | `public/images/aakash-das.jpg` | `uploads/profile/aakash-das.jpg` | `siteSettings/general` | `image/jpeg` | 78.2 KB (80,059 B) | `local-only` |
| `img-profile-full` | `public/images/aakash-das-full.jpg` | `uploads/profile/aakash-das-full.jpg` | `siteSettings/general` | `image/jpeg` | 171.4 KB (175,557 B) | `local-only` |

### 2.2 Site Branding & Touch Icons
| ID | Local Source Path | Target Storage Path | Referencing Document | MIME Type | File Size | Upload Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `site-favicon-svg` | `public/favicon.svg` | `uploads/site/favicon.svg` | `siteSettings/general` | `image/svg+xml` | 1.8 KB (1,846 B) | `local-only` |
| `site-favicon-32` | `public/favicon-32x32.png` | `uploads/site/favicon-32x32.png` | `siteSettings/general` | `image/png` | 1.2 KB (1,232 B) | `local-only` |
| `site-touch-icon` | `public/apple-touch-icon.png` | `uploads/site/apple-touch-icon.png` | `siteSettings/general` | `image/png` | 8.4 KB (8,610 B) | `local-only` |

### 2.3 Resource 001 Assets (Starter Personal Budget Framework)
| ID | Local Source Path | Target Storage Path | Referencing Document | MIME Type | File Size | Upload Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `res-001-pdf` | `public/downloads/resource-001-starter-personal-budget-framework.pdf` | `uploads/resources/001/resource-001-starter-personal-budget-framework.pdf` | `resources/001` | `application/pdf` | 451.7 KB (462,519 B) | `local-only` |
| `res-001-pdf-alias`| `public/downloads/starter-budget-template-001.pdf` | `uploads/resources/001/starter-budget-template-001.pdf` | `resources/001` | `application/pdf` | 451.7 KB (462,519 B) | `local-only` |
| `res-001-docx` | `public/downloads/resource-001-starter-personal-budget-framework.docx` | `uploads/resources/001/resource-001-starter-personal-budget-framework.docx` | `resources/001` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | 34.9 KB (35,688 B) | `local-only` |
| `res-001-docx-alias`| `public/downloads/starter-budget-template-001.docx` | `uploads/resources/001/starter-budget-template-001.docx` | `resources/001` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | 34.9 KB (35,688 B) | `local-only` |
| `res-001-csv` | `public/downloads/starter-budget-model-001.csv` | `uploads/resources/001/starter-budget-model-001.csv` | `resources/001` | `text/csv` | 282 B | `local-only` |
| `res-001-thumb` | `public/images/thumbnails/dQw4w9WgXcQ.jpg` | `uploads/resources/001/thumbnail-dQw4w9WgXcQ.jpg` | `resources/001` | `image/jpeg` | 20.5 KB (21,011 B) | `local-only` |

### 2.4 Resource 002 Assets (Nepal Banking & Account Checklist)
| ID | Local Source Path | Target Storage Path | Referencing Document | MIME Type | File Size | Upload Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `res-002-pdf` | `public/downloads/resource-002-nepal-banking-account-checklist.pdf` | `uploads/resources/002/resource-002-nepal-banking-account-checklist.pdf` | `resources/002` | `application/pdf` | 414.6 KB (424,573 B) | `local-only` |
| `res-002-pdf-alias`| `public/downloads/nepal-banking-checklist-002.pdf` | `uploads/resources/002/nepal-banking-checklist-002.pdf` | `resources/002` | `application/pdf` | 414.6 KB (424,573 B) | `local-only` |
| `res-002-docx` | `public/downloads/resource-002-nepal-banking-account-checklist.docx` | `uploads/resources/002/resource-002-nepal-banking-account-checklist.docx` | `resources/002` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | 39.4 KB (40,354 B) | `local-only` |
| `res-002-docx-alias`| `public/downloads/nepal-banking-checklist-002.docx` | `uploads/resources/002/nepal-banking-checklist-002.docx` | `resources/002` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | 39.4 KB (40,354 B) | `local-only` |
| `res-002-thumb` | `public/images/thumbnails/kJQP7kiw5Fk.jpg` | `uploads/resources/002/thumbnail-kJQP7kiw5Fk.jpg` | `resources/002` | `image/jpeg` | 25.3 KB (25,889 B) | `local-only` |

### 2.5 Resource 003 Assets (Student Productivity & Semester Tracker)
| ID | Local Source Path | Target Storage Path | Referencing Document | MIME Type | File Size | Upload Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `res-003-pdf` | `public/downloads/resource-003-student-productivity-semester-tracker.pdf` | `uploads/resources/003/resource-003-student-productivity-semester-tracker.pdf` | `resources/003` | `application/pdf` | 433.4 KB (443,769 B) | `local-only` |
| `res-003-pdf-alias`| `public/downloads/student-productivity-tracker-003.pdf` | `uploads/resources/003/student-productivity-tracker-003.pdf` | `resources/003` | `application/pdf` | 433.4 KB (443,769 B) | `local-only` |
| `res-003-docx` | `public/downloads/resource-003-student-productivity-semester-tracker.docx` | `uploads/resources/003/resource-003-student-productivity-semester-tracker.docx` | `resources/003` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | 36.8 KB (37,654 B) | `local-only` |
| `res-003-docx-alias`| `public/downloads/student-productivity-tracker-003.docx` | `uploads/resources/003/student-productivity-tracker-003.docx` | `resources/003` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | 36.8 KB (37,654 B) | `local-only` |
| `res-003-thumb` | `public/images/thumbnails/fJ9rUzIMcZQ.jpg` | `uploads/resources/003/thumbnail-fJ9rUzIMcZQ.jpg` | `resources/003` | `image/jpeg` | 23.0 KB (23,549 B) | `local-only` |

---

## 3. Manifest Summary Metrics
- **Total Tracked Assets:** 22 files
- **Total Local Storage Size:** 3,191,894 bytes (~3.04 MB)
- **Document Attachments (PDF/DOCX/CSV):** 13 files (~2.75 MB)
- **Photographs & Thumbnails:** 6 files (~0.35 MB)
- **Site Icons:** 3 files (~0.01 MB)
- **Local Preservation Rule:** No local files are removed. Public download paths (`/downloads/...`) remain fully functional as static assets.
