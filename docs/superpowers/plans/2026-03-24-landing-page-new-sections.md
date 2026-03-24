# Landing Page New Sections — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6 new sections (Trusted By, Product Screenshots, Use Case Tabs, Comparison Table, Testimonials, FAQ) to the landing page with full i18n support.

**Architecture:** Static components using `next-intl` translation files for all content. No new API routes or database models. Each section is a standalone `"use client"` component following existing patterns (section wrapper, container, responsive grid).

**Tech Stack:** Next.js 16, React, Tailwind CSS 4, next-intl, lucide-react, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-24-landing-page-new-sections-design.md`

---

## Chunk 1: Translation Files + Simple Sections (Trusted By, Comparison, Testimonials)

### Task 1: Add all translation keys to en.json

**Files:**
- Modify: `messages/en.json` (add keys under `landing.*`)

- [ ] **Step 1: Add all new landing translation keys to en.json**

Open `messages/en.json`, find the `"landing"` object, and add these keys at the end of it (before the closing `}` of the `landing` object):

```json
"trustedBy": {
  "stat": "10,000+",
  "statLabel": "timesheets submitted monthly",
  "company0": "TechCorp",
  "company1": "SiamDev",
  "company2": "BangkokSoft",
  "company3": "CloudThai",
  "company4": "DataWorks"
},
"screenshots": {
  "title": "See It in Action",
  "subtitle": "Explore the key features of our platform",
  "tabs": {
    "calendar": "Calendar View",
    "approval": "Approval Workflow",
    "leave": "Leave Management"
  },
  "mockup": {
    "calendar": {
      "month": "March 2026",
      "days": "Mon,Tue,Wed,Thu,Fri,Sat,Sun"
    },
    "approval": {
      "title": "Pending Approvals",
      "approve": "Approve",
      "reject": "Reject",
      "pending": "Pending",
      "approved": "Approved"
    },
    "leave": {
      "formTitle": "New Leave Request",
      "leaveType": "Leave Type",
      "annualLeave": "Annual Leave",
      "dateFrom": "Date From",
      "dateTo": "Date To",
      "submit": "Submit Request",
      "balanceTitle": "Leave Balance",
      "annual": "Annual",
      "sick": "Sick",
      "personal": "Personal"
    }
  }
},
"useCases": {
  "title": "Built for Every Role",
  "subtitle": "See how each role benefits from Timesheet",
  "tabs": {
    "employee": {
      "title": "Employee",
      "description": "Track time effortlessly and submit with one click",
      "features": {
        "0": "Log daily working hours",
        "1": "Submit timesheets for approval",
        "2": "Request sick, personal & annual leave",
        "3": "Export personal reports (PDF & Excel)",
        "4": "View Thai holidays automatically"
      }
    },
    "leader": {
      "title": "Team Leader",
      "description": "Review, approve, and manage your team efficiently",
      "features": {
        "0": "Review team member timesheets",
        "1": "Approve or request revisions",
        "2": "Submit approved timesheets to admin",
        "3": "Monitor team attendance",
        "4": "Manage leave requests"
      }
    },
    "admin": {
      "title": "Admin",
      "description": "Full oversight with powerful management tools",
      "features": {
        "0": "Final approval authority",
        "1": "Organization-wide dashboard",
        "2": "Manage teams and members",
        "3": "Configure holidays and settings",
        "4": "Export comprehensive reports"
      }
    }
  }
},
"comparison": {
  "title": "Why Choose Timesheet?",
  "subtitle": "See how we compare to alternatives",
  "columns": {
    "timesheet": "Timesheet",
    "spreadsheet": "Spreadsheet",
    "otherTools": "Other Tools"
  },
  "criteria": {
    "0": { "label": "Approval Workflow" },
    "1": { "label": "Thai & English" },
    "2": { "label": "Leave Management" },
    "3": { "label": "Thai Holidays" },
    "4": { "label": "PDF & Excel Export" },
    "5": { "label": "Real-time Dashboard" },
    "6": { "label": "Free Plan Available" }
  }
},
"testimonials": {
  "title": "Loved by Teams Everywhere",
  "subtitle": "See what our users have to say",
  "items": {
    "0": {
      "name": "Somchai Wongprasert",
      "role": "HR Manager",
      "company": "TechCorp Thailand",
      "quoteBefore": "Reduced timesheet processing from ",
      "quoteBold": "4 hours to just 20 minutes",
      "quoteAfter": " per month. The entire HR team loves how easy it is to use."
    },
    "1": {
      "name": "Priya Nakamura",
      "role": "Team Lead",
      "company": "SiamDev",
      "quoteBefore": "The approval workflow means our team ",
      "quoteBold": "no longer chases timesheets on LINE",
      "quoteAfter": ". Everything is in one system."
    },
    "2": {
      "name": "Wipa Chansawang",
      "role": "CEO",
      "company": "CloudThai",
      "quoteBefore": "Leave management with Thai holidays means ",
      "quoteBold": "no more checking separate calendars",
      "quoteAfter": ". Saves our HR team so much time."
    }
  }
},
"faq": {
  "title": "Frequently Asked Questions",
  "subtitle": "Everything you need to know",
  "items": {
    "0": {
      "question": "Can I try it for free?",
      "answer": "Yes! The Free plan is available immediately with no time limit. It supports 1 user with PDF & Excel export. No credit card required."
    },
    "1": {
      "question": "How secure is my data?",
      "answer": "All data is encrypted at rest and in transit. Passwords use bcrypt hashing. We also support OAuth login via Google and GitHub for enhanced security."
    },
    "2": {
      "question": "What languages are supported?",
      "answer": "We support Thai and English. You can switch languages anytime via the button in the top-right corner. Both the UI and exported reports support both languages."
    },
    "3": {
      "question": "Can I cancel my subscription?",
      "answer": "Yes, you can cancel anytime. You'll continue to have access until the end of your billing period. No penalties or hidden fees."
    },
    "4": {
      "question": "Does it work on mobile?",
      "answer": "Yes! The website uses responsive design and works on all devices — mobile phones, tablets, and desktop computers."
    },
    "5": {
      "question": "Are Thai holidays updated automatically?",
      "answer": "Yes, the system includes all Thai public holidays and they are updated annually. You don't need to add them manually."
    }
  }
}
```

- [ ] **Step 2: Verify en.json is valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('Valid JSON')"`
Expected: `Valid JSON`

- [ ] **Step 3: Commit**

```bash
git add messages/en.json
git commit -m "feat: add English translations for 6 new landing sections"
```

---

### Task 2: Add all translation keys to th.json

**Files:**
- Modify: `messages/th.json` (add keys under `landing.*`)

- [ ] **Step 1: Add all new landing translation keys to th.json**

Same structure as en.json but with Thai translations. Add inside the `"landing"` object:

```json
"trustedBy": {
  "stat": "10,000+",
  "statLabel": "ไทม์ชีทที่ส่งต่อเดือน",
  "company0": "TechCorp",
  "company1": "SiamDev",
  "company2": "BangkokSoft",
  "company3": "CloudThai",
  "company4": "DataWorks"
},
"screenshots": {
  "title": "ดูการทำงานจริง",
  "subtitle": "สำรวจฟีเจอร์หลักของแพลตฟอร์ม",
  "tabs": {
    "calendar": "ปฏิทิน",
    "approval": "อนุมัติ",
    "leave": "ลางาน"
  },
  "mockup": {
    "calendar": {
      "month": "มีนาคม 2569",
      "days": "จ,อ,พ,พฤ,ศ,ส,อา"
    },
    "approval": {
      "title": "รออนุมัติ",
      "approve": "อนุมัติ",
      "reject": "ปฏิเสธ",
      "pending": "รอดำเนินการ",
      "approved": "อนุมัติแล้ว"
    },
    "leave": {
      "formTitle": "ขอลางานใหม่",
      "leaveType": "ประเภทการลา",
      "annualLeave": "ลาพักร้อน",
      "dateFrom": "วันที่เริ่ม",
      "dateTo": "วันที่สิ้นสุด",
      "submit": "ส่งคำขอ",
      "balanceTitle": "วันลาคงเหลือ",
      "annual": "พักร้อน",
      "sick": "ลาป่วย",
      "personal": "ลากิจ"
    }
  }
},
"useCases": {
  "title": "ออกแบบมาสำหรับทุกบทบาท",
  "subtitle": "ดูว่าแต่ละบทบาทได้ประโยชน์อย่างไร",
  "tabs": {
    "employee": {
      "title": "พนักงาน",
      "description": "บันทึกเวลาอย่างง่ายดาย ส่งได้ในคลิกเดียว",
      "features": {
        "0": "บันทึกชั่วโมงทำงานรายวัน",
        "1": "ส่งไทม์ชีทเพื่อขออนุมัติ",
        "2": "ขอลาป่วย ลากิจ และลาพักร้อน",
        "3": "ส่งออกรายงานส่วนตัว (PDF & Excel)",
        "4": "ดูวันหยุดราชการไทยอัตโนมัติ"
      }
    },
    "leader": {
      "title": "หัวหน้าทีม",
      "description": "ตรวจสอบ อนุมัติ และจัดการทีมอย่างมีประสิทธิภาพ",
      "features": {
        "0": "ตรวจสอบไทม์ชีทของสมาชิกในทีม",
        "1": "อนุมัติหรือขอแก้ไข",
        "2": "ส่งไทม์ชีทที่อนุมัติแล้วให้แอดมิน",
        "3": "ติดตามการเข้างานของทีม",
        "4": "จัดการคำขอลางาน"
      }
    },
    "admin": {
      "title": "แอดมิน",
      "description": "ดูภาพรวมทั้งหมดด้วยเครื่องมือจัดการอันทรงพลัง",
      "features": {
        "0": "อำนาจอนุมัติขั้นสุดท้าย",
        "1": "แดชบอร์ดภาพรวมทั้งองค์กร",
        "2": "จัดการทีมและสมาชิก",
        "3": "ตั้งค่าวันหยุดและการตั้งค่าต่างๆ",
        "4": "ส่งออกรายงานครบถ้วน"
      }
    }
  }
},
"comparison": {
  "title": "ทำไมต้องเลือก Timesheet?",
  "subtitle": "เปรียบเทียบกับทางเลือกอื่น",
  "columns": {
    "timesheet": "Timesheet",
    "spreadsheet": "Spreadsheet",
    "otherTools": "เครื่องมืออื่น"
  },
  "criteria": {
    "0": { "label": "ระบบอนุมัติ" },
    "1": { "label": "ไทย & อังกฤษ" },
    "2": { "label": "จัดการวันลา" },
    "3": { "label": "วันหยุดราชการไทย" },
    "4": { "label": "ส่งออก PDF & Excel" },
    "5": { "label": "แดชบอร์ดเรียลไทม์" },
    "6": { "label": "แผนฟรี" }
  }
},
"testimonials": {
  "title": "ทีมงานทั่วประเทศไว้วางใจ",
  "subtitle": "ฟังเสียงจากผู้ใช้งานจริง",
  "items": {
    "0": {
      "name": "สมชาย วงศ์ประเสริฐ",
      "role": "HR Manager",
      "company": "TechCorp Thailand",
      "quoteBefore": "ลดเวลาทำ timesheet จาก ",
      "quoteBold": "4 ชั่วโมงเหลือ 20 นาที",
      "quoteAfter": "ต่อเดือน ทีม HR ทั้งแผนกชอบมาก ระบบใช้งานง่าย"
    },
    "1": {
      "name": "Priya Nakamura",
      "role": "Team Lead",
      "company": "SiamDev",
      "quoteBefore": "Approval workflow ช่วยให้ทีม",
      "quoteBold": "ไม่ต้องตาม timesheet ทาง LINE",
      "quoteAfter": " อีกต่อไป ทุกอย่างอยู่ในระบบเดียว"
    },
    "2": {
      "name": "วิภา จันทร์สว่าง",
      "role": "CEO",
      "company": "CloudThai",
      "quoteBefore": "ระบบ leave management + วันหยุดไทย ทำให้",
      "quoteBold": "ไม่ต้องเช็คปฏิทินแยก",
      "quoteAfter": " ประหยัดเวลา HR มาก"
    }
  }
},
"faq": {
  "title": "คำถามที่พบบ่อย",
  "subtitle": "ทุกสิ่งที่คุณอยากรู้",
  "items": {
    "0": {
      "question": "ทดลองใช้ฟรีได้ไหม?",
      "answer": "ได้ครับ! แผน Free ใช้งานได้ทันทีไม่จำกัดเวลา รองรับ 1 ผู้ใช้ พร้อม export PDF & Excel ไม่ต้องใส่บัตรเครดิต"
    },
    "1": {
      "question": "ข้อมูลปลอดภัยแค่ไหน?",
      "answer": "ข้อมูลถูกเข้ารหัสทั้ง at-rest และ in-transit รหัสผ่านใช้ bcrypt hashing ระบบรองรับ OAuth (Google, GitHub) สำหรับการเข้าสู่ระบบที่ปลอดภัยยิ่งขึ้น"
    },
    "2": {
      "question": "รองรับภาษาอะไรบ้าง?",
      "answer": "รองรับภาษาไทยและอังกฤษ สลับได้ทุกเมื่อผ่านปุ่มที่มุมขวาบน ทั้ง UI และ export รองรับทั้ง 2 ภาษา"
    },
    "3": {
      "question": "ยกเลิก subscription ได้ไหม?",
      "answer": "ยกเลิกได้ทุกเมื่อ ใช้งานต่อได้จนสิ้นรอบบิล ไม่มีค่าปรับหรือค่าธรรมเนียมซ่อน"
    },
    "4": {
      "question": "ใช้งานบนมือถือได้ไหม?",
      "answer": "ได้ครับ เว็บไซต์เป็น Responsive Design ใช้งานได้ทุกอุปกรณ์ทั้งมือถือ แท็บเล็ต และคอมพิวเตอร์"
    },
    "5": {
      "question": "วันหยุดไทยอัปเดตอัตโนมัติไหม?",
      "answer": "ระบบมีวันหยุดราชการไทยครบทุกวัน อัปเดตให้ทุกปี ไม่ต้องเพิ่มเองทีละวัน"
    }
  }
}
```

- [ ] **Step 2: Verify th.json is valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/th.json','utf8')); console.log('Valid JSON')"`
Expected: `Valid JSON`

- [ ] **Step 3: Commit**

```bash
git add messages/th.json
git commit -m "feat: add Thai translations for 6 new landing sections"
```

---

### Task 3: Create TrustedBySection component

**Files:**
- Create: `src/components/landing/TrustedBySection.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useTranslations } from "next-intl";

const COMPANY_COUNT = 5;

export function TrustedBySection() {
  const t = useTranslations("landing");

  return (
    <section id="trusted-by" className="py-12 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-6">
          <span className="text-4xl font-bold">{t("trustedBy.stat")}</span>
          <span className="text-muted-foreground ml-2">
            {t("trustedBy.statLabel")}
          </span>
        </div>
        <div className="w-16 h-0.5 bg-primary mx-auto mb-6" />
        <div className="flex justify-center items-center gap-4 flex-wrap">
          {Array.from({ length: COMPANY_COUNT }).map((_, i) => (
            <div
              key={i}
              className="bg-muted rounded-lg px-6 py-3 text-muted-foreground font-semibold text-sm"
            >
              {t(`trustedBy.company${i}`)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | grep TrustedBySection || echo "No errors"`
Expected: `No errors`

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/TrustedBySection.tsx
git commit -m "feat: add TrustedBySection component"
```

---

### Task 4: Create ComparisonSection component

**Files:**
- Create: `src/components/landing/ComparisonSection.tsx`

- [ ] **Step 1: Create the component**

The comparison data (icon states) lives in the component, only labels come from translations.

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Check, X, AlertTriangle } from "lucide-react";

type CellStatus = "yes" | "no" | "partial";

const CRITERIA_DATA: { timesheet: CellStatus; spreadsheet: CellStatus; otherTools: CellStatus }[] = [
  { timesheet: "yes", spreadsheet: "no", otherTools: "partial" },    // Approval Workflow
  { timesheet: "yes", spreadsheet: "no", otherTools: "no" },         // Thai & English
  { timesheet: "yes", spreadsheet: "no", otherTools: "yes" },        // Leave Management
  { timesheet: "yes", spreadsheet: "no", otherTools: "no" },         // Thai Holidays
  { timesheet: "yes", spreadsheet: "partial", otherTools: "yes" },   // PDF & Excel Export
  { timesheet: "yes", spreadsheet: "no", otherTools: "yes" },        // Real-time Dashboard
  { timesheet: "yes", spreadsheet: "yes", otherTools: "partial" },   // Free Plan
];

function StatusIcon({ status }: { status: CellStatus }) {
  switch (status) {
    case "yes":
      return <Check className="h-5 w-5 text-green-500 mx-auto" />;
    case "no":
      return <X className="h-5 w-5 text-red-400 mx-auto" />;
    case "partial":
      return <AlertTriangle className="h-5 w-5 text-yellow-500 mx-auto" />;
  }
}

export function ComparisonSection() {
  const t = useTranslations("landing");

  return (
    <section id="comparison" className="py-20 px-4 bg-muted/50">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("comparison.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("comparison.subtitle")}
          </p>
        </div>

        <div className="max-w-4xl mx-auto overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left py-4 px-4" />
                <th className="py-4 px-4 text-primary font-bold border-b-2 border-primary bg-primary/5 rounded-t-lg">
                  {t("comparison.columns.timesheet")}
                </th>
                <th className="py-4 px-4 text-muted-foreground font-medium border-b-2 border-border">
                  {t("comparison.columns.spreadsheet")}
                </th>
                <th className="py-4 px-4 text-muted-foreground font-medium border-b-2 border-border">
                  {t("comparison.columns.otherTools")}
                </th>
              </tr>
            </thead>
            <tbody>
              {CRITERIA_DATA.map((row, i) => (
                <tr key={i}>
                  <td className="py-4 px-4 font-medium border-b border-border">
                    {t(`comparison.criteria.${i}.label`)}
                  </td>
                  <td className="py-4 px-4 border-b border-border bg-primary/5 text-center">
                    <StatusIcon status={row.timesheet} />
                  </td>
                  <td className="py-4 px-4 border-b border-border text-center">
                    <StatusIcon status={row.spreadsheet} />
                  </td>
                  <td className="py-4 px-4 border-b border-border text-center">
                    <StatusIcon status={row.otherTools} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | grep ComparisonSection || echo "No errors"`
Expected: `No errors`

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/ComparisonSection.tsx
git commit -m "feat: add ComparisonSection component"
```

---

### Task 5: Create TestimonialsSection component

**Files:**
- Create: `src/components/landing/TestimonialsSection.tsx`

- [ ] **Step 1: Create the component**

Avatar styling data lives in component code, text comes from translations.

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Star } from "lucide-react";

const TESTIMONIAL_STYLES = [
  { initial: "S", bgClass: "bg-primary/10", textClass: "text-primary" },
  { initial: "P", bgClass: "bg-blue-100 dark:bg-blue-900/30", textClass: "text-blue-600 dark:text-blue-400" },
  { initial: "W", bgClass: "bg-amber-100 dark:bg-amber-900/30", textClass: "text-amber-600 dark:text-amber-400" },
];

export function TestimonialsSection() {
  const t = useTranslations("landing");

  return (
    <section id="testimonials" className="py-20 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("testimonials.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("testimonials.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {TESTIMONIAL_STYLES.map((style, i) => (
            <div
              key={i}
              className="bg-card border rounded-xl p-6 shadow-sm"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                &ldquo;{t(`testimonials.items.${i}.quoteBefore`)}
                <strong className="font-semibold text-foreground">
                  {t(`testimonials.items.${i}.quoteBold`)}
                </strong>
                {t(`testimonials.items.${i}.quoteAfter`)}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${style.bgClass} ${style.textClass}`}
                >
                  {style.initial}
                </div>
                <div>
                  <p className="font-semibold text-sm">
                    {t(`testimonials.items.${i}.name`)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(`testimonials.items.${i}.role`)}, {t(`testimonials.items.${i}.company`)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | grep TestimonialsSection || echo "No errors"`
Expected: `No errors`

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/TestimonialsSection.tsx
git commit -m "feat: add TestimonialsSection component"
```

---

## Chunk 2: Interactive Sections (Product Screenshots, Use Case Tabs, FAQ)

### Task 6: Create ProductScreenshotsSection component

**Files:**
- Create: `src/components/landing/ProductScreenshotsSection.tsx`

- [ ] **Step 1: Create the component**

This is the largest component — it has 3 tab-specific CSS mockup UIs inside a browser chrome frame.

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-xl shadow-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
      </div>
      <div className="p-4 md:p-6">{children}</div>
    </div>
  );
}

function CalendarMockup({ t }: { t: ReturnType<typeof useTranslations> }) {
  const days = (t("screenshots.mockup.calendar.days") as string).split(",");
  // Mock calendar: 5 weeks, some working, some weekend, some holiday/leave
  const cells = [
    null, null, null, null, null, "weekend", "weekend",
    "work", "work", "work", "work", "work", "weekend", "weekend",
    "work", "work", "holiday", "work", "work", "weekend", "weekend",
    "work", "leave", "work", "work", "work", "weekend", "weekend",
    "work", "work", "work", "work", "work", "weekend", "weekend",
  ];
  const cellStyles: Record<string, string> = {
    work: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    weekend: "bg-muted text-muted-foreground",
    holiday: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    leave: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
  };
  const cellLabels: Record<string, string> = { work: "8h", weekend: "OFF", holiday: "Holiday", leave: "Leave" };

  return (
    <div>
      <p className="text-center font-semibold mb-3">{t("screenshots.mockup.calendar.month")}</p>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
        {cells.map((cell, i) => (
          <div
            key={i}
            className={`text-center text-[10px] rounded p-1.5 ${cell ? cellStyles[cell] : ""}`}
          >
            {cell ? cellLabels[cell] : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function ApprovalMockup({ t }: { t: ReturnType<typeof useTranslations> }) {
  const rows = [
    { name: "สมชาย ว.", month: "Mar 2026", status: "pending", initial: "ส" },
    { name: "Priya N.", month: "Mar 2026", status: "approved", initial: "P" },
    { name: "วิภา จ.", month: "Mar 2026", status: "pending", initial: "ว" },
    { name: "John D.", month: "Feb 2026", status: "approved", initial: "J" },
  ];

  return (
    <div>
      <p className="font-semibold mb-3">{t("screenshots.mockup.approval.title")}</p>
      <div className="space-y-0">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
              {row.initial}
            </div>
            <span className="text-xs font-medium flex-1">{row.name}</span>
            <span className="text-[10px] text-muted-foreground">{row.month}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
              row.status === "pending"
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
            }`}>
              {t(`screenshots.mockup.approval.${row.status}`)}
            </span>
            {row.status === "pending" && (
              <div className="flex gap-1">
                <button className="text-[9px] bg-primary text-primary-foreground px-2 py-0.5 rounded">
                  {t("screenshots.mockup.approval.approve")}
                </button>
                <button className="text-[9px] border px-2 py-0.5 rounded">
                  {t("screenshots.mockup.approval.reject")}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaveMockup({ t }: { t: ReturnType<typeof useTranslations> }) {
  const balances = [
    { key: "annual", used: 10, total: 15 },
    { key: "sick", used: 2, total: 30 },
    { key: "personal", used: 1, total: 5 },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <p className="font-semibold mb-3">{t("screenshots.mockup.leave.formTitle")}</p>
        <div className="space-y-2">
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">{t("screenshots.mockup.leave.leaveType")}</p>
            <div className="bg-muted rounded px-3 py-1.5 text-xs">{t("screenshots.mockup.leave.annualLeave")}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">{t("screenshots.mockup.leave.dateFrom")}</p>
              <div className="bg-muted rounded px-3 py-1.5 text-xs text-muted-foreground">2026-03-25</div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">{t("screenshots.mockup.leave.dateTo")}</p>
              <div className="bg-muted rounded px-3 py-1.5 text-xs text-muted-foreground">2026-03-26</div>
            </div>
          </div>
          <button className="bg-primary text-primary-foreground text-xs px-4 py-1.5 rounded w-full">
            {t("screenshots.mockup.leave.submit")}
          </button>
        </div>
      </div>
      <div>
        <p className="font-semibold mb-3">{t("screenshots.mockup.leave.balanceTitle")}</p>
        <div className="space-y-3">
          {balances.map((b) => (
            <div key={b.key}>
              <div className="flex justify-between text-xs mb-1">
                <span>{t(`screenshots.mockup.leave.${b.key}`)}</span>
                <span className="text-muted-foreground">{b.used}/{b.total}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${(b.used / b.total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProductScreenshotsSection() {
  const t = useTranslations("landing");
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { key: "calendar", component: <CalendarMockup t={t} /> },
    { key: "approval", component: <ApprovalMockup t={t} /> },
    { key: "leave", component: <LeaveMockup t={t} /> },
  ];

  return (
    <section id="screenshots" className="py-20 px-4 bg-muted/50">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("screenshots.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("screenshots.subtitle")}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center gap-2 mb-6">
            {tabs.map((tab, i) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === i
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {t(`screenshots.tabs.${tab.key}`)}
              </button>
            ))}
          </div>

          <BrowserFrame>{tabs[activeTab].component}</BrowserFrame>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | grep ProductScreenshotsSection || echo "No errors"`
Expected: `No errors`

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/ProductScreenshotsSection.tsx
git commit -m "feat: add ProductScreenshotsSection with tabbed CSS mockups"
```

---

### Task 7: Create UseCaseSection component

**Files:**
- Create: `src/components/landing/UseCaseSection.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { User, Users, Shield, Check } from "lucide-react";

const TAB_KEYS = ["employee", "leader", "admin"] as const;
const TAB_ICONS = [User, Users, Shield];
const FEATURE_COUNT = 5;

export function UseCaseSection() {
  const t = useTranslations("landing");
  const [activeTab, setActiveTab] = useState(0);

  const tabKey = TAB_KEYS[activeTab];
  const TabIcon = TAB_ICONS[activeTab];

  return (
    <section id="use-cases" className="py-20 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("useCases.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("useCases.subtitle")}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Tab buttons */}
          <div className="flex">
            {TAB_KEYS.map((key, i) => {
              const Icon = TAB_ICONS[i];
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(i)}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === i
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t(`useCases.tabs.${key}.title`)}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="bg-card border rounded-b-xl rounded-tr-xl p-6 md:p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <p className="text-muted-foreground mb-4">
                  {t(`useCases.tabs.${tabKey}.description`)}
                </p>
                <ul className="space-y-3">
                  {Array.from({ length: FEATURE_COUNT }).map((_, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500 shrink-0" />
                      <span className="text-sm">
                        {t(`useCases.tabs.${tabKey}.features.${i}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-primary/5 rounded-lg flex items-center justify-center min-h-[200px]">
                <TabIcon className="h-16 w-16 text-primary/30" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | grep UseCaseSection || echo "No errors"`
Expected: `No errors`

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/UseCaseSection.tsx
git commit -m "feat: add UseCaseSection with role-based tabs"
```

---

### Task 8: Create FAQSection component

**Files:**
- Create: `src/components/landing/FAQSection.tsx`

- [ ] **Step 1: Create the component**

Uses CSS grid-template-rows transition for smooth accordion animation.

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

const FAQ_COUNT = 6;

export function FAQSection() {
  const t = useTranslations("landing");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <section id="faq" className="py-20 px-4 bg-muted/50">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("faq.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("faq.subtitle")}
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {Array.from({ length: FAQ_COUNT }).map((_, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={i} className="bg-card border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex justify-between items-center p-4 hover:bg-muted/50 transition-colors cursor-pointer text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold pr-4">
                    {t(`faq.items.${i}.question`)}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className="grid transition-[grid-template-rows] duration-200"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  role="region"
                >
                  <div className="overflow-hidden">
                    <p className="px-4 pb-4 text-muted-foreground text-sm leading-relaxed">
                      {t(`faq.items.${i}.answer`)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | grep FAQSection || echo "No errors"`
Expected: `No errors`

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/FAQSection.tsx
git commit -m "feat: add FAQSection with accessible accordion"
```

---

## Chunk 3: Wiring + Verification

### Task 9: Update barrel exports

**Files:**
- Modify: `src/components/landing/index.ts`

- [ ] **Step 1: Add all 6 new exports**

Add these lines after the existing exports in `src/components/landing/index.ts`:

```ts
export { TrustedBySection } from "./TrustedBySection";
export { ProductScreenshotsSection } from "./ProductScreenshotsSection";
export { UseCaseSection } from "./UseCaseSection";
export { ComparisonSection } from "./ComparisonSection";
export { TestimonialsSection } from "./TestimonialsSection";
export { FAQSection } from "./FAQSection";
```

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/index.ts
git commit -m "feat: export new landing section components"
```

---

### Task 10: Wire sections into the landing page

**Files:**
- Modify: `src/app/(marketing)/page.tsx`

- [ ] **Step 1: Update the page to import and render all new sections in correct order**

Replace the entire file content with:

```tsx
import {
  Navbar,
  HeroSection,
  TrustedBySection,
  FeaturesSection,
  ProductScreenshotsSection,
  HowItWorksSection,
  UseCaseSection,
  PricingSection,
  ComparisonSection,
  TestimonialsSection,
  FAQSection,
  CTASection,
  Footer,
} from "@/components/landing";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <TrustedBySection />
        <FeaturesSection />
        <ProductScreenshotsSection />
        <HowItWorksSection />
        <UseCaseSection />
        <PricingSection />
        <ComparisonSection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -E "(page\.tsx|error)" | head -5 || echo "No errors"`
Expected: No errors related to page.tsx

- [ ] **Step 3: Commit**

```bash
git add src/app/(marketing)/page.tsx
git commit -m "feat: wire 6 new sections into landing page"
```

---

### Task 11: Build verification

- [ ] **Step 1: Run the dev server build check**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds. All pages compile. No errors.

- [ ] **Step 2: Visual verification**

Run: `npm run dev` and check these pages in the browser:
- `http://localhost:3000` — Landing page with all 13 sections in correct order
- Verify all sections render, text displays in current locale
- Switch language (TH/EN) and verify translations work
- Toggle dark mode and verify all sections support it
- Check mobile responsive (resize browser or devtools)

- [ ] **Step 3: Final commit if any fixes needed**

If any visual fixes were needed, commit them:
```bash
git add -A
git commit -m "fix: visual adjustments for new landing sections"
```
