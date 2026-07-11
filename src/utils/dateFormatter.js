// src/utils/dateFormatter.js

/**
 * Converts any valid date string/object into a clean, human-readable format.
 * @param {string | Date} dateInput - The date to format (e.g., "2026-08-09" or "2026-08-09T21:16:00Z")
 * @param {boolean} includeTime - Set to true to append the time (e.g., " • 9:16 PM")
 * @returns {string} e.g., "5th Sept 2026" or "5th Sept 2026 • 9:16 PM"
 */
export const formatCleanDate = (dateInput, includeTime = false) => {
  if (!dateInput) return "N/A";

  const date = new Date(dateInput);

  // Fallback if the database sends a weird format that JS can't parse
  if (isNaN(date.getTime())) return dateInput;

  // 1. Calculate the Ordinal Suffix (st, nd, rd, th)
  const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const day = getOrdinal(date.getDate());

  // 2. Custom Month Mapping (to get exact "Sept" and "June" styling)
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "June",
    "July",
    "Aug",
    "Sept",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  let finalString = `${day} ${month} ${year}`;

  // 3. Append Time if requested and if the string actually contains time data
  if (includeTime && String(dateInput).includes("T")) {
    const timeOptions = { hour: "numeric", minute: "2-digit", hour12: true };
    const timeString = date.toLocaleTimeString("en-US", timeOptions);
    finalString += ` • ${timeString}`;
  }

  return finalString;
};