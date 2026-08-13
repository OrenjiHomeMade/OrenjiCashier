import { supabase } from "./client";
import { toast } from "react-toastify";

export type TProductWithQty = {
	product_id: string;
	product_code: string;
	product_name: string;
	product_image: string | null;
	product_price: number;
	product_category: string;
	description: string | null;
	stock_quantity: number;
};

type TProductQuery = Omit<TProductWithQty, "stock_quantity"> & {
	product_stock: {
		stock_quantity: number;
	} | null;
};

export const getProducts = async (): Promise<TProductWithQty[]> => {
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

	// console.log("SUPABASE DATA:", data);
	// console.log("SUPABASE ERROR:", error);

	const products = data as unknown as TProductQuery[];

	const result: TProductWithQty[] = products.map((product) => ({
		product_id: product.product_id,
		product_code: product.product_code,
		product_name: product.product_name,
		product_image: product.product_image,
		product_price: product.product_price,
		product_category: product.product_category,
		description: product.description,
		stock_quantity: product.product_stock?.stock_quantity ?? 0
	}));

	// console.log("GET PRODUCTS RESULT:", result);

	return result;
};

export const getProductImageUrl = (product_code: string) => {
	const imagePath = `${product_code}.webp`;

	const { data } = supabase.storage.from("product-images").getPublicUrl(imagePath);

	return data.publicUrl;
};

export type TProductQuantityMovement = {
	productId: number;
	adjustmentQty: number;
	adjustmentType: string;
	note: string;
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

export type TProductProfile = {
	productId: number;
	productName: string;
	productImageUrl: string;
	productPrice: number;
};

export async function convertToWebP(file: File): Promise<Blob> {
	const image = new Image();

	const objectUrl = URL.createObjectURL(file);

	try {
		image.src = objectUrl;

		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = reject;
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

export type TProductImage = {
	productCode: string;
	file: File;
};

export async function uploadProductImage({ productCode, file }: TProductImage) {
	const image = convertToWebP(file);
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
