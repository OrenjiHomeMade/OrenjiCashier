import styles from "./StatusBadge.module.css";
import type { TSettlementStatus } from "../../../Types/settlement";

const LABELS: Record<TSettlementStatus, string> = {
	DRAFT: "Draft",
	CONFIRMED: "Confirmed",
	SETTLED: "Distributed"
};

export default function StatusBadge({ status }: { status: TSettlementStatus }) {
	return <span className={`${styles.badge} ${styles[status]}`}>{LABELS[status]}</span>;
}
