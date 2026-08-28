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
import ReturnIcon from "../../../Component/MediaComponent/ReturnIcon";

export type EditProductDrawerProps =
	| {
			mode: "edit";
			product: TProductProfile;
			categories: string[];
			onClose: () => void;
			onSave: (product: TSaveProductParams) => void | Promise<void>;
	  }
	| {
			mode: "add";
			categories: string[];
			onClose: () => void;
			onSave: (product: TSaveProductParams) => void | Promise<void>;
	  };

type EditProductForm = Omit<TProductProfile, "productId">;

export default function EditProductDrawer(props: EditProductDrawerProps) {
	const {
		register,
		handleSubmit,
		control,
		setValue,
		// getValues,
		setError,
		clearErrors,
		formState: { isValid, errors }
	} = useForm<EditProductForm>({
		defaultValues: {
			productCode: props.mode === "edit" ? props.product.productCode : "",
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
	const [isCreatingCategory, setIsCreatingCategory] = useState(false);
	const [newCategory, setNewCategory] = useState("");

	const newPriceValue = useWatch({
		control,
		name: "productPrice"
	});

	const productCategory = useWatch({
		control,
		name: "productCategory"
	});

	const canSave = isValid && !saving;

	const previewUrl = selectedImage
		? URL.createObjectURL(selectedImage)
		: props.mode === "edit"
			? props.product.productImageUrl
			: "";

	const handleCategoryChange = (value: string) => {
		if (value === "__new__") {
			setIsCreatingCategory(true);
			setNewCategory("");
			setValue("productCategory", "", {
				shouldValidate: true,
				shouldDirty: true
			});
			clearErrors("productCategory");
			return;
		}

		setIsCreatingCategory(false);
		setNewCategory("");
		setValue("productCategory", value, {
			shouldValidate: true,
			shouldDirty: true
		});
		clearErrors("productCategory");
	};

	const handleNewCategoryChange = (value: string) => {
		setNewCategory(value);

		const trimmedValue = value.trim();

		if (trimmedValue === "") {
			setValue("productCategory", "", {
				shouldValidate: true,
				shouldDirty: true
			});
			clearErrors("productCategory");
			return;
		}

		const existingCategory = props.categories.find(
			(category) => category.trim().toLowerCase() === trimmedValue.toLowerCase()
		);

		if (existingCategory) {
			setValue("productCategory", "", {
				shouldValidate: true,
				shouldDirty: true
			});
			setError("productCategory", {
				type: "duplicate",
				message: `Kategori "${existingCategory}" sudah ada. Silakan pilih kategori yang sudah tersedia.`
			});
			return;
		}

		clearErrors("productCategory");
		setValue("productCategory", trimmedValue, {
			shouldValidate: true,
			shouldDirty: true
		});
	};

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
	const eyebrow = props.mode === "edit" ? "Edit Produk" : "Tambah Produk";

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
						{saving ? "Saving..." : props.mode === "edit" ? "Simpan Produk" : "Tambah Produk"}
					</button>
				</>
			}
		>
			<section className={styles.section}>
				<label htmlFor="product-code" className={styles.label}>
					Kode Produk
				</label>

				<input
					id="product-code"
					type="text"
					className={styles.textInput}
					disabled={saving}
					{...register("productCode", {
						required: true,
						validate: (value) => value.trim() !== ""
					})}
				/>
			</section>

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
				<label htmlFor="product-category" className={styles.label}>
					Kategori Produk
				</label>

				{isCreatingCategory ? (
					<>
						<input
							id="product-category"
							type="text"
							className={styles.textInput}
							placeholder="Masukkan kategori baru"
							value={newCategory}
							disabled={saving}
							onChange={(event) => handleNewCategoryChange(event.target.value)}
						/>

						<button
							type="button"
							className={styles.secondaryButton}
							onClick={() => {
								setIsCreatingCategory(false);
								setNewCategory("");
								setValue("productCategory", "", {
									shouldValidate: true,
									shouldDirty: true
								});
								clearErrors("productCategory");
							}}
							disabled={saving}
						>
							<ReturnIcon />
							<span>Pilih Kategori yang Sudah Ada</span>
						</button>
					</>
				) : (
					<select
						id="product-category"
						className={styles.textInput}
						value={productCategory}
						disabled={saving}
						onChange={(event) => handleCategoryChange(event.target.value)}
					>
						<option value="">Pilih kategori</option>

						{props.categories.map((category) => (
							<option key={category} value={category}>
								{category}
							</option>
						))}

						<option value="__new__">+ Buat kategori baru</option>
					</select>
				)}

				{errors.productCategory && <p className={styles.errorMessage}>{errors.productCategory.message}</p>}
			</section>

			<section className={styles.section}>
				<label htmlFor="product-description" className={styles.label}>
					Deskripsi
				</label>

				<input
					id="product-description"
					type="text"
					className={styles.textInput}
					disabled={saving}
					{...register("description")}
				/>
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

			<section className={styles.section}>
				<label className={styles.checkboxLabel}>
					<input type="checkbox" disabled={saving} {...register("isActive")} />
					<span>Produk Aktif</span>
				</label>
			</section>
		</Drawer>
	);
}
