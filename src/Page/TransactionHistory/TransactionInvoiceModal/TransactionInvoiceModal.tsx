import { useState } from "react";
import style from "./TransactionInvoiceModal.module.css";
import { toast } from "react-toastify";
import InvoiceDownloadButton from "../../Invoice/InvoiceDownloadButton";

type TransactionInvoiceModalProps = {
	setInvoiceModalOpen: (state: boolean) => void;
	transactionId: number;
};

const TransactionInvoiceModal = ({ setInvoiceModalOpen, transactionId }: TransactionInvoiceModalProps) => {
	const [recipientName, setRecipientName] = useState("");

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
		<div
			className={style.invoiceModalOverlay}
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) {
					handleCloseInvoiceModal();
				}
			}}
		>
			<div className={style.invoiceModal} role="dialog" aria-modal="true" aria-labelledby="invoice-modal-title">
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
						placeholder="e.g. Max Musterman"
						autoFocus
					/>
				</div>

				<div className={style.invoiceModalFooter}>
					<button type="button" className={style.invoiceModalCancel} onClick={handleCloseInvoiceModal}>
						Cancel
					</button>

					{window.innerWidth > 767 && (
						<button
							type="button"
							className={style.invoiceModalConfirm}
							onClick={handleGenerateInvoice}
							disabled={recipientName === ""}
						>
							Preview Invoice
						</button>
					)}

					<InvoiceDownloadButton
						transactionId={transactionId}
						billedTo={recipientName}
						className={style.invoiceModalConfirm}
					/>
				</div>
			</div>
		</div>
	);
};

export default TransactionInvoiceModal;
