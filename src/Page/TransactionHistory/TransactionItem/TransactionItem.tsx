// IMPORT STYLES
import style from "./TransactionItem.module.css";
// IMPORT TYPES
import type { TTransaction } from "../../../Types/transaction";
// IMPORT HOOKS
import { useState } from "react";
// IMPORT UTILITIES
import { rupiahFormater } from "../../../Utilities/NumberFormater";
// IMPORT COMPONENTS
import TrashIcon from "../../../Component/MediaComponent/TrashIcon";
import EditIcon from "../../../Component/MediaComponent/EditIcon";
import ChevronIcon from "../../../Component/MediaComponent/ChevronIcon";
import TransactionDetailItem from "../TransactionDetailItem/TransactionDetailItem";
import { toast } from "react-toastify";

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

	// Invoice modal
	const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
	const [recipientName, setRecipientName] = useState("");

	const totalItems = transactionItems.reduce((total, item) => total + item.quantity, 0);

	const formattedDate = transactionDate.toLocaleString("en-GB", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit"
	});

	const handleOpenInvoiceModal = () => {
		setRecipientName("");
		setInvoiceModalOpen(true);
	};

	const handleCloseInvoiceModal = () => {
		setInvoiceModalOpen(false);
	};

	const handleGenerateInvoice = () => {
		const trimmedRecipientName = recipientName.trim();

		if (!trimmedRecipientName) {
			toast.error("Please enter the recipient name.");
			return;
		}

		const params = new URLSearchParams({
			transactionId: String(transactionId),
			billedTo: trimmedRecipientName
		});

		const invoiceUrl = `${window.location.origin}/#/invoice?${params.toString()}`;

		window.open(invoiceUrl, "_blank", "noopener,noreferrer");

		setInvoiceModalOpen(false);
	};

	return (
		<>
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
							className={`${style.paymentBadge} ${
								paymentMethod.toUpperCase() === "QRIS" ? style.qris : style.cash
							}`}
						>
							{paymentMethod.toUpperCase()}
						</span>
					</div>

					<div className={`${style.amount} ${style.cell}`}>{rupiahFormater(transactionAmount)}</div>

					<div className={style.actions}>
						{/* INVOICE */}
						<button
							type="button"
							className={style.actionButton}
							aria-label={`Create invoice for ${transactionCode}`}
							onClick={handleOpenInvoiceModal}
						>
							<svg
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								aria-hidden="true"
							>
								<path
									d="M7 3H17C18.1046 3 19 3.89543 19 5V21L16 19L13 21L10 19L7 21V3Z"
									stroke="currentColor"
									strokeWidth="1.8"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
								<path d="M10 7H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
								<path d="M10 11H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
								<path d="M10 15H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
							</svg>
						</button>

						{/* EDIT */}
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

						{/* DELETE */}
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

			{/* ==================================================
			    INVOICE RECIPIENT MODAL
			    ================================================== */}

			{invoiceModalOpen && (
				<div
					className={style.invoiceModalOverlay}
					onMouseDown={(event) => {
						if (event.target === event.currentTarget) {
							handleCloseInvoiceModal();
						}
					}}
				>
					<div
						className={style.invoiceModal}
						role="dialog"
						aria-modal="true"
						aria-labelledby="invoice-modal-title"
					>
						<div className={style.invoiceModalHeader}>
							<div>
								<h2 id="invoice-modal-title">Create Invoice</h2>

								<p>Enter the recipient information for this invoice.</p>
							</div>

							<button
								type="button"
								className={style.invoiceModalClose}
								onClick={handleCloseInvoiceModal}
								aria-label="Close invoice dialog"
							>
								×
							</button>
						</div>

						<div className={style.invoiceModalBody}>
							<label htmlFor={`invoice-recipient-${transactionId}`} className={style.invoiceModalLabel}>
								Recipient Name
							</label>

							<input
								id={`invoice-recipient-${transactionId}`}
								type="text"
								className={style.invoiceModalInput}
								value={recipientName}
								onChange={(event) => setRecipientName(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === "Enter") {
										handleGenerateInvoice();
									}
								}}
								placeholder="e.g. Bu Elly"
								autoFocus
							/>
						</div>

						<div className={style.invoiceModalFooter}>
							<button
								type="button"
								className={style.invoiceModalCancel}
								onClick={handleCloseInvoiceModal}
							>
								Cancel
							</button>

							<button type="button" className={style.invoiceModalConfirm} onClick={handleGenerateInvoice}>
								Create Invoice
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export default TransactionItem;
