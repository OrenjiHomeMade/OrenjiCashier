import { useState } from "react";
import styles from "./EditProductDrawer.module.css";
import EmptyImage from "../../../Component/MediaComponent/EmptyImage";
import { rupiahFormater } from "../../../Utilities/NumberFormater";
import type { TProductProfile } from "../../../Services/supabase/productService";
import { useForm, useWatch } from "react-hook-form";

export type EditProductDrawerProps = TProductProfile & {
	onClose: () => void;
	onSave: (product: TProductProfile) => void | Promise<void>;
};

type EditProductForm = {
	productName: string;
	productPrice: number;
};

export default function EditProductDrawer({
	productId,
	productName,
	productPrice,
	productImageUrl,
	onClose,
	onSave
}: EditProductDrawerProps) {
	const {
		register,
		handleSubmit,
		control,
		setValue,
		formState: { isValid }
	} = useForm<EditProductForm>({
		defaultValues: {
			productName,
			productPrice
		},
		mode: "onChange"
	});

	const [selectedImage, setSelectedImage] = useState<File | null>(null);
	const [saving, setSaving] = useState(false);
	const [imageError, setImageError] = useState(false);
	const [isEditingPayment, setIsEditingPayment] = useState(false);

	const newProductName = useWatch({
		control,
		name: "productName"
	});

	const newPriceValue = useWatch({
		control,
		name: "productPrice"
	});

	const canSave = isValid && !saving;

	const previewUrl = selectedImage ? URL.createObjectURL(selectedImage) : productImageUrl;

	const handleSave = async (data: EditProductForm) => {
		if (!canSave) {
			return;
		}

		console.log(newProductName);

		setSaving(true);

		try {
			await onSave({
				productId,
				productName: data.productName.trim(),
				productPrice: data.productPrice,
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

				<form onSubmit={handleSubmit(handleSave)}>
					<div className={styles.content}>
						<section className={styles.section}>
							<label htmlFor="product-name" className={styles.label}>
								Nama Produk
							</label>

							<input
								id="product-name"
								type="text"
								className={styles.textInput}
								disabled={saving}
								{...register("productName", {
									required: true,
									validate: (value) => value.trim() !== ""
								})}
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
								/>
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
								value={
									isEditingPayment
										? newPriceValue === 0
											? ""
											: newPriceValue.toString()
										: newPriceValue === 0
											? ""
											: rupiahFormater(newPriceValue)
								}
								onFocus={() => {
									setIsEditingPayment(true);
								}}
								onBlur={() => {
									setIsEditingPayment(false);
								}}
								onChange={(event) => {
									const numericValue = event.target.value.replace(/\D/g, "");

									setValue("productPrice", numericValue === "" ? 0 : Number(numericValue), {
										shouldValidate: true,
										shouldDirty: true
									});
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

						<button type="submit" className={styles.saveButton} disabled={!canSave}>
							{saving ? "Saving..." : "Save Product"}
						</button>
					</footer>
				</form>
			</aside>
		</div>
	);
}
