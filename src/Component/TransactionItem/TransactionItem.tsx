import { useState } from "react";
import style from "./TransactionItem.module.css";

import CartItem from "../CartItem/CartItem";
import type { TCartItem } from "../CartItem/CartItem";

import { rupiahFormater } from "../../Utilities/NumberFormater";

import TrashIcon from "../../Component/MediaComponent/TrashIcon";
import EditIcon from "../../Component/MediaComponent/EditIcon";
import ChevronIcon from "../../Component/MediaComponent/ChevronIcon";

export type TTransactionItem = {
	transactionId: string;
	transactionDate: Date;
	transactionAmount: number;
	paymentMethod: "CASH" | "QRIS";

	transactionItems: TCartItem[];
};

const TransactionItem = ({
	transactionId,
	transactionDate,
	transactionAmount,
	paymentMethod,
	transactionItems
}: TTransactionItem) => {
	const [detailIsOpen, setDetailIsOpen] = useState(false);

	const totalItems = transactionItems.reduce((total, item) => total + item.quantity, 0);

	return (
		<div className={`${style.transactionItemContainer} ${detailIsOpen ? style.transactionItemOpen : ""}`}>
			{/* ==========================================
                TRANSACTION ROW
                ========================================== */}

			<div className={style.transactionRow}>
				<button
					type="button"
					className={style.expandButton}
					onClick={() => setDetailIsOpen((previous) => !previous)}
					aria-label={detailIsOpen ? "Collapse transaction" : "Expand transaction"}
				>
					<ChevronIcon direction={detailIsOpen ? "down" : "right"} />
				</button>

				<div className={`${style.transactionId} ${style.cell}`}>{transactionId}</div>

				<div className={style.cell}>
					{transactionDate.toLocaleString("en-GB", {
						day: "2-digit",
						month: "short",
						year: "numeric",
						hour: "2-digit",
						minute: "2-digit"
					})}
				</div>

				<div className={style.cell}>{totalItems}</div>

				<div className={style.cell}>
					<span className={`${style.paymentBadge} ${paymentMethod === "QRIS" ? style.qris : style.cash}`}>
						{paymentMethod}
					</span>
				</div>

				<div className={`${style.amount} ${style.cell}`}>{rupiahFormater(transactionAmount)}</div>

				<div className={style.actions}>
					<button type="button" className={style.actionButton} aria-label="Edit transaction">
						<EditIcon />
					</button>

					<button
						type="button"
						className={`${style.actionButton} ${style.deleteButton}`}
						aria-label="Delete transaction"
					>
						<TrashIcon />
					</button>
				</div>
			</div>

			{/* ==========================================
                TRANSACTION DETAILS
                ========================================== */}

			{detailIsOpen && (
				<div className={style.transactionDetails}>
					<div className={style.detailsHeader}>Transaction Items</div>

					<div className={style.detailsList}>
						{transactionItems.map((item) => (
							<CartItem key={item.productId} {...item} variant="history" />
						))}
					</div>

					<div className={style.detailsTotal}>
						<span>Total</span>

						<strong>{rupiahFormater(transactionAmount)}</strong>
					</div>
				</div>
			)}
		</div>
	);
};

export default TransactionItem;
