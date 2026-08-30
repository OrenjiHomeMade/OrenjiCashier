// IMPORT TYPES
import type { DTProductQuery } from "../../Types/database-query";

import type {
	TProductImage,
	TProductProfile,
	TProductQuantityMovement,
	TProductWithQty,
	TSaveProductParams
} from "../../Types/product";

// IMPORT LIBRARY
import { supabase } from "./client";
import { toast } from "react-toastify";

export const getProducts = async (activeProduct: boolean | null = null): Promise<TProductWithQty[]> => {
	const isActiveFilter = activeProduct !== null ? [activeProduct] : [true, false];

	const { data, error } = await supabase
		.from("products")
		.select(
			`
			product_id,
			product_code,
			product_name,
			product_price,
			cost_ingredient,
			cost_labor,
			cost_packaging,
			cost_utilities,
			product_category,
			description,
			is_active,
			product_stock!product_stock_product_id_fkey (
				stock_quantity
			)
		`
		)
		.in("is_active", isActiveFilter)
		.is("deleted_at", null)
		.order("is_active", { ascending: false })
		.order("product_name");

	if (error) {
		toast.error(`Failed Loading products ${error.message}`);
		console.log(error.message);
		return [];
	}

	const products = data as unknown as DTProductQuery[];

	const result: TProductWithQty[] = products.map((product) => ({
		productId: Number(product.product_id),
		productCode: product.product_code,
		productName: product.product_name ?? "",
		productPrice: product.product_price,
		productImageUrl: getProductImageUrl(product.product_code),
		costLabor: product.cost_labor,
		costIngredient: product.cost_ingredient,
		costPackaging: product.cost_packaging,
		costUtilities: product.cost_utilities,
		productCategory: product.product_category,
		description: product.description ?? "",
		isActive: product.is_active,
		stockQuantity: product.product_stock?.stock_quantity ?? 0
	}));

	return result;
};

export const getProductImageUrl = (product_code: string) => {
	const imagePath = `${product_code}.webp`;

	const { data } = supabase.storage.from("product-images").getPublicUrl(imagePath);

	return data.publicUrl;
};

export const getProductCategories = async (activeProduct: boolean | null = null): Promise<string[]> => {
	const { data, error } = await supabase.rpc("get_product_categories", {
		p_is_active: activeProduct ?? undefined
	});

	if (error) {
		toast.error(`Failed Loading Categories ${error.message}`);
		console.error(error.message);
		return [];
	}

	return data ? data.map((el) => el.product_category) : [];
};

export const adjustQuantity = async ({ productId, adjustmentQty, adjustmentType, note }: TProductQuantityMovement) => {
	const { data, error } = await supabase.rpc("adjust_product_qty", {
		p_product_id: productId,
		p_adjustment_quantity: adjustmentQty,
		p_adjustment_type: adjustmentType,
		p_note: note
	});

	if (error) {
		toast.error(`Failed to adjust quantity of productID ${productId}: ${error.message}`);
		console.error("Failed to adjust quantity of productID ${productId}:", error);
		return null;
	}

	toast.success("Quantity of product sucessfully adjusted");

	return data;
};

export async function convertToWebP(file: File): Promise<Blob> {
	const image = new Image();
	const objectUrl = URL.createObjectURL(file);

	try {
		image.src = objectUrl;

		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () => reject(new Error("Failed to load image"));
		});

		const canvas = document.createElement("canvas");

		canvas.width = image.naturalWidth;
		canvas.height = image.naturalHeight;

		const ctx = canvas.getContext("2d");

		if (!ctx) {
			throw new Error("Could not create canvas context");
		}

		ctx.drawImage(image, 0, 0);

		const blob = await new Promise<Blob | null>((resolve) => {
			canvas.toBlob(resolve, "image/webp", 0.85);
		});

		if (!blob) {
			throw new Error("Could not convert image to WebP");
		}

		return blob;
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}

export async function uploadProductImage({ productCode, file }: TProductImage): Promise<string> {
	const image = file.name.toLowerCase().endsWith(".webp") ? file : await convertToWebP(file);

	const path = `${productCode}.webp`;

	const { data, error } = await supabase.storage.from("product-images").upload(path, image, {
		contentType: "image/webp",
		upsert: true
	});

	console.log("UPLOAD DATA:", data);
	console.log("UPLOAD ERROR:", error);

	if (error) {
		toast.error(`Failed Uploading product image ${error.message}`);
		console.log("message:", error.message);
		console.log("name:", error.name);
		console.log("statusCode:", error.statusCode);
		console.log("cause:", error.cause);
		throw error;
	}

	return path;
}

export async function deleteProductImage(productCode: string): Promise<void> {
	const path = `products/${productCode}.webp`;

	const { error } = await supabase.storage.from("product-images").remove([path]);

	if (error) {
		toast.error(`Failed Deleting Product Image ${error.message}`);
		console.log(error.message);
		throw error;
	}
}

export async function createProduct(product: Omit<TProductProfile, "productId">): Promise<TProductProfile> {
	// const insertEntry =
	const { data, error } = await supabase
		.from("products")
		.insert({
			product_code: product.productCode,
			product_name: product.productName,
			product_price: product.productPrice,
			cost_ingredient: product.costIngredient,
			cost_labor: product.costLabor,
			cost_packaging: product.costPackaging,
			cost_utilities: product.costUtilities,
			product_category: product.productCategory,
			description: product.description,
			is_active: product.isActive
		})
		.select()
		.single();

	if (error) {
		if (error.code === "23505") {
			throw error;
		}

		toast.error(`Failed Creating products ${error.message}`);
		console.log(error.message);
		throw error;
	}

	return {
		productId: data.product_id,
		productCode: data.product_code,
		productName: data.product_name,
		productPrice: Number(data.product_price),
		costLabor: data.cost_labor,
		costIngredient: data.cost_ingredient,
		costPackaging: data.cost_packaging,
		costUtilities: data.cost_utilities,
		productImageUrl: getProductImageUrl(data.product_code),
		productCategory: data.product_category ?? "",
		description: data.description ?? "",
		isActive: data.is_active
	};
}

export async function updateProduct(product: TProductProfile): Promise<TProductProfile> {
	const productId = product.productId;
	const { data, error } = await supabase
		.from("products")
		.update({
			product_code: product.productCode,
			product_name: product.productName,
			product_price: product.productPrice,
			cost_ingredient: product.costIngredient,
			cost_labor: product.costLabor,
			cost_packaging: product.costPackaging,
			cost_utilities: product.costUtilities,
			product_category: product.productCategory,
			description: product.description,
			is_active: product.isActive
		})
		.eq("product_id", productId)
		.select()
		.single();

	if (error) {
		if (error.code === "23505") {
			throw error;
		}

		toast.error(`Failed Updating Products ${error.message}`);
		console.log(error.message);
		throw error;
	}

	return {
		productId: data.product_id,
		productCode: data.product_code,
		productName: data.product_name,
		productPrice: data.product_price,
		costLabor: data.cost_labor,
		costIngredient: data.cost_ingredient,
		costPackaging: data.cost_packaging,
		costUtilities: data.cost_utilities,
		productImageUrl: getProductImageUrl(data.product_code),
		productCategory: data.product_category ?? "",
		description: data.description ?? "",
		isActive: data.is_active
	};
}

export async function saveProduct({ productId, previousProductCode, newProduct, image }: TSaveProductParams) {
	const isEdit = productId !== undefined;

	let savedProduct: TProductProfile;

	if (isEdit) {
		savedProduct = await updateProduct({ ...newProduct, productId: productId });
	} else {
		savedProduct = await createProduct(newProduct);
	}

	if (image) {
		if (isEdit && previousProductCode && previousProductCode !== newProduct.productCode) {
			await deleteProductImage(previousProductCode);
		}

		await uploadProductImage({
			productCode: newProduct.productCode,
			file: image
		});
	}

	return savedProduct;
}

type ProductCodeSuggestionParams = {
	productCategory: string;
	productName: string;
	excludeProductId?: number;
};

type ProductCodeAvailabilityParams = {
	productCode: string;
	excludeProductId?: number;
};

const getCategoryCode = (category: string): string => {
	const trimmedCategory = category.trim();

	if (!trimmedCategory) {
		return "PR";
	}

	return trimmedCategory
		.replace(/[^a-zA-Z0-9]/g, "")
		.slice(0, 2)
		.toUpperCase()
		.padEnd(2, "X");
};

const getNameCode = (name: string): string => {
	const words = name.trim().split(/\s+/).filter(Boolean);

	if (words.length === 0) {
		return "XXX";
	}

	if (words.length === 1) {
		return words[0]
			.replace(/[^a-zA-Z0-9]/g, "")
			.slice(0, 3)
			.toUpperCase()
			.padEnd(3, "X");
	}

	const firstWord = words[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

	const secondWord = words[1].replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

	return (firstWord.slice(0, 1) + secondWord.slice(0, 2)).padEnd(3, "X");
};

export const getProductCodeSuggestion = async ({
	productCategory,
	productName,
	excludeProductId
}: ProductCodeSuggestionParams): Promise<string> => {
	const categoryCode = getCategoryCode(productCategory);
	const nameCode = getNameCode(productName);

	const prefix = `${categoryCode}-${nameCode}`;

	/**
	 * Find existing product codes using the generated prefix.
	 *
	 * Example:
	 *
	 * prefix = MA-NGO
	 *
	 * Existing:
	 * MA-NGO001
	 * MA-NGO002
	 * MA-NGO005
	 *
	 * The next suggestion will be:
	 * MA-NGO006
	 */
	let query = supabase.from("products").select("product_code").like("product_code", `${prefix}%`);

	if (excludeProductId !== undefined) {
		query = query.neq("product_id", excludeProductId);
	}

	const { data, error } = await query;

	if (error) {
		console.error("Failed checking product codes for suggestion:", error.message);

		throw error;
	}

	const usedNumbers = new Set<number>();

	for (const row of data ?? []) {
		const code = row.product_code;

		/**
		 * Only accept the exact expected structure:
		 *
		 * CC-NNN###
		 */
		const match = code.match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d{3})$`));

		if (!match) {
			continue;
		}

		usedNumbers.add(Number(match[1]));
	}

	let nextNumber = 1;

	while (usedNumbers.has(nextNumber)) {
		nextNumber += 1;
	}

	/**
	 * Product codes are specified as three digits.
	 *
	 * Therefore 001 ... 999 are available.
	 */
	if (nextNumber > 999) {
		throw new Error(`Tidak ada nomor kode produk yang tersedia untuk prefix ${prefix}.`);
	}

	return `${prefix}${String(nextNumber).padStart(3, "0")}`;
};

export const isProductCodeAvailable = async ({
	productCode,
	excludeProductId
}: ProductCodeAvailabilityParams): Promise<boolean> => {
	const trimmedCode = productCode.trim();

	if (!trimmedCode) {
		return false;
	}

	let query = supabase.from("products").select("product_id").eq("product_code", trimmedCode).limit(1);

	if (excludeProductId !== undefined) {
		query = query.neq("product_id", excludeProductId);
	}

	const { data, error } = await query;

	if (error) {
		console.error("Failed checking product code availability:", error.message);

		throw error;
	}

	return data.length === 0;
};
