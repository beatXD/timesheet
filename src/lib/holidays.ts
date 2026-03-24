// Shared holiday data and functions for Thai public holidays

// Interface for Calendarific API response
interface CalendarificHoliday {
  name: string;
  date: {
    iso: string;
  };
  type: string[];
  primary_type: string;
}

interface CalendarificResponse {
  response: {
    holidays: CalendarificHoliday[];
  };
}

// Thai public holidays - fixed dates (same every year)
export const fixedThaiHolidays = [
  { month: 1, day: 1, name: "New Year's Day", nameTh: "วันขึ้นปีใหม่" },
  { month: 4, day: 6, name: "Chakri Memorial Day", nameTh: "วันจักรี" },
  { month: 4, day: 13, name: "Songkran Festival", nameTh: "วันสงกรานต์" },
  { month: 4, day: 14, name: "Songkran Festival", nameTh: "วันสงกรานต์" },
  { month: 4, day: 15, name: "Songkran Festival", nameTh: "วันสงกรานต์" },
  { month: 5, day: 1, name: "Labour Day", nameTh: "วันแรงงานแห่งชาติ" },
  { month: 5, day: 4, name: "Coronation Day", nameTh: "วันฉัตรมงคล" },
  { month: 6, day: 3, name: "Queen Suthida's Birthday", nameTh: "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสุทิดา" },
  { month: 7, day: 28, name: "King Vajiralongkorn's Birthday", nameTh: "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว" },
  { month: 8, day: 12, name: "Queen Sirikit's Birthday / Mother's Day", nameTh: "วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง / วันแม่แห่งชาติ" },
  { month: 10, day: 13, name: "King Bhumibol Memorial Day", nameTh: "วันคล้ายวันสวรรคต ร.9" },
  { month: 10, day: 23, name: "Chulalongkorn Day", nameTh: "วันปิยมหาราช" },
  { month: 12, day: 5, name: "King Bhumibol's Birthday / Father's Day", nameTh: "วันคล้ายวันพระบรมราชสมภพ ร.9 / วันพ่อแห่งชาติ" },
  { month: 12, day: 10, name: "Constitution Day", nameTh: "วันรัฐธรรมนูญ" },
  { month: 12, day: 31, name: "New Year's Eve", nameTh: "วันสิ้นปี" },
];

// Buddhist holidays - approximate dates (vary by lunar calendar)
// These are approximations and should be verified/adjusted by admin each year
export const buddhistHolidaysApprox: Record<number, { name: string; nameTh: string; date: string }[]> = {
  2024: [
    { name: "Makha Bucha Day", nameTh: "วันมาฆบูชา", date: "2024-02-24" },
    { name: "Visakha Bucha Day", nameTh: "วันวิสาขบูชา", date: "2024-05-22" },
    { name: "Asanha Bucha Day", nameTh: "วันอาสาฬหบูชา", date: "2024-07-20" },
    { name: "Buddhist Lent Day", nameTh: "วันเข้าพรรษา", date: "2024-07-21" },
  ],
  2025: [
    { name: "Makha Bucha Day", nameTh: "วันมาฆบูชา", date: "2025-02-12" },
    { name: "Visakha Bucha Day", nameTh: "วันวิสาขบูชา", date: "2025-05-11" },
    { name: "Asanha Bucha Day", nameTh: "วันอาสาฬหบูชา", date: "2025-07-10" },
    { name: "Buddhist Lent Day", nameTh: "วันเข้าพรรษา", date: "2025-07-11" },
  ],
  2026: [
    { name: "Makha Bucha Day", nameTh: "วันมาฆบูชา", date: "2026-03-03" },
    { name: "Visakha Bucha Day", nameTh: "วันวิสาขบูชา", date: "2026-05-31" },
    { name: "Asanha Bucha Day", nameTh: "วันอาสาฬหบูชา", date: "2026-07-29" },
    { name: "Buddhist Lent Day", nameTh: "วันเข้าพรรษา", date: "2026-07-30" },
  ],
  2027: [
    { name: "Makha Bucha Day", nameTh: "วันมาฆบูชา", date: "2027-02-21" },
    { name: "Visakha Bucha Day", nameTh: "วันวิสาขบูชา", date: "2027-05-20" },
    { name: "Asanha Bucha Day", nameTh: "วันอาสาฬหบูชา", date: "2027-07-18" },
    { name: "Buddhist Lent Day", nameTh: "วันเข้าพรรษา", date: "2027-07-19" },
  ],
  2028: [
    { name: "Makha Bucha Day", nameTh: "วันมาฆบูชา", date: "2028-02-10" },
    { name: "Visakha Bucha Day", nameTh: "วันวิสาขบูชา", date: "2028-05-08" },
    { name: "Asanha Bucha Day", nameTh: "วันอาสาฬหบูชา", date: "2028-07-06" },
    { name: "Buddhist Lent Day", nameTh: "วันเข้าพรรษา", date: "2028-07-07" },
  ],
};

// Generate Thai holidays for a given year
export function generateThaiHolidays(year: number): { date: string; name: string }[] {
  const holidays: { date: string; name: string }[] = [];

  // Add fixed holidays
  for (const h of fixedThaiHolidays) {
    const dateStr = `${year}-${String(h.month).padStart(2, "0")}-${String(h.day).padStart(2, "0")}`;
    holidays.push({ date: dateStr, name: h.name });
  }

  // Add Buddhist holidays (use approximations if available)
  const buddhistHolidays = buddhistHolidaysApprox[year];
  if (buddhistHolidays) {
    for (const h of buddhistHolidays) {
      holidays.push({ date: h.date, name: h.name });
    }
  } else {
    // Fallback: use 2025 dates adjusted (not accurate but better than nothing)
    console.warn(`Buddhist holidays for ${year} not defined, using approximations`);
    const baseHolidays = buddhistHolidaysApprox[2025];
    for (const h of baseHolidays) {
      const baseDate = new Date(h.date);
      const adjustedDate = new Date(year, baseDate.getMonth(), baseDate.getDate());
      holidays.push({
        date: adjustedDate.toISOString().split("T")[0],
        name: h.name,
      });
    }
  }

  // Sort by date
  holidays.sort((a, b) => a.date.localeCompare(b.date));

  return holidays;
}

// Fetch holidays from Calendarific API
export async function fetchFromCalendarific(year: number): Promise<{ date: string; name: string }[] | null> {
  const apiKey = process.env.CALENDARIFIC_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=TH&year=${year}&type=national`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    );

    if (!response.ok) {
      console.error("Calendarific API error:", response.status);
      return null;
    }

    const data: CalendarificResponse = await response.json();
    const holidays = data.response.holidays.map((h) => ({
      date: h.date.iso.split("T")[0],
      name: h.name,
    }));

    return holidays;
  } catch (error) {
    console.error("Failed to fetch from Calendarific:", error);
    return null;
  }
}

// Orchestrator: fetch holiday data from best available source
export async function fetchHolidayData(
  year: number
): Promise<{ holidays: { date: string; name: string }[]; source: string }> {
  // Try Calendarific first
  const calendarificData = await fetchFromCalendarific(year);
  if (calendarificData && calendarificData.length > 0) {
    return { holidays: calendarificData, source: "Calendarific API" };
  }

  // Fallback to built-in Thai holidays
  if (calendarificData !== null) {
    console.warn(`[Holidays] Calendarific returned empty for ${year}, using built-in`);
  }
  return { holidays: generateThaiHolidays(year), source: "Built-in Thai holidays" };
}
