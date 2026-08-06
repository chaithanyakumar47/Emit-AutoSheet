export interface CompanyHoliday {
  id: number;
  name: string;
  date: string; // YYYY-MM-DD
}

export const COMPANY_HOLIDAYS: CompanyHoliday[] = [
  { id: 86, name: "Good Friday", date: "2026-04-03" },
  { id: 87, name: "Maharashtra Day", date: "2026-05-01" },
  { id: 88, name: "Bakri Id (Id-Uz-Zuha)", date: "2026-05-28" },
  { id: 89, name: "Moharum", date: "2026-06-26" },
  { id: 90, name: "Independence Day", date: "2026-08-15" },
  { id: 91, name: "Ganesh Chaturthi", date: "2026-09-14" },
  { id: 92, name: "Mahatma Gandhi Jayanti and Dussehra", date: "2026-10-02" },
  { id: 93, name: "Dussehra", date: "2026-10-21" },
  { id: 94, name: "Choti Diwali", date: "2026-11-08" },
  { id: 95, name: "Diwali", date: "2026-11-09" },
  { id: 96, name: "Diwali", date: "2026-11-10" },
  { id: 97, name: "Christmas", date: "2026-12-25" },
  { id: 98, name: "New year", date: "2027-01-01" },
  { id: 99, name: "Republic Day", date: "2027-01-26" },
  { id: 100, name: "Eid-Ul-Fitr", date: "2027-03-09" },
  { id: 101, name: "Holi", date: "2027-03-22" }
];

export const HOLIDAY_MAP: Record<string, string> = COMPANY_HOLIDAYS.reduce((acc, h) => {
  acc[h.date] = h.name.trim();
  return acc;
}, {} as Record<string, string>);

export function getCompanyHolidayInfo(dateStr: string): { isHoliday: boolean; name?: string } {
  const name = HOLIDAY_MAP[dateStr];
  return {
    isHoliday: Boolean(name),
    name,
  };
}
