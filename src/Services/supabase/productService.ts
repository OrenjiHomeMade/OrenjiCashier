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

export const getProducts = async (): Promise<TProduct[]> => {
	try {
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
			throw error;
		}

		return data;
	} catch (e) {
		const error = e as Error;
		toast.error(error.message);
		console.log(error.message);
		return [];
	}
};
