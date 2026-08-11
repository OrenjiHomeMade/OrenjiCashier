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
