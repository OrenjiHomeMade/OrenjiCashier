// IMPORT TYPES
import type { DTProduct, DTProductQuery, DTProductWithQty } from "../../Types/database";
import type { TProductImage, TProductQuantityMovement } from "../../Types/product";
// IMPORT LIBRARY
import { supabase } from "./client";
import { toast } from "react-toastify";

export const getProducts = async (): Promise<Omit<DTProductWithQty, "is_active">[]> => {
	console.log("Fetching Product");

	const { data, error } = await supabase
		.from("products")
		.select(
			`
			product_id,
			product_code,
			product_name,
			product_image,
			product_price,
			product_category,
			description,
			product_stock!product_stock_product_id_fkey (
				stock_quantity
			)
		`
		)
		.eq("is_active", true)
		.is("deleted_at", null);

	if (error) {
		toast.error(`Failed Loading products ${error.message}`);
		console.log(error.message);
		return [];
	}

	const products = data as unknown as DTProductQuery[];

	const result: Omit<DTProductWithQty, "is_active">[] = products.map((product) => ({
		product_id: product.product_id,
		product_code: product.product_code,
		product_name: product.product_name,
		product_image: product.product_image,
		product_price: product.product_price,
		product_category: product.product_category,
		description: product.description,
		stock_quantity: product.product_stock?.stock_quantity ?? 0
	}));

	return result;
};

export const getProductImageUrl = (product_code: string) => {
	const imagePath = `${product_code}.webp`;

	const { data } = supabase.storage.from("product-images").getPublicUrl(imagePath);

	return data.publicUrl;
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

	const path = `products/${productCode}.webp`;

	const { error } = await supabase.storage.from("product-images").upload(path, image, {
		contentType: "image/webp",
		upsert: true
	});

	if (error) {
		throw error;
	}

	return path;
}

export async function deleteProductImage(productCode: string): Promise<void> {
	const path = `products/${productCode}.webp`;

	const { error } = await supabase.storage.from("product-images").remove([path]);

	if (error) {
		throw error;
	}
}

export type TProductSchema = {
	productId: number;
	productCode: string;
	productName: string;
	productPrice: number;
	productCategory: string | null;
	description: string | null;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
};

export async function createProduct(product: DTProduct): Promise<TProductSchema> {
	const { data, error } = await supabase.from("products").insert(product).select().single();

	if (error) {
		throw error;
	}

	return {
		productId: data.product_id,
		productCode: data.product_code,
		productName: data.product_name,
		productPrice: Number(data.product_price),
		productCategory: data.product_category,
		description: data.description,
		isActive: data.is_active,
		createdAt: data.created_at,
		updatedAt: data.updated_at,
		deletedAt: data.deleted_at
	};
}

// export async function updateProduct(productId: number, product: TProductInput): Promise<TProductSchema> {
// 	const { data, error } = await supabase
// 		.from("products")
// 		.update(productToDb(product))
// 		.eq("product_id", productId)
// 		.select()
// 		.single();

// 	if (error) {
// 		throw error;
// 	}

// 	return {
// 		productId: data.product_id,
// 		productCode: data.product_code,
// 		productName: data.product_name,
// 		productPrice: Number(data.product_price),
// 		productCategory: data.product_category,
// 		description: data.description,
// 		isActive: data.is_active,
// 		createdAt: data.created_at,
// 		updatedAt: data.updated_at,
// 		deletedAt: data.deleted_at
// 	};
// }

// export type TSaveProductParams = {
// 	productId?: number;
// 	previousProductCode?: string;
// 	product: TProductInput;
// 	image?: File | null;
// };

// export async function saveProduct({
// 	productId,
// 	previousProductCode,
// 	product,
// 	image
// }: TSaveProductParams): Promise<TProductSchema> {
// 	const isEdit = productId !== undefined;

// 	let savedProduct: TProductSchema;

// 	if (isEdit) {
// 		savedProduct = await updateProduct(productId, product);
// 	} else {
// 		savedProduct = await createProduct(product);
// 	}

// 	if (image) {
// 		if (isEdit && previousProductCode && previousProductCode !== product.productCode) {
// 			await deleteProductImage(previousProductCode);
// 		}

// 		await uploadProductImage({
// 			productCode: product.productCode,
// 			file: image
// 		});
// 	}

// 	return savedProduct;
// }
