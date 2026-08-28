// IMPORT TYPES
import type { DTProductQuery } from "../../Types/database-query";
// import type { Database } from "../../Types/database";
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

export const getProducts = async (): Promise<TProductWithQty[]> => {
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
			is_active,
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

	const result: TProductWithQty[] = products.map((product) => ({
		productId: Number(product.product_id),
		productCode: product.product_code,
		productName: product.product_name,
		productPrice: product.product_price,
		productImageUrl: getProductImageUrl(product.product_code),
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
	const insertEntry = {
		product_code: product.productCode,
		product_name: product.productName,
		product_price: product.productPrice,
		product_category: product.productCategory,
		description: product.description,
		is_active: product.isActive
	};
	const { data, error } = await supabase.from("products").insert(insertEntry).select().single();

	if (error) {
		toast.error(`Failed Creating products ${error.message}`);
		console.log(error.message);
		throw error;
	}

	return {
		productId: data.product_id,
		productCode: data.product_code,
		productName: data.product_name,
		productPrice: Number(data.product_price),
		productImageUrl: getProductImageUrl(data.product_code),
		productCategory: data.product_category ?? "",
		description: data.description ?? "",
		isActive: data.is_active
	};
}

export async function updateProduct(product: TProductProfile): Promise<TProductProfile> {
	const productId = product.productId;
	const updateEntry = {
		product_code: product.productCode,
		product_name: product.productName,
		product_price: product.productPrice,
		product_category: product.productCategory,
		description: product.description,
		is_active: product.isActive
	};
	const { data, error } = await supabase
		.from("products")
		.update(updateEntry)
		.eq("product_id", productId)
		.select()
		.single();

	if (error) {
		toast.error(`Failed Updating Products ${error.message}`);
		console.log(error.message);
		throw error;
	}

	return {
		productId: data.product_id,
		productCode: data.product_code,
		productName: data.product_name,
		productPrice: data.product_price,
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
