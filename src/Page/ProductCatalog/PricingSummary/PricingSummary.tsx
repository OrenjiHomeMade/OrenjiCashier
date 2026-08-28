import { rupiahFormater } from "../../../Utilities/NumberFormater";
import styles from "./PricingSummary.module.css";

export type PricingSummaryProps = {
	productPrice: number;
	costIngredient: number;
	costLabor: number;
	costUtilities: number;
};

export default function PricingSummary({
	productPrice,
	costIngredient,
	costLabor,
	costUtilities
}: PricingSummaryProps) {
	const totalCost = costIngredient + costLabor + costUtilities;
	const margin = productPrice - totalCost;
	const marginPercentage = productPrice > 0 ? (margin / productPrice) * 100 : 0;

	const marginClass = margin > 0 ? styles.positive : margin < 0 ? styles.negative : styles.neutral;

	return (
		<section className={styles.summary}>
			<div className={styles.row}>
				<span className={styles.label}>Harga Jual</span>
				<strong className={styles.value}>{rupiahFormater(productPrice)}</strong>
			</div>

			<div className={styles.row}>
				<span className={styles.label}>Total Biaya</span>
				<strong className={styles.value}>{rupiahFormater(totalCost)}</strong>
			</div>

			<div className={styles.divider} />

			<div className={styles.marginRow}>
				<div>
					<span className={styles.label}>Margin</span>
					<strong className={`${styles.marginValue} ${marginClass}`}>
						{rupiahFormater(Math.abs(margin))}
						{margin < 0 && " (Rugi)"}
					</strong>
				</div>

				<strong className={`${styles.percentage} ${marginClass}`}>{marginPercentage.toFixed(1)}%</strong>
			</div>
		</section>
	);
}
