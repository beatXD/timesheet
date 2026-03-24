# Landing Page — New Sections Design

**Date:** 2026-03-24
**Status:** Approved

## Overview

Add 6 new sections to the existing landing page to increase conversions and credibility. All new sections use **static content from translation files** (same pattern as existing Hero, Features, HowItWorks). Mock data that looks realistic — to be replaced with real data later.

## Page Order (final)

1. Navbar *(existing)*
2. Hero *(existing)*
3. **Trusted By** *(new)*
4. Features *(existing)*
5. **Product Screenshots** *(new)*
6. How It Works *(existing)*
7. **Use Case Tabs** *(new)*
8. Pricing *(existing — already fetches from DB)*
9. **Comparison Table** *(new)*
10. **Testimonials** *(new)*
11. **FAQ** *(new)*
12. CTA *(existing)*
13. Footer *(existing)*

## Design Decisions

- **Data source:** Static from `messages/en.json` and `messages/th.json` under `landing.*` keys
- **Tone:** Continuation of existing style — no change
- **Mock data:** Realistic Thai/English names, companies, quotes — placeholder for future real data
- **Dark mode:** All sections must support dark mode via existing CSS custom properties
- **i18n:** All visible text must have both Thai and English translations
- **Responsive:** Mobile-first, matching existing breakpoints (`sm:`, `md:`, `lg:`)

---

## Section 1: Trusted By (Logo Wall)

**Layout:** Stats metric + Logo row
**Placement:** Directly below Hero section
**Background:** None (transparent, blends with page)

### Content

- **Stat:** "10,000+" with label "timesheets submitted monthly" / "ไทม์ชีทที่ส่งต่อเดือน"
- **Divider:** Primary color horizontal line
- **Logos:** 5 mock company names displayed as muted/gray pill badges
  - TechCorp, SiamDev, BangkokSoft, CloudThai, DataWorks

### Component Structure

```
TrustedBySection.tsx
├── Stat counter (large number + label)
├── Divider (primary color)
└── Logo row (flex, centered, gap, wrap)
    └── 5x company name badges (muted bg, muted text)
```

### Styling

- Section padding: `py-12 px-4` (smaller than other sections — this is a trust bar, not a full section)
- Stat: `text-4xl font-bold` for number, `text-muted-foreground` for label
- Logos: `bg-muted rounded-lg px-6 py-3 text-muted-foreground font-semibold`
- Responsive: logos wrap on mobile, single row on desktop

### Translation Keys

```
landing.trustedBy.stat: "10,000+"
landing.trustedBy.statLabel: "timesheets submitted monthly"
landing.trustedBy.companies: ["TechCorp", "SiamDev", "BangkokSoft", "CloudThai", "DataWorks"]
```

---

## Section 2: Product Screenshots

**Layout:** Tabbed screenshots — tab buttons switch displayed content
**Placement:** Between Features and How It Works
**Background:** `bg-muted/50`

### Content

- **Headline:** "See it in action" / "ดูการทำงานจริง"
- **Subtitle:** "Explore the key features of our platform" / "สำรวจฟีเจอร์หลักของแพลตฟอร์ม"
- **3 Tabs:**
  1. **Calendar View** — Mock UI showing a monthly calendar with timesheet entries, color-coded days (working, weekend, holiday, leave)
  2. **Approval Workflow** — Mock UI showing a list of submitted timesheets with status badges (draft, submitted, approved) and approve/reject buttons
  3. **Leave Management** — Mock UI showing leave request form and leave balance summary

### Component Structure

```
ProductScreenshotsSection.tsx
├── Section header (title + subtitle)
├── Tab buttons (3 tabs, horizontal, pill-style)
└── Tab content area
    └── Mock UI container (browser chrome frame with dots)
        └── Tab-specific mockup content (built with divs/CSS, not images)
```

### Styling

- Tab buttons: Active tab `bg-primary text-primary-foreground rounded-full`, inactive `bg-muted text-muted-foreground rounded-full`
- Mock browser frame: `bg-card border rounded-xl shadow-lg` with 3 colored dots (red, yellow, green) in header
- Content area: `max-w-4xl mx-auto`
- State management: `useState` for active tab index
- Responsive: tabs stack horizontally, mock UI scales down on mobile

### Tab Mockup Details

Each tab shows a **CSS-only mockup** (no actual screenshots) that represents the UI:

- **Calendar:** 7-column grid for days, colored cells for entry types, month/year header
- **Approval:** Table-like rows with user name, month, status badge, action buttons
- **Leave:** Form fields (date range, type select) + summary card with balances

### Translation Keys

```
landing.screenshots.title
landing.screenshots.subtitle
landing.screenshots.tabs.calendar
landing.screenshots.tabs.approval
landing.screenshots.tabs.leave
landing.screenshots.mockup.calendar.* (month, days, entries)
landing.screenshots.mockup.approval.* (names, statuses)
landing.screenshots.mockup.leave.* (form labels, balances)
```

---

## Section 3: Use Case Tabs

**Layout:** Horizontal tabs + split content (features left, mockup right)
**Placement:** Between How It Works and Pricing
**Background:** None (transparent)

### Content

- **Headline:** "Built for every role" / "ออกแบบมาสำหรับทุกบทบาท"
- **Subtitle:** "See how each role benefits from Timesheet" / "ดูว่าแต่ละบทบาทได้ประโยชน์อย่างไร"
- **3 Tabs:**
  1. **Employee** (icon: User) — "Track time effortlessly and submit with one click"
     - Log daily working hours
     - Submit timesheets for approval
     - Request sick/personal/annual leave
     - Export personal reports (PDF & Excel)
     - View Thai holidays automatically
  2. **Team Leader** (icon: Users) — "Review, approve, and manage your team efficiently"
     - Review team member timesheets
     - Approve or request revisions
     - Submit approved timesheets to admin
     - Monitor team attendance
     - Manage leave requests
  3. **Admin** (icon: Shield) — "Full oversight with powerful management tools"
     - Final approval authority
     - Organization-wide dashboard
     - Manage teams and members
     - Configure holidays and settings
     - Export comprehensive reports

### Component Structure

```
UseCaseSection.tsx
├── Section header (title + subtitle)
├── Tab buttons (3 horizontal tabs)
└── Tab content (split layout)
    ├── Left: role description + feature bullets with Check icons
    └── Right: role-specific mockup placeholder (colored box with icon)
```

### Styling

- Tabs: `bg-primary text-primary-foreground` for active, `bg-muted` for inactive, `rounded-lg` with top corners
- Content container: `bg-card border rounded-xl` below tabs
- Split: `grid md:grid-cols-2 gap-8` — text left, visual right
- Features list: Check icon (`text-green-500`) + text, `space-y-3`
- Right mockup: `bg-primary/5 rounded-lg` with centered icon, same pattern as screenshots section
- Responsive: stacks vertically on mobile (text on top, mockup below)

### Translation Keys

```
landing.useCases.title
landing.useCases.subtitle
landing.useCases.tabs.employee.title
landing.useCases.tabs.employee.description
landing.useCases.tabs.employee.features (array of 5)
landing.useCases.tabs.leader.title
landing.useCases.tabs.leader.description
landing.useCases.tabs.leader.features (array of 5)
landing.useCases.tabs.admin.title
landing.useCases.tabs.admin.description
landing.useCases.tabs.admin.features (array of 5)
```

---

## Section 4: Comparison Table

**Layout:** Full comparison table — Timesheet vs Spreadsheet vs Other Tools
**Placement:** Between Pricing and Testimonials
**Background:** `bg-muted/50`

### Content

- **Headline:** "Why choose Timesheet?" / "ทำไมต้องเลือก Timesheet?"
- **Subtitle:** "See how we compare" / "เปรียบเทียบกับทางเลือกอื่น"
- **Columns:** Timesheet (highlighted), Spreadsheet, Other Tools
- **Rows (7 criteria):**

| Criteria | Timesheet | Spreadsheet | Other Tools |
|----------|-----------|-------------|-------------|
| Approval Workflow | ✅ | ❌ | ⚠️ Partial |
| Thai & English | ✅ | ❌ | ❌ |
| Leave Management | ✅ | ❌ | ✅ |
| Thai Holidays | ✅ | ❌ | ❌ |
| PDF & Excel Export | ✅ | ⚠️ Manual | ✅ |
| Real-time Dashboard | ✅ | ❌ | ✅ |
| Free Plan Available | ✅ | ✅ Free | ⚠️ Limited |

### Component Structure

```
ComparisonSection.tsx
├── Section header (title + subtitle)
└── Comparison table (max-w-4xl, centered)
    ├── Table header row (blank + 3 column headers)
    └── 7 data rows
        ├── Criteria label (left-aligned)
        ├── Timesheet column (highlighted bg)
        ├── Spreadsheet column
        └── Other Tools column
```

### Styling

- Table: `w-full` inside `max-w-4xl mx-auto`
- Timesheet column: `bg-primary/5` background, `border-b-2 border-primary` on header
- Header text: Timesheet in `text-primary font-bold`, others in `text-muted-foreground`
- Cells: centered icons, `py-4` padding, `border-b border-border` between rows
- Icons: ✅ = `text-green-500`, ❌ = `text-red-400`, ⚠️ = `text-yellow-500`
- Responsive: horizontal scroll wrapper on mobile (`overflow-x-auto`)

### Translation Keys

```
landing.comparison.title
landing.comparison.subtitle
landing.comparison.columns.timesheet
landing.comparison.columns.spreadsheet
landing.comparison.columns.otherTools
landing.comparison.criteria (array of 7 objects with label + 3 values)
```

---

## Section 5: Testimonials

**Layout:** 3-column cards grid
**Placement:** Between Comparison Table and FAQ
**Background:** None (transparent)

### Content

- **Headline:** "Loved by teams everywhere" / "ทีมงานทั่วประเทศไว้วางใจ"
- **Subtitle:** "See what our users have to say" / "ฟังเสียงจากผู้ใช้งานจริง"
- **3 Testimonials:**

1. **สมชาย วงศ์ประเสริฐ** — HR Manager, TechCorp Thailand
   - Avatar: initials "ส" on purple bg
   - Quote: "ลดเวลาทำ timesheet จาก **4 ชั่วโมงเหลือ 20 นาที**ต่อเดือน ทีม HR ทั้งแผนกชอบมาก ระบบใช้งานง่าย"
   - Rating: 5 stars

2. **Priya Nakamura** — Team Lead, SiamDev
   - Avatar: initials "P" on blue bg
   - Quote: "Approval workflow ช่วยให้ทีม**ไม่ต้องตาม timesheet ทาง LINE** อีกต่อไป ทุกอย่างอยู่ในระบบเดียว"
   - Rating: 5 stars

3. **วิภา จันทร์สว่าง** — CEO, CloudThai
   - Avatar: initials "ว" on amber bg
   - Quote: "ระบบ leave management + วันหยุดไทย ทำให้**ไม่ต้องเช็คปฏิทินแยก** ประหยัดเวลา HR มาก"
   - Rating: 5 stars

### Component Structure

```
TestimonialsSection.tsx
├── Section header (title + subtitle)
└── 3-column grid (md:grid-cols-3)
    └── TestimonialCard (×3)
        ├── Star rating (5 stars, primary color)
        ├── Quote text (with <strong> on key metric)
        └── Author info
            ├── Avatar (initials circle, colored bg)
            ├── Name (font-semibold)
            └── Title + Company (text-muted-foreground)
```

### Styling

- Grid: `grid md:grid-cols-3 gap-6 max-w-5xl mx-auto`
- Card: `bg-card border rounded-xl p-6 shadow-sm`
- Stars: `text-primary` (using Star icon from lucide-react)
- Quote: `text-muted-foreground text-sm leading-relaxed`, bold metric in `font-semibold text-foreground`
- Avatar: `w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold`
  - Colors: purple (`bg-primary/10 text-primary`), blue (`bg-blue-100 text-blue-600`), amber (`bg-amber-100 text-amber-600`)
- Responsive: single column on mobile, 3 columns on `md:`

### Translation Keys

```
landing.testimonials.title
landing.testimonials.subtitle
landing.testimonials.items (array of 3 objects)
  .name, .role, .company, .quote, .initial, .avatarColor
```

---

## Section 6: FAQ

**Layout:** Accordion collapsible — click to expand/collapse each question
**Placement:** Between Testimonials and CTA
**Background:** `bg-muted/50`

### Content

- **Headline:** "Frequently Asked Questions" / "คำถามที่พบบ่อย"
- **Subtitle:** "Everything you need to know" / "ทุกสิ่งที่คุณอยากรู้"
- **6 Questions:**

1. **ทดลองใช้ฟรีได้ไหม?** — ได้ครับ! แผน Free ใช้งานได้ทันทีไม่จำกัดเวลา รองรับ 1 ผู้ใช้ พร้อม export PDF & Excel ไม่ต้องใส่บัตรเครดิต
2. **ข้อมูลปลอดภัยแค่ไหน?** — ข้อมูลถูกเข้ารหัสทั้ง at-rest และ in-transit รหัสผ่านใช้ bcrypt hashing ระบบรองรับ OAuth (Google, GitHub) สำหรับการเข้าสู่ระบบที่ปลอดภัยยิ่งขึ้น
3. **รองรับภาษาอะไรบ้าง?** — รองรับภาษาไทยและอังกฤษ สลับได้ทุกเมื่อผ่านปุ่มที่มุมขวาบน ทั้ง UI และ export รองรับทั้ง 2 ภาษา
4. **ยกเลิก subscription ได้ไหม?** — ยกเลิกได้ทุกเมื่อ ใช้งานต่อได้จนสิ้นรอบบิล ไม่มีค่าปรับหรือค่าธรรมเนียมซ่อน
5. **ใช้งานบนมือถือได้ไหม?** — ได้ครับ เว็บไซต์เป็น Responsive Design ใช้งานได้ทุกอุปกรณ์ทั้งมือถือ แท็บเล็ต และคอมพิวเตอร์
6. **วันหยุดไทยอัปเดตอัตโนมัติไหม?** — ระบบมีวันหยุดราชการไทยครบทุกวัน อัปเดตให้ทุกปี ไม่ต้องเพิ่มเองทีละวัน

### Component Structure

```
FAQSection.tsx
├── Section header (title + subtitle)
└── FAQ container (max-w-3xl, centered)
    └── FAQ items (×6)
        ├── Question button (click to toggle)
        │   ├── Question text (font-semibold)
        │   └── Plus/Minus icon (ChevronDown, rotates on open)
        └── Answer panel (collapsible, animated height)
            └── Answer text (text-muted-foreground)
```

### Styling

- Container: `max-w-3xl mx-auto space-y-3`
- Item wrapper: `bg-card border rounded-xl overflow-hidden`
- Question button: `w-full flex justify-between items-center p-4 hover:bg-muted/50 transition-colors cursor-pointer`
- Question text: `text-left font-semibold`
- Toggle icon: `ChevronDown` from lucide-react, `transition-transform duration-200`, rotated 180deg when open
- Answer: `px-4 pb-4 text-muted-foreground text-sm leading-relaxed`
- Animation: CSS transition on `max-height` or use `data-[state=open]` pattern
- State: `useState<number | null>` for currently open index (only one open at a time)
- Responsive: full width, padding adjusts on mobile

### Translation Keys

```
landing.faq.title
landing.faq.subtitle
landing.faq.items (array of 6 objects)
  .question, .answer
```

---

## New Files to Create

| File | Type |
|------|------|
| `src/components/landing/TrustedBySection.tsx` | Component |
| `src/components/landing/ProductScreenshotsSection.tsx` | Component |
| `src/components/landing/UseCaseSection.tsx` | Component |
| `src/components/landing/ComparisonSection.tsx` | Component |
| `src/components/landing/TestimonialsSection.tsx` | Component |
| `src/components/landing/FAQSection.tsx` | Component |

## Files to Modify

| File | Change |
|------|--------|
| `src/app/(marketing)/page.tsx` | Add new section imports and insert in correct order |
| `src/components/landing/index.ts` | Add barrel exports for new components |
| `messages/en.json` | Add all new translation keys under `landing.*` |
| `messages/th.json` | Add all new translation keys under `landing.*` |

## Icons Needed (from lucide-react)

- `Star` — testimonial ratings
- `ChevronDown` — FAQ accordion toggle
- `Shield` — admin role icon in Use Case
- `User`, `Users` — already imported, reuse for Use Case tabs
- `Check` — already imported, reuse for feature lists
- `Monitor` — optional, for screenshots tab indicator

## No New Dependencies

All sections use existing libraries: `next-intl`, `lucide-react`, Tailwind CSS, shadcn/ui primitives. No new packages needed.
