import { useQuery } from "@tanstack/react-query";
import { pdf } from "@react-pdf/renderer";

import OrenjiInvoiceDocument, { type OrenjiInvoiceData } from "./OrenjiInvoice";

import { getTransactionById } from "../../Services/supabase/transactionService";

type InvoiceDownloadButtonProps = {
	className?: string;
	billedTo: string;
	transactionId: number;
};

function InvoiceDownloadButton({ className, billedTo, transactionId }: InvoiceDownloadButtonProps) {
	const {
		data: transaction,
		isLoading,
		isError
	} = useQuery({
		queryKey: ["transaction", transactionId],

		queryFn: () => getTransactionById(transactionId!),

		enabled: Number.isInteger(transactionId)
	});

	if (!transactionId || !Number.isInteger(transactionId)) {
		return <div>Invalid transaction ID.</div>;
	}

	if (isLoading) {
		return <div>Loading invoice...</div>;
	}

	if (isError) {
		return <div>Failed to load transaction.</div>;
	}

	if (!transaction) {
		return <div>Transaction not found.</div>;
	}

	const invoice: OrenjiInvoiceData = {
		invoiceNumber: String(transaction.transactionId),
		invoiceCode: transaction.transactionCode,

		date: transaction.transactionDate.toLocaleDateString("en-US", {
			month: "long",
			day: "numeric",
			year: "numeric"
		}),

		billedTo: billedTo ?? "Customer",

		items: transaction.transactionItems.map((item) => ({
			description: item.productName,
			price: item.unitPrice,
			qty: item.quantity
		})),

		payment: {
			accountNumber: "7267448064",
			accountName: "Nuha Dzakiyyah",
			bankName: "Bank Syariah Indonesia"
		},

		contact: {
			instagram: "@orenjihomemade",
			whatsapp: "081321339650"
		}
	};

	const handleDownloadInvoice = async () => {
		try {
			const blob = await pdf(<OrenjiInvoiceDocument invoice={invoice} />).toBlob();

			const url = URL.createObjectURL(blob);

			const link = document.createElement("a");
			link.href = url;
			link.download = `invoice-${invoice.invoiceCode || invoice.invoiceNumber}.pdf`;

			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Failed to generate invoice:", error);
		}
	};

	return (
		<button disabled={billedTo === ""} onClick={handleDownloadInvoice} type="button" className={className}>
			Download Invoice
		</button>
	);
}

export default InvoiceDownloadButton;
