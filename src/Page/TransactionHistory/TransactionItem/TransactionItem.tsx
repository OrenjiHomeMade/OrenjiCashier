// TODO TRANSACTION TYPES
// IMPORT STYLES
import style from "./TransactionItem.module.css";
// IMPORT HOOKS
import { useState } from "react";
// IMPORT UTILITIES
import { rupiahFormater } from "../../../Utilities/NumberFormater";
// IMPORT COMPONENTS
import TrashIcon from "../../../Component/MediaComponent/TrashIcon";
import EditIcon from "../../../Component/MediaComponent/EditIcon";
import ChevronIcon from "../../../Component/MediaComponent/ChevronIcon";
import TransactionDetailItem, { type TTransactionDetailItem } from "../TransactionDetailItem/TransactionDetailItem";
import { toast } from "react-toastify";

export type TTransaction = {
	transactionId: number;
	transactionCode: string;
	transactionDate: Date;

	cashier: string;

	transactionAmount: number;

	paymentMethod: "CASH" | "QRIS";

	transactionItems: TTransactionDetailItem[];
};

type TransactionItemProps = TTransaction & {
	onDelete: (transactionId: number) => void;

	isDeleting?: boolean;
};

const TransactionItem = ({
	transactionId,
	transactionCode,
	transactionDate,
	cashier,
	transactionAmount,
	paymentMethod,
	transactionItems,
	onDelete,
	isDeleting = false
}: TransactionItemProps) => {
	const [detailIsOpen, setDetailIsOpen] = useState(false);

	const totalItems = transactionItems.reduce((total, item) => total + item.quantity, 0);

	const formattedDate = transactionDate.toLocaleString("en-GB", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit"
	});

	return (
		<div className={`${style.transactionItemContainer} ${detailIsOpen ? style.transactionItemOpen : ""}`}>
			{/* ==================================================
			    TRANSACTION ROW
			    ================================================== */}

			<div className={style.transactionRow}>
				<button
					type="button"
					className={style.expandButton}
					onClick={() => setDetailIsOpen((previous) => !previous)}
					aria-label={detailIsOpen ? "Collapse transaction" : "Expand transaction"}
					aria-expanded={detailIsOpen}
				>
					<ChevronIcon direction={detailIsOpen ? "down" : "right"} />
				</button>

				<div className={`${style.transactionId} ${style.cell}`} title={transactionId.toString()}>
					{transactionCode}
				</div>

				<div className={`${style.date} ${style.cell}`}>{formattedDate}</div>

				<div className={`${style.cashier} ${style.cell}`} title={cashier}>
					{cashier}
				</div>

				<div className={`${style.itemsCount} ${style.cell}`}>
					<span className={style.itemsCountBadge}>{totalItems}</span>
				</div>

				<div className={`${style.payment} ${style.cell}`}>
					<span
						className={`${style.paymentBadge} ${paymentMethod.toUpperCase() === "QRIS" ? style.qris : style.cash}`}
					>
						{paymentMethod.toUpperCase()}
					</span>
				</div>

				<div className={`${style.amount} ${style.cell}`}>{rupiahFormater(transactionAmount)}</div>

				<div className={style.actions}>
					<button
						type="button"
						className={style.actionButton}
						aria-label="Edit transaction"
						onClick={() => {
							toast("Fungsi ini belum tersedia");
						}}
					>
						<EditIcon />
					</button>

					<button
						type="button"
						className={`${style.actionButton} ${style.deleteButton}`}
						onClick={() => onDelete(transactionId)}
						disabled={isDeleting}
						aria-label={`Delete ${transactionCode}`}
					>
						<TrashIcon />
					</button>
				</div>
			</div>

			{/* ==================================================
			    TRANSACTION DETAILS
			    ================================================== */}

			{detailIsOpen && (
				<div className={style.transactionDetails}>
					<div className={style.detailsHeader}>
						<div>
							<span>Transaction Items</span>

							<small>
								{transactionItems.length} product
								{transactionItems.length !== 1 ? "s" : ""}
							</small>
						</div>

						<strong>{rupiahFormater(transactionAmount)}</strong>
					</div>

					<div className={style.detailsList}>
						{transactionItems.map((item) => (
							<TransactionDetailItem key={item.id} {...item} />
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export default TransactionItem;
