# oddyCRM — CLAUDE.md

Bu dosya Claude Code için kalıcı proje referansıdır.
Buradaki kurallar, **tüm varsayılan davranışları geçersiz kılar** — eksiksiz uy.

---

## Proje Özeti

**oddyCRM** — Denizcilik sektörüne özel, çok kiracılı (multi-tenant) SaaS CRM platformu.
Müşteri yönetimi, gemi takibi, servis süreçleri, teklif/fatura döngüsü ve denizcilik
mevzuat uyumluluğunu (EU MRV, IMO DCS, EU ETS, MARPOL, SOLAS, MLC…) tek platformda sunar.

**Ürün adı:** oddyCRM | **Slogan:** Maritime Suite
**Domain:** `siarem.com` (prod) · `siarem.local` (dev)
**Repo kökü:** `c:\repos\siarem-global\`

---

## Tech Stack ve Kesin Sürümler

### Backend (`backend/`)
| Paket | Sürüm | Rol |
|---|---|---|
| Node.js | ≥20 | Runtime |
| TypeScript | ^5.6.3 | Dil |
| Express | ^4.19.2 | HTTP framework |
| Prisma | ^5.22.0 | ORM |
| @prisma/client | ^5.22.0 | DB istemcisi |
| PostgreSQL | 16-alpine (Docker) | Veritabanı |
| jsonwebtoken | ^9.0.2 | JWT |
| bcryptjs | ^2.4.3 | Şifre hash |
| multer | ^1.4.5-lts.1 | Dosya yükleme |
| cors | ^2.8.5 | CORS |
| slugify | ^1.6.6 | URL slug |
| express-validator | ^7.2.0 | İstek validasyonu |
| dotenv | ^16.4.5 | Env değişkenleri |
| tsx | ^4.19.1 | Dev runtime (`tsx watch`) |

### Frontend (`frontend/`)
| Paket | Sürüm | Rol |
|---|---|---|
| React | ^18.3.1 | UI |
| TypeScript | ^5.7.2 | Dil |
| Vite | ^6.0.7 | Build tool (port 5173) |
| TailwindCSS | ^3.4.17 | Stil |
| @tanstack/react-query | ^5.62.7 | Sunucu durumu |
| react-hook-form | ^7.54.2 | Form yönetimi |
| @hookform/resolvers | ^3.9.1 | RHF + Zod bağlantısı |
| zod | ^3.24.1 | Şema doğrulama |
| zustand | ^5.0.3 | Global state |
| axios | ^1.7.9 | HTTP istemcisi |
| react-router-dom | ^7.1.1 | Routing |
| i18next | ^24.2.0 | i18n altyapısı |
| react-i18next | ^15.2.0 | React entegrasyonu |
| lucide-react | ^0.468.0 | İkonlar |
| recharts | ^3.7.0 | Grafikler (Dashboard) |
| tailwindcss-animate | ^1.0.7 | Animasyon |
| react-google-recaptcha | ^3.1.0 | reCAPTCHA v2 (Kayıt formu) |

---

## Klasör Yapısı

```
siarem-global/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma            ← Tek kaynak; migration'lardan önce burayı düzenle
│   │   ├── migrations/              ← Asla mevcut SQL'i düzenleme; yeni migration yaz
│   │   ├── seed.ts                  ← Seed betiği
│   │   └── seed_data.json
│   └── src/
│       ├── app.ts                   ← Express kurulumu (CORS, gövde parse, static, tenant, routes)
│       ├── server.ts                ← Prisma bağlantısı + dinleme başlangıcı
│       ├── config/env.ts            ← Tüm env değişkenleri (PORT, JWT_SECRET, UPLOAD_DIR…)
│       ├── lib/
│       │   ├── prisma.ts            ← Singleton PrismaClient
│       │   └── recaptcha.ts         ← Google reCAPTCHA v2 doğrulama
│       ├── middleware/
│       │   ├── auth.middleware.ts   ← authenticate() + requireRole() + JwtPayload tipi
│       │   ├── tenant.middleware.ts ← X-Tenant-Domain → req.tenant (domain/slug çözümleme)
│       │   └── error.middleware.ts  ← AppError sınıfı + global hata yakalayıcı
│       ├── routes/                  ← Express router'ları; index.ts'de birleşir
│       │   ├── index.ts             ← Tüm alt router'ları /api altında birleştirir + /health
│       │   ├── auth.routes.ts
│       │   ├── companies.routes.ts
│       │   ├── customers.routes.ts
│       │   ├── ships.routes.ts
│       │   ├── services.routes.ts
│       │   ├── quotes.routes.ts
│       │   ├── invoices.routes.ts
│       │   ├── meetings.routes.ts
│       │   ├── expenses.routes.ts
│       │   ├── complaints.routes.ts
│       │   ├── dashboard.routes.ts
│       │   ├── users.routes.ts
│       │   ├── serviceTypes.routes.ts
│       │   ├── products.routes.ts
│       │   ├── audit.routes.ts
│       │   └── notifications.routes.ts
│       ├── controllers/             ← HTTP katmanı: req/res işleme
│       └── services/                ← İş mantığı + Prisma sorguları
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  ← React Router yapısı (public + authenticated rotalar)
│   │   ├── main.tsx                 ← React entry point
│   │   ├── index.css                ← CSS değişkenleri (HSL) + dark mode genel override'ları
│   │   ├── api/                     ← Entity başına tip güvenli Axios wrapper'ları
│   │   ├── components/
│   │   │   ├── layout/              ← AppLayout, Header, Sidebar, NotificationPanel
│   │   │   ├── shared/              ← PageHeader, DataGrid, FormSection
│   │   │   └── ui/                  ← Primitif bileşenler (button, badge, modal, input…)
│   │   ├── hooks/
│   │   │   └── useDarkMode.ts       ← Dark mode: localStorage + sistem tercihi
│   │   ├── i18n/
│   │   │   ├── index.ts
│   │   │   ├── tr.json              ← Türkçe
│   │   │   └── en.json              ← İngilizce
│   │   ├── lib/
│   │   │   ├── api.ts               ← Axios instance (Authorization + X-Tenant-Domain + X-Selected-Company)
│   │   │   └── utils.ts
│   │   ├── pages/                   ← Özellik sayfaları (özellik başına klasör)
│   │   ├── store/
│   │   │   ├── auth.store.ts        ← Zustand: token, user, isAuthenticated (persist)
│   │   │   └── tenant.store.ts      ← Zustand: selectedCompanyId (SUPER_ADMIN şirket seçimi)
│   │   └── types/index.ts           ← Paylaşılan TypeScript tipleri
│   ├── vite.config.ts               ← @ alias, proxy /api → 3001, /uploads → 3001
│   └── tailwind.config.ts           ← darkMode: 'class', CSS değişken renkleri
├── docker-compose.yml               ← Dev: PostgreSQL 16 (port 5440)
├── docker-compose.prod.yml          ← Prod: postgres + backend + frontend (+ volume)
└── CLAUDE.md                        ← Bu dosya
```

---

## Kimlik Doğrulama ve Yetkilendirme

### JWT Payload Yapısı
```typescript
interface JwtPayload {
  sub: string;          // userId
  email: string;
  role: string;         // 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER'
  name: string;
  companyId: string | null; // SUPER_ADMIN için null
}
```

### Middleware — `auth.middleware.ts`
```typescript
// Tüm korumalı rotalarda:
router.use(authenticate);

// Rol kısıtlaması için:
router.post('/', authenticate, requireRole('ADMIN', 'MANAGER'), ctrl.create);
router.delete('/:id', authenticate, requireRole('ADMIN'), ctrl.remove);

// SUPER_ADMIN her requireRole() kontrolünü otomatik olarak geçer
```

### Tenant Çözümleme — `tenant.middleware.ts`
- Frontend her istekte `X-Tenant-Domain: window.location.hostname` gönderir
- Middleware: `localhost` → ilk aktif şirketi kullan; tam domain veya slug ile eşleştir
- Admin domain (`admin.siarem.local`) → tenant çözümlemeyi atla
- Çözümlenen tenant `req.tenant` üzerinde erişilebilir

### SUPER_ADMIN Özellikleri
- `companyId` null; `X-Selected-Company` header'ı ile geçici olarak override edilir
- `authenticate()` SUPER_ADMIN için `req.user.companyId`'yi override yapar
- Sidebar: modül kısıtlaması uygulanmaz — tüm nav öğeleri görünür
- Şirket yönetimi sadece SUPER_ADMIN'e açık: `/api/companies` (listele/oluştur/güncelle/sil)

### Auth Akışı
1. `POST /api/auth/login` → email + password + tenant (X-Tenant-Domain header'dan)
2. Yanıt: `{ token, user: { id, name, email, role, companyId, companyModules[] } }`
3. `companyModules` Sidebar filtrelemesi için kullanılır
4. `GET /api/auth/me` → `companyModules` dahil güncel kullanıcı verilerini döner
5. `POST /api/auth/register` → yeni tenant (şirket + ADMIN kullanıcı) kaydeder — public endpoint

---

## Veritabanı Şeması

### Enum'lar
```
Role:            SUPER_ADMIN | ADMIN | MANAGER | USER
ShipStatus:      ACTIVE | PASSIVE | SOLD | SCRAPPED
ServiceStatus:   OPEN | IN_PROGRESS | COMPLETED | CANCELLED | ON_HOLD
Priority:        LOW | MEDIUM | HIGH | URGENT
QuoteStatus:     DRAFT | SENT | APPROVED | REJECTED | REVISED | CANCELLED
InvoiceStatus:   DRAFT | SENT | PARTIALLY_PAID | PAID | OVERDUE | CANCELLED
EntityType:      CUSTOMER | SHIP | SERVICE | QUOTE | INVOICE | MEETING | SHIP_CERTIFICATE
ComplaintType:   COMPLAINT | FEEDBACK | SUGGESTION
ComplaintStatus: OPEN | IN_PROGRESS | RESOLVED | CLOSED
```

### Model Haritası

**Company** `companies` — Tenant kökü
- `id`, `name`, `domain` (unique), `slug` (unique), `isActive`, `plan`
- `logoUrl`, `email`, `phone`, `address`, `city`, `country`, `taxNumber`, `website`
- `companyType` String default "MARITIME" | `modules` String[] default []
- İlişkiler: users, customers, contacts, ships, services, quotes, invoices, meetings, documents, expenses, serviceTypes, shipTypes, auditLogs, products, complaints, bankAccounts, serviceReports, shipCertificates, customerNotes

**User** `users`
- `id`, `companyId` (null = SUPER_ADMIN), `name`, `email`, `password`, `role` Role, `isActive`
- Unique: [companyId, email]

**Customer** `customers`
- `id`, `companyId`, `shortCode`, `name`, `email`, `phone`, `address`, `city`, `country`, `taxNumber`, `notes`, `isActive`
- Soft-delete: `deletedAt`, `deletedById`
- Unique: [companyId, shortCode]
- İlişkiler: contacts, ships, services, quotes, invoices, meetings, documents, expenses, complaints, bankAccounts, assignees (CustomerAssignee[]), customerNotes

**CustomerBankAccount** `customer_bank_accounts`
- `id`, `companyId`, `customerId`, `bankName`, `iban`, `accountNo`, `currency`, `notes`, `sortOrder`
- onDelete: Cascade (müşteri silinince)

**CustomerNote** `customer_notes`
- `id`, `companyId`, `customerId`, `userId`, `content`, `createdAt`
- onDelete: Cascade (müşteri silinince)

**Contact** `contacts`
- `id`, `companyId`, `customerId`, `name`, `title`, `email`, `phone`, `isPrimary`, `notes`
- onDelete: Cascade (müşteri silinince)

**Ship** `ships`
- `id`, `companyId`, `customerId`, `name`, `imoNumber`, `shipTypeId`, `flag`
- `grossTonnage`, `dwt`, `netTonnage`, `builtYear`
- `classificationSociety`, `emissionVerifier`, `itSystem`, `adminAuthority`
- `isLargeVessel` Boolean default true (> 5000 GT), `status` ShipStatus
- Soft-delete; Unique: [companyId, imoNumber]
- İlişkiler: certificates (ShipCertificate[]), services, quoteShips, meetings, documents, expenses

**ShipType** `ship_types`
- `id` autoincrement, `companyId` (null = global), `name`, `ciiType` ("DWT" | "GT")

**ShipCertificate** `ship_certificates`
- `id`, `shipId`, `companyId`, `certType`, `certNo`, `issueDate`, `expiryDate`, `issuedBy`, `notes`
- onDelete: Cascade (gemi silinince)
- İlişkiler: documents (Document[])
- certType örnekleri: ISM, ISPS, MLC, IMO_DCS, EU_MRV, CLC, MARPOL, SOLAS, OTHER

**ServiceType** `service_types`
- `id` autoincrement, `companyId` (null = global), `nameEn`, `nameTr`, `code`, `category`, `description`

**Service** `services`
- `id`, `companyId`, `customerId`, `shipId`, `serviceTypeId`, `assignedUserId`
- `status` ServiceStatus, `priority` Priority
- Mevzuat alanları: `euMrvMpStatus`, `ukMrvMpStatus`, `fuelEuMpStatus`, `imoDcsStatus`, `euEtsStatus`, `mohaStatus`
- Faturalama: `invoiceReady` Boolean, `invoiceReadyNote`
- `statusNote`, `notes`, `startDate`, `completedAt`
- Soft-delete
- İlişkiler: quotes, invoices, documents, logs (ServiceLog[]), expenses, report (ServiceReport?)

**ServiceLog** `service_logs`
- `id`, `serviceId`, `userId`, `action` (CREATED|STATUS_CHANGED|BILLING_READY|ASSIGNED|UPDATED), `field`, `oldValue`, `newValue`, `note`
- onDelete: Cascade (servis silinince)

**ServiceReport** `service_reports`
- `id`, `serviceId` (unique — 1:1 ile Service), `companyId`, `workDone`, `findings`, `partsUsed`, `reportDate`, `status` ("DRAFT"|"FINALIZED"), `createdById`

**Quote** `quotes`
- `id`, `companyId`, `quoteNumber`, `revision` default 1, `parentQuoteId` (revizyon zinciri)
- `customerId`, `serviceId`, `createdById`
- `shipCount`, `unitPrice`, `currency`, `totalAmount`, `priceEur`, `priceUsd`, `priceTry`
- `quoteDate`, `validUntil`, `status` QuoteStatus, `combinedInvoice` Boolean
- Soft-delete; Unique: [companyId, quoteNumber]
- İlişkiler: quoteShips (QuoteShip[]), invoices, documents, items (QuoteItem[]), revisions (Quote[])

**QuoteShip** `quote_ships` — N:M Quote ↔ Ship
- `quoteId`, `shipId`, `notes`; Bileşik PK: [quoteId, shipId]

**QuoteItem** `quote_items`
- `id`, `quoteId`, `productId`, `description`, `quantity` Decimal(14,4), `unitPrice` Decimal(14,4), `currency`, `total` Decimal(14,4), `sortOrder`
- onDelete: Cascade (teklif silinince)

**Invoice** `invoices`
- `id`, `companyId`, `refNo`, `customerId`, `serviceId`, `quoteId`, `createdById`
- `amount` Float, `currency`, `status` InvoiceStatus, `isCombined` Boolean
- `invoiceDate`, `dueDate`, `sentAt`
- Soft-delete; Unique: [companyId, refNo]
- İlişkiler: payments (Payment[]), documents, expenses, items (InvoiceItem[])

**InvoiceItem** `invoice_items`
- Aynı yapı QuoteItem ile — `invoiceId` FK, onDelete: Cascade

**Payment** `payments`
- `id`, `invoiceId`, `amount` Float, `currency`, `paymentDate`, `method`, `reference`, `notes`
- onDelete: Cascade (fatura silinince)
- ⚠️ `companyId` YOKTUR — dashboard sorgularında `JOIN invoices i ON i.id = p."invoiceId"` gereklidir

**Meeting** `meetings`
- `id`, `companyId`, `customerId`, `shipId`, `createdById`
- `meetingType` ("MEETING"|"CALL"), `title`, `description`, `location`, `duration` (dk), `meetingDate`, `followUpDate`
- `attendees` String (JSON string), `notes`
- Soft-delete

**Document** `documents` — **Polimorfik**
- `id`, `companyId`, `entityType` EntityType, `displayName`, `storedFilename`, `originalFilename`, `mimetype`, `size`, `uploadedById`
- FK alanları (nullable): `customerId`, `shipId`, `serviceId`, `quoteId`, `invoiceId`, `meetingId`, `shipCertificateId`
- Hangi FK dolu → hangi entity'ye ait olduğunu belirler
- `shipCertificateId` → onDelete: Cascade

**Expense** `expenses` — Gelir/Gider
- `id`, `companyId`, `type` ("INCOME"|"EXPENSE"), `category`, `description`, `amount`, `currency` default "TRY", `date`
- Opsiyonel bağlantılar: `customerId`, `shipId`, `serviceId`, `invoiceId`
- Soft-delete; Sadece ADMIN erişebilir

**AuditLog** `audit_logs`
- `id`, `companyId`, `entityType`, `entityId`, `action` (CREATE|UPDATE|DELETE)
- `userId`, `userName` (snapshot), `ipAddress`, `hostname`, `userAgent`, `changes` Json
- Index: [entityType, entityId], [userId], [createdAt]
- Sadece ADMIN erişebilir

**CustomerAssignee** `customer_assignees` — N:M Customer ↔ User
- `customerId`, `userId`, `assignedAt`; Bileşik PK: [customerId, userId]
- onDelete: Cascade her iki taraftan

**Product** `products`
- `id`, `companyId`, `code`, `name`, `nameEn`, `unit` default "ADET"
- `unitPriceEur`, `unitPriceUsd`, `unitPriceTry` Decimal(14,4)
- `isActive`, Unique: [companyId, code]

**Complaint** `complaints`
- `id`, `companyId`, `customerId` (nullable — public başvurular için)
- `type` ComplaintType, `status` ComplaintStatus, `subject`, `description`
- `responseNote`, `respondedAt`, `contactName`, `contactEmail`
- Herkese açık gönderim: `POST /api/complaints/public` (auth gerekmez)

### Migration Geçmişi (Sıralı)
```
20260225102936_init                           Temel şema
20260228000000_add_products_and_items         Product, QuoteItem, InvoiceItem
20260228010000_add_complaints                 Complaint, ComplaintType/Status enum
20260228020000_add_customer_city_bank_accounts Customer.city/country, CustomerBankAccount
20260301000000_add_company_modules            Company.companyType, Company.modules[]
20260301010000_add_service_report             ServiceReport model
20260301020000_add_ship_certificates          ShipCertificate model
20260301030000_add_customer_notes             CustomerNote model
20260301040000_add_cert_document_id           Document.shipCertificateId, EntityType.SHIP_CERTIFICATE
```

---

## Modül Sistemi

```typescript
// Sidebar nav tanımları (frontend/src/components/layout/Sidebar.tsx)
const navItems = [
  { key: 'dashboard',   path: '/dashboard' },
  { key: 'customers',   path: '/customers' },
  { key: 'quotes',      path: '/quotes' },
  { key: 'services',    path: '/services' },
  { key: 'invoices',    path: '/invoices' },
  { key: 'meetings',    path: '/meetings' },
  { key: 'complaints',  path: '/complaints' },
  { key: 'expenses',    path: '/expenses',   adminOnly: true },
  { key: 'documents',   path: '/documents' },   // placeholder
  { key: 'reports',     path: '/reports' },     // placeholder
  { key: 'settings',    path: '/settings',   adminOnly: true },
  { key: 'ships',       path: '/ships',      moduleRequired: 'SHIPS' },
];

// Görünürlük mantığı
navItems.filter((item) => {
  if (item.adminOnly && !isAdmin) return false;
  if (item.moduleRequired && !isSuperAdmin && !companyModules.includes(item.moduleRequired)) return false;
  return true;
});
```

- Mevcut modüller: `'SHIPS'`, `'SERVICE_REPORT'`
- Modül güncelleme: `PUT /api/companies/:id/modules` (sadece SUPER_ADMIN)
- SUPER_ADMIN tüm nav öğelerini görür (modül kısıtlaması uygulanmaz)
- `ownCompany` sorgusu sadece non-SUPER_ADMIN için çalışır (`enabled: !isSuperAdmin && !!user`)

---

## API Endpoint Referansı

### Auth — `/api/auth`
```
POST   /login            Public; loginValidation middleware
POST   /register         Public; yeni tenant + ADMIN kullanıcı kaydı
GET    /me               authenticate
POST   /logout           authenticate
```

### Companies — `/api/companies`
```
GET    /own              authenticate; kendi şirketini getir
PATCH  /own              authenticate; şirket profilini güncelle (ADMIN)
POST   /:id/logo         authenticate; logo yükle (multer, 2MB, sadece image)
--- Aşağısı SUPER_ADMIN only ---
GET    /                 Tüm şirketleri listele
GET    /:id              Tek şirket
POST   /                 Yeni şirket oluştur
PUT    /:id              Şirket güncelle
PUT    /:id/modules      Modülleri güncelle
DELETE /:id              Şirket sil
```

### Customers — `/api/customers`
```
GET    /                              Listele (soft-delete filtreli)
GET    /options/countries             Ülke listesi
GET    /:id                           Tek müşteri
POST   /                              Oluştur
PUT    /:id                           Güncelle
DELETE /:id                           Sil
GET    /:id/notes                     Notlar
POST   /:id/notes                     Not ekle
DELETE /:id/notes/:noteId             Not sil
GET    /:customerId/bank-accounts     Banka hesapları
POST   /:customerId/bank-accounts     Hesap ekle (ADMIN, MANAGER)
PUT    /:customerId/bank-accounts/:bankId   Güncelle (ADMIN, MANAGER)
DELETE /:customerId/bank-accounts/:bankId  Sil (ADMIN, MANAGER)
GET    /:customerId/assignees         Temsilciler
POST   /:customerId/assignees         Temsilci ekle (ADMIN, MANAGER)
DELETE /:customerId/assignees/:userId Kaldır (ADMIN, MANAGER)
*      /:customerId/contacts/*        contacts.routes (iç)
```

### Ships — `/api/ships`
```
GET    /types                                      Gemi tipleri
GET    /options/flags                              Bayrak seçenekleri
GET    /                                           Listele
GET    /:id                                        Tek gemi
POST   /                                           Oluştur
PUT    /:id                                        Güncelle
DELETE /:id                                        Sil
GET    /:id/certificates                           Sertifikalar
POST   /:id/certificates                           Sertifika ekle
PUT    /:id/certificates/:certId                   Güncelle
DELETE /:id/certificates/:certId                   Sil
GET    /:id/certificates/:certId/documents         Dokümanlar
POST   /:id/certificates/:certId/documents         Yükle (multer, 20MB)
DELETE /:id/certificates/:certId/documents/:docId  Sil
```

### Services — `/api/services`
```
GET    /types       Servis tipleri (global + firma)
GET    /            Listele
GET    /:id         Tek servis
POST   /            Oluştur
PUT    /:id         Güncelle
DELETE /:id         Sil
GET    /:id/report  Servis raporu getir
PUT    /:id/report  Upsert (oluştur veya güncelle)
```

### Quotes — `/api/quotes`
```
GET    /                      Listele
GET    /:id                   Tek teklif
POST   /                      Oluştur
PUT    /:id                   Güncelle
DELETE /:id                   Sil
POST   /:id/convert-to-invoice DRAFT fatura oluştur (teklif kalemlerinden)
```

### Invoices — `/api/invoices`
```
GET    /                       Listele
GET    /:id                    Tek fatura
POST   /                       Oluştur
PUT    /:id                    Güncelle
DELETE /:id                    Sil
POST   /:id/payments           Ödeme ekle (status otomatik güncellenir)
DELETE /:id/payments/:paymentId Ödeme sil
```

### Meetings — `/api/meetings`
```
GET/GET/:id/POST/PUT/:id/DELETE/:id   Standart CRUD
```

### Expenses — `/api/expenses` (ADMIN only)
```
GET/GET/:id/POST/PUT/:id/DELETE/:id   Standart CRUD
```

### Complaints — `/api/complaints`
```
POST   /public   Auth gerekmez; kamuya açık şikayet formu
GET/GET/:id/POST/PUT/:id/DELETE/:id   Standart CRUD (auth gerekli)
```

### Dashboard — `/api/dashboard`
```
GET /   Yanıt içeriği:
  services:         { total, open, inProgress, completed, cancelled, onHold }
  quotes:           { total, draft, sent, approved, rejected, revised, cancelled }
  invoices:         { thisMonthCount, thisMonthTotal, overdueCount }
  invoicesByStatus: [{ status, count, total }]
  topCustomers:     [{ id, name, shortCode, invoiceCount, invoiceTotal }]  ← top 5
  recentMeetings:   [{ id, title, meetingType, meetingDate, customerName }] ← son 5
  servicesByPriority: [{ priority, count }]
  quotesByMonth:    [{ month, approved, rejected, total }]  ← son 6 ay, raw SQL
  revenueMonthly:   [{ month, total }]  ← son 6 ay; payments JOIN invoices (companyId yok!)
  expiringCerts:    [{ id, certType, certNo, expiryDate, daysLeft, ship }] ← 30 gün, max 20
```

### Diğer
```
GET /api/service-types    (GET: herkese; POST/PUT/DELETE: ADMIN only)
GET /api/products         (GET: herkese; POST/PUT/DELETE: ADMIN only)
GET /api/users            (GET: herkese; POST/PUT/DELETE: ADMIN only)
PUT /api/users/:id/password  (kendi şifresini değiştir)
GET /api/audit            (ADMIN only)
GET /api/notifications/summary  (authenticate)
GET /api/health           (auth gerekmez)
```

---

## Frontend Sayfa Yapısı

### Rotalar (`App.tsx`)
```
/                     LandingPage        (public, authenticated → /dashboard)
/login                LoginPage          (public)
/subscribe            SubscribePage      (public, reCAPTCHA)
/complaint/:slug      PublicComplaintPage (public)
--- AppLayout (authenticated) ---
/dashboard            DashboardPage
/customers/*          CustomersPage
/ships/*              ShipsPage          (SHIPS modülü gerekli)
/services/*           ServicesPage
/quotes/*             QuotesPage
/invoices/*           InvoicesPage
/meetings/*           MeetingsPage
/expenses/*           ExpensesPage       (AdminOnly)
/complaints/*         ComplaintsPage
/documents/*          Placeholder
/reports/*            Placeholder
/settings/*           SettingsPage       (AdminOnly)
/admin/companies      CompaniesPage      (SuperAdminOnly)
```

### Önemli Sayfa Dosyaları
| Dosya | İçerik |
|---|---|
| `pages/dashboard/DashboardPage.tsx` | Recharts BarChart + expiring cert widget |
| `pages/customers/CustomerDetailDrawer.tsx` | Banka hesapları + notlar bölümleri |
| `pages/services/ServiceDetailDrawer.tsx` | ClipboardList butonu → ServiceReportDialog |
| `pages/services/ServiceReportDialog.tsx` | Rapor oluştur/düzenle + yazdır |
| `pages/ships/ShipCertificatesSection.tsx` | Sertifika listesi + genişletilebilir doküman paneli |
| `pages/ships/ShipCertificateFormDialog.tsx` | Sertifika ekle/düzenle (z-[60]) |
| `pages/invoices/InvoiceDetailDrawer.tsx` | Ödeme listesi + ödeme ekle |
| `pages/admin/CompaniesPage.tsx` | SUPER_ADMIN firma yönetimi + modül toggle |
| `pages/settings/SettingsPage.tsx` | Tabs: Kullanıcılar, Denetim, Servis Tipleri, Ürünler, Şirket Profili |
| `pages/complaints/ComplaintsPage.tsx` | Şikayet listesi + form |
| `pages/public/PublicComplaintPage.tsx` | `/complaint/:slug` herkese açık form |

---

## Dosya Yükleme

```
Yerel depolama: ./uploads/       (env.uploadDir)
Statik sunucu:  GET /uploads/*   (express.static)

Alt klasörler:
  /uploads/logos/       ← şirket logoları (2MB, sadece image)
  /uploads/cert-docs/   ← sertifika dokümanları (20MB)

Dosya adı formatı: {timestamp}_{random6char}.{ext}
Erişim URL'i:     /uploads/cert-docs/{storedFilename}
```

---

## Geliştirme Ortamı

### Servisler
```bash
docker compose up -d                  # PostgreSQL 16 (port 5440)
cd backend && npm run dev             # tsx watch (port 3001)
cd frontend && npm run dev            # Vite (port 5173)
```

### Veritabanı Komutları
```bash
cd backend
npx prisma migrate dev --name <ad>   # Migration oluştur + uygula + generate
npx prisma generate                   # Client yenile (schema değişikliği sonrası ZORUNLU)
npx prisma migrate deploy             # Production: pending migration'ları uygula
npx prisma studio                     # GUI (port 5555)
npm run db:seed                       # Seed verisi yükle
```

### TypeScript Derleme Kontrolü
```bash
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

### Ortam Değişkenleri (`backend/.env`)
```env
DATABASE_URL=postgresql://user:pass@localhost:5440/dbname
NODE_ENV=development
JWT_SECRET=<güçlü-rastgele-secret>
JWT_EXPIRES_IN=7d
PORT=3001
UPLOAD_DIR=./uploads
FRONTEND_URL=http://localhost:5173
ADMIN_DOMAIN=admin.siarem.local
RECAPTCHA_SECRET_KEY=<google-recaptcha-secret>
```

---

## Kodlama Kuralları

### Backend — Controller Şablonu
```typescript
export async function list(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId!;
    const result = await svc.listItems(companyId);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
}
```

### Backend — Service Şablonu
```typescript
// Listele — her zaman companyId ile filtrele
export async function listItems(companyId: string) {
  return prisma.entity.findMany({
    where: { companyId, deletedAt: null },   // soft-delete varsa
    orderBy: { createdAt: 'desc' },
  });
}

// Güvenli sil — önce sahipliği doğrula
export async function removeItem(id: string, companyId: string) {
  const item = await prisma.entity.findFirst({ where: { id, companyId } });
  if (!item) throw new Error('Not found');
  return prisma.entity.delete({ where: { id } });
}
```

### Backend — Route Şablonu
```typescript
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/example.controller';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', requireRole('ADMIN', 'MANAGER'), ctrl.create);
router.put('/:id', requireRole('ADMIN', 'MANAGER'), ctrl.update);
router.delete('/:id', requireRole('ADMIN'), ctrl.remove);

export default router;
```

### Frontend — API Client Şablonu
```typescript
// frontend/src/api/example.ts
import api from '@/lib/api';

export const exampleApi = {
  list: (parentId: string) =>
    api.get<{ success: boolean; data: Item[] }>(`/examples/${parentId}/items`),

  create: (parentId: string, data: ItemInput) =>
    api.post<{ success: boolean; data: Item }>(`/examples/${parentId}/items`, data),

  update: (parentId: string, id: string, data: Partial<ItemInput>) =>
    api.put<{ success: boolean; data: Item }>(`/examples/${parentId}/items/${id}`, data),

  delete: (parentId: string, id: string) =>
    api.delete(`/examples/${parentId}/items/${id}`),
};
```

### Frontend — Form + Mutation Şablonu
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

const schema = z.object({ name: z.string().min(1) });
type FormData = z.infer<typeof schema>;

// Bileşen içinde:
const { t } = useTranslation();
const qc = useQueryClient();
const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: existing ?? {},
});

const mutation = useMutation({
  mutationFn: (data: FormData) =>
    existing ? api.update(id, data) : api.create(data),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['entity-key'] });
    onClose();
  },
});

const onSubmit = handleSubmit((data) => mutation.mutate(data));
```

### Frontend — Query Şablonu
```typescript
const { data: res, isLoading } = useQuery({
  queryKey: ['entity-list', parentId],
  queryFn: () => exampleApi.list(parentId),
  enabled: !!parentId,
});

const items = res?.data.data ?? [];
```

### Frontend — 2 Adımlı Silme Onayı (Zorunlu Kalıp)
```tsx
const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

{confirmDeleteId === item.id ? (
  <div className="flex items-center gap-1.5 shrink-0">
    <span className="text-[10px] text-gray-500">{t('common.deleteConfirm')}</span>
    <button onClick={() => deleteMutation.mutate(item.id)}
      className="text-[10px] text-red-600 font-semibold hover:underline">
      {t('common.yes')}
    </button>
    <button onClick={() => setConfirmDeleteId(null)}
      className="text-[10px] text-gray-500 font-semibold hover:underline">
      {t('common.no')}
    </button>
  </div>
) : (
  <button onClick={() => setConfirmDeleteId(item.id)}
    className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors">
    <Trash2 className="w-3.5 h-3.5" />
  </button>
)}
```

---

## i18n

### Mevcut i18n Anahtar Grupları
```
auth.*             Giriş/kayıt ekranı
nav.*              Sidebar nav etiketleri
dashboard.*        Dashboard başlıkları
common.*           Paylaşılan: save, cancel, delete, yes, no, deleteConfirm, uploading…
status.*           Enum etiketleri: active, passive, open, inProgress, draft, paid…
customers.*        Müşteri modülü (bankAccounts.*, assignees.* dahil)
ships.*            Gemi modülü
services.*         Servis modülü (priority.*, billing.*, history.* dahil)
quotes.*           Teklif modülü
invoices.*         Fatura modülü (payments.* dahil)
meetings.*         Toplantı modülü
expenses.*         Masraf modülü (categories.* dahil)
complaints.*       Şikayet modülü
contacts.*         Kişi modülü
settings.*         Ayarlar (users.*, audit.* dahil)
serviceReport.*    Servis raporu modülü
shipCertificate.*  Sertifika modülü (certTypes.* dahil)
customerNote.*     Müşteri notları modülü
landing.*          Landing page
subscribe.*        Kayıt sayfası
```

### Kural
- Tüm UI metinleri `t('key')` ile — asla hardcode Türkçe veya İngilizce yazma
- Yeni anahtar eklerken hem `tr.json` hem `en.json`'a ekle
- Enum çevirisi: `` t(`entity.field.VALUE`, VALUE) `` (fallback ile)

---

## Dark Mode

- Tailwind `darkMode: 'class'` — `<html>` etiketine `.dark` sınıfı eklenir
- `useDarkMode.ts` hook'u localStorage + sistem tercihi ile yönetir
- CSS değişkenleri `index.css`'de HSL formatında (`:root` ve `.dark`)
- Global override'lar `index.css`'de: `.dark select`, `.dark input`, `.dark textarea`,
  `.dark .bg-white → hsl(var(--card))`, `.dark .bg-gray-50 → hsl(var(--muted))`
- Bileşen düzeyinde: `dark:` prefix kullan (örn. `dark:bg-gray-800`, `dark:text-gray-100`)

---

## Zorunlu Kurallar

### Güvenlik
1. **companyId izolasyonu** — Her Prisma sorgusunda `where: { companyId }` olmalı
2. **Sahiplik doğrulama** — Silmeden/güncellemeden önce `findFirst({ where: { id, companyId } })`
3. **SQL injection yok** — `prisma.$queryRaw` kullanırken `${param}` template literal kullan (Prisma parametreli yapar)

### Veritabanı
4. **Schema = tek kaynak** — `schema.prisma` düzenle, ardından `npx prisma generate` çalıştır
5. **Migration dokunulmazlığı** — Mevcut migration SQL'lerini asla düzenleme; yeni migration yaz
6. **`prisma generate` zorunlu** — Schema değiştirdikten sonra backend'i yeniden başlatmadan önce çalıştır

### i18n
7. **Hardcode yazma** — Tüm kullanıcıya görünen metinler `t()` ile
8. **İki dil zorunlu** — Her yeni key hem `tr.json` hem `en.json`'a

### UX
9. **Silme = 2 adım** — Tek tıkla silme yok; her zaman inline confirm kalıbı
10. **Dosya upload** — Multer disk-storage pattern'ini takip et; dizini `fs.mkdirSync(..., { recursive: true })` ile oluştur

### Mimari
11. **Katman ayrımı** — Business logic servislerde; controller sadece HTTP; route sadece yönlendirme
12. **Typed API client** — `axios` doğrudan sayfa/bileşen içinde kullanma; `api/` altındaki wrapper'ları kullan
13. **Query key formatı** — `['entity', id]` veya `['entity-list', parentId]`; `onSuccess`'te `invalidateQueries`

### Yasaklar
- Migration SQL'ini düzenleme
- `req.user.companyId` olmadan Prisma sorgusu yapma
- UI'da hardcode Türkçe/İngilizce metin yazma
- SUPER_ADMIN'e özel ayrı endpoint oluşturma (`requireRole()` zaten bypass eder)
- İki adımlı onay olmadan tek tıkla silme
- Dosya boyutu limitini aşma (logo: 2MB, cert-docs: 20MB)
- Payment sorgusunda `companyId` filtresi uygulamaya çalışma (model'de `companyId` yoktur; JOIN gereklidir)
