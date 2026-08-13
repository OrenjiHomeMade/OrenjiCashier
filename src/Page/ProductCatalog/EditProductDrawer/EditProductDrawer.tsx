import { useState } from "react";
import styles from "./EditProductDrawer.module.css";
import EmptyImage from "../../../Component/MediaComponent/EmptyImage";
import { rupiahFormater } from "../../../Utilities/NumberFormater";
import type { TProductProfile } from "../../../Services/supabase/productService";

export type EditProductDrawerProps = TProductProfile & {
	onClose: () => void;
	onSave: (product: TProductProfile) => void | Promise<void>;
};

export default function EditProductDrawer({
	productId,
	productName,
	productPrice,
	productImageUrl,
	onClose,
	onSave
}: EditProductDrawerProps) {
	const [newProductName, setNewProductName] = useState(productName);
	const [newPriceValue, setNewPriceValue] = useState(productPrice);
	const [selectedImage, setSelectedImage] = useState<File | null>(null);
	const [saving, setSaving] = useState(false);
	const [imageError, setImageError] = useState(false);

	const canSave = newProductName.trim() !== "" && newPriceValue >= 0 && !saving;

	const previewUrl = selectedImage ? URL.createObjectURL(selectedImage) : productImageUrl;

	const handleSave = async () => {
		if (!canSave) {
			return;
		}

		setSaving(true);

		try {
			await onSave({
				productId,
				productName: newProductName.trim(),
				productPrice: newPriceValue,
				productImageUrl
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<div
			className={styles.overlay}
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) {
					onClose();
				}
			}}
		>
			<aside className={styles.drawer} role="dialog" aria-modal="false" aria-labelledby="edit-product-title">
				<header className={styles.header}>
					<div>
						<p className={styles.eyebrow}>Edit Product</p>
						<h2 id="edit-product-title" className={styles.title}>
							{productName}
						</h2>
					</div>

					<button
						type="button"
						className={styles.closeButton}
						onClick={onClose}
						disabled={saving}
						aria-label="Close"
					>
						×
					</button>
				</header>

				<div className={styles.content}>
					<section className={styles.section}>
						<label htmlFor="product-name" className={styles.label}>
							Nama Produk
						</label>

						<input
							id="product-name"
							type="text"
							value={newProductName}
							onChange={(event) => setNewProductName(event.target.value)}
							className={styles.textInput}
							disabled={saving}
						/>
					</section>

					<section className={styles.section}>
						<label className={styles.label}>Gambar Produk</label>

						<div className={styles.imageContainer}>
							{previewUrl && !imageError ? (
								<img
									src={previewUrl}
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

						<div className={styles.imageActions}>
							<input
								type="file"
								accept="image/png,image/jpeg,image/webp"
								disabled={saving}
								onChange={(e) => {
									const file = e.target.files?.[0];

									if (file) {
										setSelectedImage(file);
									}
								}}
							>
								{/* Ubah Gambar */}
							</input>
						</div>
					</section>

					<section className={styles.section}>
						<label htmlFor="product-price" className={styles.label}>
							Harga Jual
						</label>

						<input
							id="product-price"
							type="text"
							inputMode="numeric"
							value={rupiahFormater(newPriceValue)}
							onChange={(event) => {
								const numericValue = event.target.value.replace(/\D/g, "");

								setNewPriceValue(numericValue === "" ? 0 : Number(numericValue));
							}}
							className={styles.textInput}
							disabled={saving}
						/>
					</section>
				</div>

				<footer className={styles.footer}>
					<button type="button" className={styles.cancelButton} onClick={onClose} disabled={saving}>
						Cancel
					</button>

					<button type="button" className={styles.saveButton} onClick={handleSave} disabled={!canSave}>
						{saving ? "Saving..." : "Save Product"}
					</button>
				</footer>
			</aside>
		</div>
	);
}
