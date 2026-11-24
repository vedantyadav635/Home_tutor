export const BOARDS = ["CBSE", "State Board", "ICSE", "Competitive Exams"] as const;

export const CLASS_BANDS = [
  { value: "1-8", label: "Class 1–8" },
  { value: "9-10", label: "Class 9–10" },
  { value: "11-12", label: "Class 11–12" },
  { value: "exam", label: "Exam Prep" },
] as const;

export const SUBJECTS = [
  "Maths", "Science", "Physics", "Chemistry", "Biology", "English", "Hindi",
  "Geography", "History", "GK", "Accounts", "Economics", "Computer Science",
] as const;

export const MODES = ["Home Visit", "Online", "Hybrid"] as const;
export const LANGUAGES = ["Hindi", "English", "Bilingual"] as const;
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const TIME_SLOTS = ["morning", "afternoon", "evening"] as const;

export type Board = (typeof BOARDS)[number];
export type ClassBand = (typeof CLASS_BANDS)[number]["value"];
export type Subject = (typeof SUBJECTS)[number];
export type Mode = (typeof MODES)[number];
export type Language = (typeof LANGUAGES)[number];
export type Day = (typeof DAYS)[number];
export type TimeSlot = (typeof TIME_SLOTS)[number];
