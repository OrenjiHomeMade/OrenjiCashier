import styles from "./StatusBadge.module.css";
import type { TAllocationStatus } from "../../../Types/finance";

const LABELS: Record<TAllocationStatus, string> = {
	DRAFT: "Draft",
	CONFIRMED: "Confirmed",
	DISTRIBUTED: "Distributed"
};

export default function StatusBadge({ status }: { status: TAllocationStatus }) {
	return <span className={`${styles.badge} ${styles[status]}`}>{LABELS[status]}</span>;
}
