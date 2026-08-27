// IMPORT STYLES
import styles from "./EditProductDrawer.module.css";
import drawerStyles from "../../../Component/Drawer/Drawer.module.css";

// IMPORT TYPES
import type { TProductProfile, TSaveProductParams } from "../../../Types/product";
// IMPORT HOOKS
import { useState } from "react";
// IMPORT COMPONENTS
import Drawer from "../../../Component/Drawer/Drawer";
import EmptyImage from "../../../Component/MediaComponent/EmptyImage";
// IMPORT UTILITIES
import { rupiahFormater } from "../../../Utilities/NumberFormater";
import { useForm, useWatch } from "react-hook-form";

export type EditProductDrawerProps =
	| {
			mode: "edit";
			product: TProductProfile;
			onClose: () => void;
			onSave: (product: TSaveProductParams) => void | Promise<void>;
			// productImageUrl: string;
	  }
	| {
			mode: "add";
			onClose: () => void;
			onSave: (product: TSaveProductParams) => void | Promise<void>;
			// productImageUrl: string;
	  };

type EditProductForm = Omit<TProductProfile, "productId">;

export default function EditProductDrawer(props: EditProductDrawerProps) {
	const {
		register,
		handleSubmit,
		control,
		setValue,
		formState: { isValid }
	} = useForm<EditProductForm>({
		defaultValues: {
			productName: props.mode === "edit" ? props.product.productName : "",
			productPrice: props.mode === "edit" ? props.product.productPrice : 0,
			productImageUrl: props.mode === "edit" ? props.product.productImageUrl : "",
			productCategory: props.mode === "edit" ? props.product.productCategory : "",
			description: props.mode === "edit" ? props.product.description : "",
			isActive: props.mode === "edit" ? props.product.isActive : true
		},
		mode: "onChange"
	});

	const [selectedImage, setSelectedImage] = useState<File | null>(null);
	const [saving, setSaving] = useState(false);
	const [imageError, setImageError] = useState(false);
	const [isEditingPayment, setIsEditingPayment] = useState(false);

	const newPriceValue = useWatch({
		control,
		name: "productPrice"
	});

	const canSave = isValid && !saving;

	const previewUrl = selectedImage
		? URL.createObjectURL(selectedImage)
		: props.mode === "edit"
			? props.product.productImageUrl
			: "";

	const handleSave = async (data: EditProductForm) => {
		if (!canSave) {
			return;
		}

		setSaving(true);

		try {
			if (props.mode === "edit") {
				await props.onSave({
					productId: props.product.productId,
					newProduct: data,
					previousProductCode: props.product.productCode,
					image: selectedImage
				});
				return;
			}
			await props.onSave({
				newProduct: data,
				image: selectedImage
			});
		} finally {
			setSaving(false);
		}
	};

	const title = props.mode === "edit" ? props.product.productName : "Tambah Produk";
	const eyebrow = props.mode === "edit" ? "Edit Product" : "Add Product";

	return (
		<Drawer
			eyebrow={eyebrow}
			title={title}
			onClose={props.onClose}
			onSubmit={handleSubmit(handleSave)}
			disabled={saving}
			footer={
				<>
					<button
						type="button"
						className={drawerStyles.cancelButton}
						onClick={props.onClose}
						disabled={saving}
					>
						Cancel
					</button>

					<button type="submit" className={drawerStyles.saveButton} disabled={!canSave}>
						{saving ? "Saving..." : props.mode === "edit" ? "Save Product" : "Add Product"}
					</button>
				</>
			}
		>
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
							alt={props.mode === "edit" ? props.product.productName : "Product"}
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
								setImageError(false);
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
		</Drawer>
	);
}
