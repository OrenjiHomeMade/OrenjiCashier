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
