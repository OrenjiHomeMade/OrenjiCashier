import React from "react";
import {
	Document,
	Page,
	Text,
	View,
	Image,
	Svg,
	Path,
	StyleSheet,
	Font,
	PDFDownloadLink,
	PDFViewer
} from "@react-pdf/renderer";

/* ------------------------------------------------------------------ */
/* 1. Font registration                                                */
/* ------------------------------------------------------------------ */

Font.register({
	family: "Inter",
	fonts: [
		{ src: "/fonts/Inter-Regular.otf", fontWeight: "normal" },
		{ src: "/fonts/Inter-Medium.otf", fontWeight: 500 },
		{ src: "/fonts/Inter-Bold.otf", fontWeight: "bold" }
	]
});

Font.register({
	family: "Boby Jones Soft",
	fonts: [{ src: "/fonts/Bobby Rough Soft.ttf" }]
});

Font.register({
	family: "Moontime",
	fonts: [{ src: "/fonts/MoonTime-Regular.ttf" }]
});

Font.registerHyphenationCallback((word) => [word]);

/* ------------------------------------------------------------------ */
/* 2. Brand tokens                                                    */
/* ------------------------------------------------------------------ */

const COLORS = {
	orange: "#F5921B",
	orangeDark: "#E07E00",
	black: "#1A1A1A",
	gray: "#6B6B6B",
	lightGray: "#E5E5E5"
};

/* ------------------------------------------------------------------ */
/* 3. Brand Assets                                                     */
/* ------------------------------------------------------------------ */

const RIBBON_SRC = "/Ribbon.svg";
const FLORAL_BACKGROUND_SRC = "/FloralBackground.png";
const ORENJI_SQUARE_ICON = "/OrenjiSquareLogo.png";

/* ------------------------------------------------------------------ */
/* 4. Icons                                                            */
/* ------------------------------------------------------------------ */

const InstagramIcon = ({ size = 10, color = COLORS.black }) => (
	<Svg width={size} height={size} viewBox="0 0 24 24">
		<Path
			d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm0 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM18 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"
			fill={color}
		/>
	</Svg>
);

const WhatsAppIcon = ({ size = 10, color = COLORS.black }) => (
	<Svg width={size} height={size} viewBox="0 0 24 24">
		<Path
			d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.4A10 10 0 1 0 12 2zm5.6 14.2c-.2.6-1.3 1.2-1.9 1.3-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3.1 0-1.5.8-2.2 1-2.5.3-.3.6-.3.8-.3h.6c.2 0 .5 0 .7.6.3.6.9 2.1 1 2.2.1.2.1.4 0 .6-.1.2-.2.4-.4.6-.2.2-.4.5-.6.6-.2.2-.4.4-.2.8.2.4 1 1.6 2.1 2.6 1.4 1.3 2.6 1.7 3 1.9.4.2.6.2.8-.1.2-.2.9-1 1.1-1.4.2-.4.4-.3.7-.2.3.1 1.9.9 2.2 1 .3.2.5.2.6.4.1.2.1.9-.1 1.5z"
			fill={color}
		/>
	</Svg>
);

const FlowerIcon = ({ size = 12, color = COLORS.orange }) => (
	<Svg width={size} height={size} viewBox="0 0 24 24">
		<Path
			d="M12 8a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0-6c1.5 0 2.7 1.6 2.7 3.6 0 .9-.3 1.7-.7 2.3.6-.5 1.4-.8 2.3-.8 2 0 3.6 1.2 3.6 2.7s-1.6 2.7-3.6 2.7c-.9 0-1.7-.3-2.3-.8.4.6.7 1.4.7 2.3 0 2-1.2 3.6-2.7 3.6s-2.7-1.6-2.7-3.6c0-.9.3-1.7.7-2.3-.6.5-1.4.8-2.3.8-2 0-3.6-1.2-3.6-2.7s1.6-2.7-3.6-2.7c.9 0 1.7.3 2.3.8-.4-.6-.7-1.4-.7-2.3C9.3 3.6 10.5 2 12 2z"
			fill={color}
		/>
	</Svg>
);

/* ------------------------------------------------------------------ */
/* 5. Ribbon Icon                                                      */
/* ------------------------------------------------------------------ */

/*
 * Ribbon.svg is stored in:
 *
 * public/Ribbon.svg
 *
 * Because the file is inside `public`, the browser/PDF renderer
 * can reference it using `/Ribbon.svg`.
 */

// --- RibbonIcon: accept a style override ---
const RibbonIcon = ({ size = 22, style }: { size?: number; style?: object }) => (
	<Image src={RIBBON_SRC} style={{ width: size, height: size, ...style }} />
);

/* ------------------------------------------------------------------ */
/* 6. Styles                                                           */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
	page: {
		paddingTop: 32,
		paddingHorizontal: 45,
		paddingBottom: 80,
		fontFamily: "Inter",
		fontSize: 9.5,
		color: COLORS.black
	},

	/* ---- Header row ---- */

	headerRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		// alignItems: "flex-start",
		alignItems: "center",
		marginBottom: 0
	},

	// --- styles: add/replace these two ---
	invoiceTitleRow: {
		flexDirection: "row",
		alignItems: "flex-start"
	},
	invoiceTitleWrap: {
		position: "relative"
	},
	invoiceTitle: {
		fontFamily: "Boby Jones Soft",
		fontSize: 60, // bumped up — see point 3
		color: COLORS.orange,
		letterSpacing: 4,
		lineHeight: 1
	},
	invoiceTitleShadow: {
		position: "absolute",
		top: 3,
		left: 3,
		color: "#FBD9A6" // light orange shadow
	},

	logoBadge: {
		alignItems: "center",
		justifyContent: "center"
	},

	logoBadgeText: {
		fontFamily: "Boby Jones Soft",
		fontSize: 20,
		color: "#ffffff"
	},

	logoBadgeSub: {
		fontFamily: "Inter",
		fontSize: 6,
		color: "#ffffff",
		letterSpacing: 1,
		marginTop: 1
	},

	/* ---- Brand ---- */

	brandName: {
		fontFamily: "Inter",
		fontWeight: "bold",
		fontSize: 13,
		letterSpacing: 5, // was 3 — widen to match Canva
		marginTop: 6,
		marginBottom: 10
	},

	contactRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 3,
		gap: 5
	},

	contactText: {
		fontSize: 9.5
	},

	/* ---- Billed to / Date ---- */

	metaRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 18,
		marginBottom: 14
	},

	metaLabel: {
		fontFamily: "Inter",
		fontWeight: "bold",
		fontSize: 9.5,
		marginBottom: 2
	},

	metaValue: {
		fontSize: 9.5
	},

	metaRight: {
		alignItems: "flex-end"
	},

	/* ---- Table ---- */

	table: {
		marginTop: 4
	},

	tableHeaderRow: {
		flexDirection: "row",
		borderTop: `1pt solid ${COLORS.black}`,
		borderBottom: `1pt solid ${COLORS.black}`,
		paddingVertical: 6
	},

	tableRow: {
		flexDirection: "row",
		paddingVertical: 8,
		borderBottom: `0.5pt solid ${COLORS.lightGray}`
	},

	colItem: {
		width: "34%",
		fontFamily: "Inter"
	},

	colPrice: {
		width: "22%",
		textAlign: "center"
	},

	colQty: {
		width: "20%",
		textAlign: "center"
	},

	colTotal: {
		width: "24%",
		textAlign: "right"
	},

	headerCell: {
		fontFamily: "Inter",
		fontWeight: "bold"
	},

	/* ---- Totals ---- */

	totalsBlock: {
		marginTop: 2,
		alignItems: "flex-end"
	},

	totalsRow: {
		flexDirection: "row",
		width: 200,
		justifyContent: "space-between",
		paddingVertical: 6,
		borderBottom: `0.5pt solid ${COLORS.lightGray}`
	},

	totalsLabel: {
		fontFamily: "Inter",
		fontWeight: "bold"
	},

	grandTotalRow: {
		flexDirection: "row",
		width: 200,
		justifyContent: "space-between",
		paddingVertical: 6,
		borderBottom: `0.5pt solid ${COLORS.lightGray}`
	},

	grandTotalLabel: {
		fontFamily: "Inter",
		fontWeight: "bold"
	},

	grandTotalValue: {
		fontFamily: "Inter",
		fontWeight: "bold"
	},

	/* ---- Payment ---- */

	paymentSection: {
		marginTop: 40
	},

	paymentHeadingRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginBottom: 8
	},

	paymentHeading: {
		fontFamily: "Boby Jones Soft",
		fontSize: 16,
		color: COLORS.orange
	},

	paymentText: {
		fontSize: 10,
		marginBottom: 2
	},

	paymentBold: {
		fontFamily: "Inter",
		fontWeight: "bold",
		fontSize: 10
	},

	/* ---- Thank you ---- */

	thankYouWrap: {
		alignItems: "center",
		marginTop: 50
	},

	thankYouText: {
		fontFamily: "Moontime",
		fontSize: 22,
		color: COLORS.orange
	},

	/* ---- Floral footer ---- */

	floralStrip: {
		position: "absolute",
		left: -45,
		right: -45,
		bottom: 0,
		width: "auto",
		height: 70
	}
});

/* ------------------------------------------------------------------ */
/* 7. Types                                                            */
/* ------------------------------------------------------------------ */

export interface InvoiceItem {
	description: string;
	price: number;
	qty: number;
}

export interface OrenjiInvoiceData {
	invoiceNumber: string;
	invoiceCode?: string;
	date: string;
	billedTo: string;

	items: InvoiceItem[];

	payment: {
		accountNumber: string;
		accountName: string;
		bankName: string;
	};

	contact: {
		instagram: string;
		whatsapp: string;
	};
}

/* ------------------------------------------------------------------ */
/* 8. Formatting                                                       */
/* ------------------------------------------------------------------ */

const formatRupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

const formatPrice = (n: number) => n.toLocaleString("id-ID");

/* ------------------------------------------------------------------ */
/* 9. Header                                                           */
/* ------------------------------------------------------------------ */

const InvoiceHeader: React.FC<{
	invoice: OrenjiInvoiceData;
}> = ({ invoice }) => (
	<View fixed>
		<View style={styles.headerRow}>
			<View style={styles.invoiceTitleRow}>
				<View style={styles.invoiceTitleWrap}>
					{/* shadow layer — painted first, sits behind */}
					<Text style={[styles.invoiceTitle, styles.invoiceTitleShadow]}>INVOICE</Text>
					{/* main text — defines the box size, painted second */}
					<Text style={styles.invoiceTitle}>INVOICE</Text>
					{/* ribbon — painted last, so it's guaranteed on top */}
					<RibbonIcon size={32} style={{ position: "absolute", top: 6, left: -10 }} />
				</View>
			</View>
			<View>
				<Image src={ORENJI_SQUARE_ICON} style={{ width: 200, height: 95, objectFit: "contain" }} />
			</View>
		</View>
		<Text style={styles.brandName}>ORENJI HOMEMADE</Text>
		<View style={styles.contactRow}>
			<InstagramIcon />
			<Text style={styles.contactText}>{invoice.contact.instagram}</Text>
		</View>

		<View style={styles.contactRow}>
			<WhatsAppIcon />
			<Text style={styles.contactText}>{invoice.contact.whatsapp}</Text>
		</View>
	</View>
);

/* ------------------------------------------------------------------ */
/* 10. Floral Footer                                                   */
/* ------------------------------------------------------------------ */

const FloralFooter = () => (
	<View style={styles.floralStrip} fixed>
		<Image
			src={FLORAL_BACKGROUND_SRC}
			style={{
				width: "100%",
				height: "100%"
			}}
		/>
	</View>
);

/* ------------------------------------------------------------------ */
/* 11. Table Header                                                    */
/* ------------------------------------------------------------------ */

const TableHeaderRow = () => (
	<View style={styles.tableHeaderRow} fixed>
		<Text style={[styles.colItem, styles.headerCell]}>Item</Text>

		<Text style={[styles.colPrice, styles.headerCell]}>Price</Text>

		<Text style={[styles.colQty, styles.headerCell]}>Qty</Text>

		<Text style={[styles.colTotal, styles.headerCell]}>Total</Text>
	</View>
);

/* ------------------------------------------------------------------ */
/* 12. Document                                                        */
/* ------------------------------------------------------------------ */

const OrenjiInvoiceDocument: React.FC<{
	invoice: OrenjiInvoiceData;
}> = ({ invoice }) => {
	const subtotal = invoice.items.reduce((sum, item) => sum + item.price * item.qty, 0);

	const total = subtotal;

	return (
		<Document>
			<Page size="A4" style={styles.page} wrap>
				<InvoiceHeader invoice={invoice} />

				<View style={styles.metaRow}>
					<View>
						<Text style={styles.metaLabel}>BILLED TO:</Text>

						<Text style={styles.metaValue}>{invoice.billedTo}</Text>
					</View>

					<View style={styles.metaRight}>
						<Text style={styles.metaLabel}>DATE</Text>

						<Text style={styles.metaValue}>{invoice.date}</Text>

						<Text style={[styles.metaLabel, { marginTop: 6 }]}>INVOICE NUMBER</Text>

						<Text style={styles.metaValue}>#{invoice.invoiceNumber}</Text>
					</View>
				</View>

				<View style={styles.table}>
					<TableHeaderRow />

					{invoice.items.map((item, i) => (
						<View style={styles.tableRow} key={i} wrap={false}>
							<Text style={styles.colItem}>{item.description}</Text>

							<Text style={styles.colPrice}>{formatPrice(item.price)}</Text>

							<Text style={styles.colQty}>{item.qty}</Text>

							<Text style={styles.colTotal}>{formatRupiah(item.price * item.qty)}</Text>
						</View>
					))}
				</View>

				<View style={styles.totalsBlock} wrap={false}>
					<View style={styles.totalsRow}>
						<Text style={styles.totalsLabel}>Subtotal</Text>

						<Text>{formatRupiah(subtotal)}</Text>
					</View>

					<View style={styles.grandTotalRow}>
						<Text style={styles.grandTotalLabel}>Total</Text>

						<Text style={styles.grandTotalValue}>{formatRupiah(total)}</Text>
					</View>
				</View>

				<View style={styles.paymentSection} wrap={false}>
					<View style={styles.paymentHeadingRow}>
						<Text style={styles.paymentHeading}>PAYMENT INFORMATION</Text>

						<FlowerIcon />
					</View>

					<Text style={styles.paymentText}>
						{invoice.payment.accountNumber} a.n. {invoice.payment.accountName}
					</Text>

					<Text style={styles.paymentBold}>({invoice.payment.bankName})</Text>
				</View>

				<View style={styles.thankYouWrap} wrap={false}>
					<Text style={styles.thankYouText}>Thank you for your order, enjoy!</Text>
				</View>

				<FloralFooter />
			</Page>
		</Document>
	);
};

/* ------------------------------------------------------------------ */
/* 13. Example data                                                    */
/* ------------------------------------------------------------------ */

const exampleInvoice: OrenjiInvoiceData = {
	invoiceNumber: "45",
	date: "August 27, 2026",
	billedTo: "Bu Elly",

	items: [
		{
			description: "Risoles Ragout",
			price: 3500,
			qty: 130
		}
	],

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

/* ------------------------------------------------------------------ */
/* 14. Development Preview                                            */
/* ------------------------------------------------------------------ */

export const OrenjiInvoiceApp: React.FC = () => (
	<div style={{ height: "100vh" }}>
		<PDFDownloadLink
			document={<OrenjiInvoiceDocument invoice={exampleInvoice} />}
			fileName={`invoice-${exampleInvoice.invoiceNumber}.pdf`}
		>
			{({ loading }) => (loading ? "Preparing document..." : "Download Invoice PDF")}
		</PDFDownloadLink>

		<PDFViewer width="100%" height="90%">
			<OrenjiInvoiceDocument invoice={exampleInvoice} />
		</PDFViewer>
	</div>
);

export default OrenjiInvoiceDocument;
