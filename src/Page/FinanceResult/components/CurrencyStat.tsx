import styles from "./CurrencyStat.module.css";
import { formatRupiah } from "../../../Utilities/NumberFormater";

export type CurrencyStatProps = {
	label: string;
	value: number;
	tone?: "default" | "muted" | "positive" | "negative" | "accent";
	size?: "sm" | "md" | "lg";
	format?: "currency" | "number";
};

export default function CurrencyStat({
	label,
	value,
	tone = "default",
	size = "md",
	format = "currency"
}: CurrencyStatProps) {
	const displayValue = format === "currency" ? formatRupiah(value) : value.toLocaleString("id-ID");

	return (
		<div className={styles.stat}>
			<span className={styles.label}>{label}</span>
			<span className={`${styles.value} ${styles[tone]} ${styles[size]}`}>{displayValue}</span>
		</div>
	);
}
