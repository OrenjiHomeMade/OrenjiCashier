import { useQuery } from "@tanstack/react-query";
import "./Report.css";
import { formatDate, getDateFromUrl, rupiahFormater } from "../../Utilities/NumberFormater";
import { getSalesSummary } from "../../Services/supabase/summaryServices";

/* ============================================================
   Reusable Components
============================================================ */

type SummaryTableProps = {
	children: React.ReactNode;
	className?: string;
};

const SummaryTable = ({ children, className = "" }: SummaryTableProps) => {
	return <div className={`summary-table ${className}`}>{children}</div>;
};

type TableRowProps = {
	children: React.ReactNode;
	className?: string;
};

const TableRow = ({ children, className = "" }: TableRowProps) => {
	return <div className={`table-row ${className}`}>{children}</div>;
};

type HighlightCardProps = {
	label: string;
	value: string;
};

const HighlightCard = ({ label, value }: HighlightCardProps) => {
	return (
		<div className="highlight-card">
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	);
};

type StockStatusResult = {
	label: string;
	icon: string;
	className: string;
};

const getStockStatus = (remaining: number): StockStatusResult => {
	if (remaining === 0) {
		return {
			label: "Out",
			icon: "🔴",
			className: "stock-out"
		};
	}

	if (remaining <= 5) {
		return {
			label: "Very Low",
			icon: "🔴",
			className: "stock-very-low"
		};
	}

	if (remaining <= 10) {
		return {
			label: "Low",
			icon: "🟡",
			className: "stock-low"
		};
	}

	return {
		label: "Normal",
		icon: "🟢",
		className: "stock-normal"
	};
};

/* ============================================================
   Page
============================================================ */

const SalesSummaryPage = () => {
	const date = getDateFromUrl();

	const {
		data: summary,
		isPending,
		error
	} = useQuery({
		queryKey: ["sales-summary", date],
		queryFn: () => getSalesSummary(date)
	});

	/* ==========================================================
     Loading
  ========================================================== */

	if (isPending) {
		return (
			<main className="sales-summary-page">
				<div className="sales-summary-loading">Loading sales summary...</div>
			</main>
		);
	}

	/* ==========================================================
     Error
  ========================================================== */

	if (error) {
		return (
			<main className="sales-summary-page">
				<div className="sales-summary-error">
					<h2>Unable to load sales summary</h2>

					<p>{error instanceof Error ? error.message : "Something went wrong."}</p>
				</div>
			</main>
		);
	}

	if (!summary) {
		return null;
	}

	/* ==========================================================
     Derived Data
  ========================================================== */

	const topSellers = summary.products.slice(0, 3);

	const lowStockProducts = summary.products.filter((product) => product.remaining <= 5);

	// function rupiahFormater(total_sales: number): string {
	//     throw new Error("Function not implemented.");
	// }

	return (
		<main className="sales-summary-page">
			<div className="sales-summary-container">
				{/* ====================================================
            Header
        ===================================================== */}

				<header className="sales-summary-header">
					<h1>🧾 Daily Sales Summary</h1>

					<p>{formatDate(summary.date)}</p>
				</header>

				{/* ====================================================
            Top Sellers
        ===================================================== */}

				<section className="summary-section">
					<h2>🏆 Top Sellers</h2>

					{topSellers.length === 0 ? (
						<p className="empty-text">No products sold today.</p>
					) : (
						<div className="top-sellers">
							{topSellers.map((product, index) => (
								<div key={product.product_id} className="top-seller">
									<span className="top-seller-rank">
										{index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
									</span>

									<div>
										<strong>{product.product_name}</strong>

										<span>{product.sold} pcs</span>
									</div>
								</div>
							))}
						</div>
					)}
				</section>

				{/* ====================================================
            Today's Highlight
        ===================================================== */}

				<section className="summary-section highlight-section">
					<h2>📊 Today's Highlight</h2>

					<div className="highlight-grid">
						<HighlightCard label="Total Sales" value={rupiahFormater(summary.total_sales)} />

						<HighlightCard label="Transactions" value={String(summary.total_transactions)} />

						<HighlightCard label="Items Sold" value={`${summary.total_items_sold} pcs`} />

						{summary.total_damaged > 0 && (
							<HighlightCard label="Damaged" value={`${summary.total_damaged} pcs`} />
						)}
					</div>

					{topSellers.length > 0 && (
						<p className="highlight-message">
							Best seller: <strong>{topSellers[0].product_name}</strong> — {topSellers[0].sold} pcs
						</p>
					)}

					{lowStockProducts.length > 0 && (
						<p className="highlight-warning">
							⚠️ {lowStockProducts.length} product
							{lowStockProducts.length > 1 ? "s" : ""} running low on stock.
						</p>
					)}

					{summary.total_damaged > 0 && (
						<p className="highlight-damaged">⚠️ {summary.total_damaged} pcs damaged today.</p>
					)}
				</section>

				{/* ====================================================
            Sales
        ===================================================== */}

				<section className="summary-section">
					<h2>💰 Sales</h2>

					<SummaryTable>
						<TableRow className="table-header">
							<span>Metric</span>
							<span>Amount</span>
						</TableRow>

						<TableRow>
							<span>Total Sales</span>

							<strong>{rupiahFormater(summary.total_sales)}</strong>
						</TableRow>

						<TableRow>
							<span>Total Transactions</span>

							<strong>{summary.total_transactions}</strong>
						</TableRow>

						<TableRow>
							<span>Total Items Sold</span>

							<strong>{summary.total_items_sold} pcs</strong>
						</TableRow>

						{summary.total_damaged > 0 && (
							<TableRow>
								<span>Damaged Items</span>

								<strong className="damaged-quantity">{summary.total_damaged} pcs</strong>
							</TableRow>
						)}
					</SummaryTable>
				</section>

				{/* ====================================================
            Payment Breakdown
        ===================================================== */}

				<section className="summary-section">
					<h2>💳 Payment Breakdown</h2>

					<SummaryTable>
						<TableRow className="table-header">
							<span>Payment</span>
							<span>Amount</span>
						</TableRow>

						{summary.payments.map((payment) => (
							<TableRow key={payment.payment_method}>
								<span>{payment.payment_method}</span>

								<strong>{rupiahFormater(payment.amount)}</strong>
							</TableRow>
						))}

						<TableRow className="total-row">
							<strong>Total</strong>

							<strong>{rupiahFormater(summary.total_sales)}</strong>
						</TableRow>
					</SummaryTable>
				</section>

				{/* ====================================================
            Product Sales
        ===================================================== */}

				<section className="summary-section">
					<h2>🛒 Product Sales & Remaining Stock</h2>

					<SummaryTable className="product-table">
						<TableRow className="table-header">
							<span>Product</span>
							<span>Sold</span>
							<span>Damaged</span>
							<span>Remaining</span>
						</TableRow>

						{summary.products.map((product) => (
							<TableRow key={product.product_id}>
								<span>{product.product_name}</span>

								<span>{product.sold} pcs</span>

								<span className={product.damaged > 0 ? "damaged-quantity" : ""}>
									{product.damaged > 0 ? `⚠️ ${product.damaged}` : "—"}
								</span>

								<strong>{product.remaining} pcs</strong>
							</TableRow>
						))}

						<TableRow className="total-row">
							<strong>Total</strong>

							<strong>{summary.total_items_sold} pcs</strong>

							<strong className="damaged-quantity">
								{summary.total_damaged > 0 ? `${summary.total_damaged} pcs` : "—"}
							</strong>

							<span>—</span>
						</TableRow>
					</SummaryTable>
				</section>

				{/* ====================================================
            Stock Status
        ===================================================== */}

				<section className="summary-section">
					<h2>📦 Stock Status</h2>

					<SummaryTable className="stock-table">
						<TableRow className="table-header">
							<span>Product</span>
							<span>Remaining</span>
							<span>Status</span>
						</TableRow>

						{summary.products.map((product) => {
							const status = getStockStatus(product.remaining);

							return (
								<TableRow key={product.product_id}>
									<span>{product.product_name}</span>

									<span>{product.remaining} pcs</span>

									<span className={status.className}>
										{status.icon} {status.label}
									</span>
								</TableRow>
							);
						})}
					</SummaryTable>
				</section>

				{/* ====================================================
            Footer
        ===================================================== */}

				<footer className="sales-summary-footer">Generated from Orenji Cashier</footer>
			</div>
		</main>
	);
};

export default SalesSummaryPage;
