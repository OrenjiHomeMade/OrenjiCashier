import type { Item } from "react-use-cart";

export interface TProduct extends Item {
	productName: string;
	productImageUrl?: string;
	category: string;
	description: string;
}
