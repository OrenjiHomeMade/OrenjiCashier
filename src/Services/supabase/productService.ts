import { supabase } from "./client";
import { toast } from "react-toastify";

export type TProduct = {
	product_id: string;
	product_code: string;
	product_name: string;
	product_image: string | null;
	product_price: number;
	product_category: string;
	description: string | null;
};

export const getProducts = async (): Promise<TProduct[] | null> => {
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
                description
                `
		)
		.eq("is_active", true)
		.is("deleted_at", null);

	if (error) {
		toast.error(`Failed Loading products ${error.message}`);
		console.log(error.message);
		return null;
	}
	// console.log(data);
	return data;
};

export const getProductImageUrl = (product_code: string) => {
	const imagePath = `${product_code}.webp`;

	const { data } = supabase.storage.from("product-images").getPublicUrl(imagePath);

	return data.publicUrl;
};
