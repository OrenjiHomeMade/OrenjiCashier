import { useQuery } from "@tanstack/react-query";
import { PDFViewer } from "@react-pdf/renderer";

import OrenjiInvoiceDocument, { type OrenjiInvoiceData } from "./OrenjiInvoice";

import { getTransactionById } from "../../Services/supabase/transactionService";

function InvoicePreviewPage() {
	const searchParams = new URLSearchParams(window.location.hash.split("?")[1] ?? "");

	const transactionIdParam = searchParams.get("transactionId");
	const billedTo = searchParams.get("billedTo");

	const transactionId = transactionIdParam ? Number(transactionIdParam) : null;

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

	return (
		<div style={{ height: "100vh", width: "100%" }}>
			<PDFViewer width="100%" height="100%" style={{ border: "none" }}>
				<OrenjiInvoiceDocument invoice={invoice} />
			</PDFViewer>
		</div>
	);
}

export default InvoicePreviewPage;
