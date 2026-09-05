export const dateStringInputFormat = (date: Date) => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	const customFormat = `${year}-${month}-${day}`;
	return customFormat;
};

export const rupiahFormater = (value: number, notation: "compact" | "standard" = "standard") => {
	return Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		notation: notation
	}).format(value);
};

/**
 * Formats a number as a signed Rupiah string, e.g. formatRupiah(-15000) -> "-Rp 15.000".
 * Wraps the existing rupiahFormater (used inside RupiahInput) so display
 * formatting stays consistent across the app.
 */
export function formatRupiah(value: number): string {
	const sign = value < 0 ? "- " : "";
	return `${sign}${rupiahFormater(Math.abs(Math.round(value)))}`;
}

export const generateTransactionCode = (cashierName: string, date: Date = new Date()): string => {
	// YYMMDD
	const year = String(date.getFullYear()).slice(-2);
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	// Seconds since midnight → base 36
	const secondsSinceMidnight = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

	const timeCode = secondsSinceMidnight.toString(36).toUpperCase().padStart(4, "0");

	// First 3 characters of cashier name
	const cashierCode = cashierName.trim().replace(/\s+/g, "").slice(0, 3).toUpperCase();

	return `INV${year}${month}${day}-${timeCode}${cashierCode}`;
};

export const getLocalTimestamp = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const seconds = String(date.getSeconds()).padStart(2, "0");

	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export const getDateFromUrl = (): string => {
	const hash = window.location.hash;

	// HashRouter URL:
	// #/report?date=2026-08-16
	const queryString = hash.includes("?") ? hash.split("?")[1] : "";

	const params = new URLSearchParams(queryString);
	const date = params.get("date");

	if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
		return date;
	}

	// Fallback to local date, NOT UTC date
	const today = new Date();

	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, "0");
	const day = String(today.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
};

export const formatDate = (date: string): string => {
	// Parse manually so timezone conversion cannot change the date.
	const [year, month, day] = date.split("-").map(Number);

	const localDate = new Date(year, month - 1, day);

	return new Intl.DateTimeFormat("id-ID", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric"
	}).format(localDate);
};

export const getDate30DaysAgo = (entryDate: Date | null = null) => {
	const date = entryDate ? new Date(entryDate) : new Date();
	date.setDate(date.getDate() - 30);
	return date;
};
