// IMPORT STYLES
import styles from "./StockAdjustmentDrawer.module.css";
import drawerStyles from "../../../Component/Drawer/Drawer.module.css";

// IMPORT TYPES
import type { TProductQuantityMovement } from "../../../Types/product";

// IMPORT HOOKS
import { useMemo, useState } from "react";

// IMPORT COMPONENTS
import Drawer from "../../../Component/Drawer/Drawer";
import EmptyImage from "../../../Component/MediaComponent/EmptyImage";

export type StockAdjustmentType = "RESTOCK" | "DAMAGE" | "STOCK_COUNT" | "CORRECTION";

type AdjustmentMode = "CHANGE" | "SET";

type StockAdjustmentDrawerProps = {
	productId: number;
	productName: string;
	productImageUrl: string;
	currentStock: number;
	onClose: () => void;
	onSave: (data: TProductQuantityMovement) => void | Promise<void>;
};

const REASONS: {
	value: StockAdjustmentType;
	label: string;
}[] = [
	{ value: "RESTOCK", label: "Produksi Baru" },
	{ value: "DAMAGE", label: "Rusak/Cacat" },
	{ value: "STOCK_COUNT", label: "Hitung Ulang" },
	{ value: "CORRECTION", label: "Koreksi Hitung" }
];

export default function StockAdjustmentDrawer({
	productId,
	productName,
	currentStock,
	productImageUrl,
	onClose,
	onSave
}: StockAdjustmentDrawerProps) {
	const [mode, setMode] = useState<AdjustmentMode>("CHANGE");
	const [inputValue, setInputValue] = useState("0");
	const [adjustmentType, setAdjustmentType] = useState<StockAdjustmentType>("RESTOCK");
	const [note, setNote] = useState("");
	const [saving, setSaving] = useState(false);
	const [imageError, setImageError] = useState(false);

	const quantity = useMemo(() => {
		const value = Number(inputValue);

		if (!Number.isFinite(value)) {
			return 0;
		}

		if (mode === "CHANGE") {
			return Math.trunc(value);
		}

		return Math.trunc(value) - currentStock;
	}, [inputValue, mode, currentStock]);

	const newStock = currentStock + quantity;
	const canSave = quantity !== 0 && newStock >= 0 && !saving;

	const handleSave = async () => {
		if (!canSave) {
			return;
		}

		setSaving(true);

		try {
			await onSave({
				productId: productId,
				adjustmentQty: quantity,
				adjustmentType: adjustmentType,
				note: note.trim()
			});
		} finally {
			setSaving(false);
		}
	};

	const handleModeChange = (newMode: AdjustmentMode) => {
		setMode(newMode);

		if (newMode === "SET") {
			setInputValue(String(currentStock));
			setAdjustmentType("STOCK_COUNT");
		} else {
			setInputValue("0");
			setAdjustmentType("RESTOCK");
		}
	};

	return (
		<Drawer
			eyebrow="Stock Adjustment"
			title={productName}
			onClose={onClose}
			disabled={saving}
			footer={
				<>
					<button type="button" className={drawerStyles.cancelButton} onClick={onClose} disabled={saving}>
						Cancel
					</button>

					<button type="button" className={drawerStyles.saveButton} onClick={handleSave} disabled={!canSave}>
						{saving ? "Saving..." : "Save Adjustment"}
					</button>
				</>
			}
		>
			{/* Current stock */}
			<section className={styles.currentStock}>
				<div className={styles.imageSection}>
					{productImageUrl && !imageError ? (
						<img
							src={productImageUrl}
							alt={productName}
							className={styles.productImage}
							onError={() => setImageError(true)}
						/>
					) : (
						<div className={styles.imageFallback}>
							<EmptyImage className={styles.fallbackIcon} />
							<span>No Image</span>
						</div>
					)}
				</div>
				<div className={styles.qtySection}>
					<strong>Jumlah Stok Sekarang</strong>
					<div className={styles.currentStockValue}>
						<span>{currentStock}</span>
						<span className={styles.unit}>pcs</span>
					</div>
				</div>
			</section>

			{/* Adjustment mode */}
			<section className={styles.section}>
				<label className={styles.label}>Metode Penyesuaian</label>

				<div className={styles.modeSelector}>
					<button
						type="button"
						className={
							mode === "CHANGE" ? `${styles.modeButton} ${styles.modeButtonActive}` : styles.modeButton
						}
						onClick={() => handleModeChange("CHANGE")}
						disabled={saving}
					>
						Selisih Jumlah
					</button>

					<button
						type="button"
						className={
							mode === "SET" ? `${styles.modeButton} ${styles.modeButtonActive}` : styles.modeButton
						}
						onClick={() => handleModeChange("SET")}
						disabled={saving}
					>
						Jumlah Akhir
					</button>
				</div>
			</section>

			{/* Quantity */}
			<section className={styles.section}>
				<label htmlFor="stock-adjustment-input" className={styles.label}>
					{mode === "CHANGE" ? "Jumlah" : "Stok Baru"}
				</label>

				<div className={styles.adjustmentSection}>
					<button
						type="button"
						className={styles.adjustmentQtyButton}
						style={{ background: "var(--pink)" }}
						onClick={() => {
							setInputValue(`${Number(inputValue) - 1}`);
						}}
					>
						-
					</button>
					<div className={styles.inputWrapper}>
						{mode === "CHANGE" && <span className={styles.inputPrefix}>±</span>}
						<input
							id="stock-adjustment-input"
							type="number"
							inputMode="numeric"
							step="1"
							min={mode === "SET" ? 0 : undefined}
							value={inputValue}
							onChange={(event) => setInputValue(event.target.value)}
							className={styles.numberInput}
							disabled={saving}
						/>
						<span className={styles.inputUnit}>pcs</span>
					</div>
					<button
						type="button"
						className={styles.adjustmentQtyButton}
						style={{ background: "var(--blue)" }}
						onClick={() => {
							setInputValue(`${Number(inputValue) + 1}`);
						}}
					>
						+
					</button>
				</div>
			</section>

			{/* Result */}
			<section className={styles.resultCard}>
				<div>
					<span className={styles.resultLabel}>Selisih</span>
					<strong
						className={quantity > 0 ? styles.positive : quantity < 0 ? styles.negative : styles.neutral}
					>
						{quantity > 0 ? "+" : ""}
						{quantity} pcs
					</strong>
				</div>
				<div className={styles.resultDivider} />
				<div>
					<span className={styles.resultLabel}>New stock</span>
					<strong className={styles.newStock}>{newStock} pcs</strong>
				</div>
			</section>

			{/* Reason */}
			<section className={styles.section}>
				<label htmlFor="stock-adjustment-reason" className={styles.label}>
					Kategori Penyesuaian
				</label>
				<select
					id="stock-adjustment-reason"
					value={adjustmentType}
					onChange={(event) => setAdjustmentType(event.target.value as StockAdjustmentType)}
					className={styles.select}
					disabled={saving}
				>
					{REASONS.map((reason) => (
						<option key={reason.value} value={reason.value}>
							{reason.label}
						</option>
					))}
				</select>
			</section>

			{/* Note */}
			<section className={styles.section}>
				<label htmlFor="stock-adjustment-note" className={styles.label}>
					Keterangan <span>(optional)</span>
				</label>

				<textarea
					id="stock-adjustment-note"
					value={note}
					onChange={(event) => setNote(event.target.value)}
					className={styles.textarea}
					placeholder="e.g. Produksi pagi"
					rows={3}
					disabled={saving}
				/>
			</section>
		</Drawer>
	);
}
