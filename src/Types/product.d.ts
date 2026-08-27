import type { Item } from "react-use-cart";

/*************************** CART ITEM ***************************/
export interface TProduct extends Item {
	productName: string;
	productImageUrl?: string;
	category: string;
	description: string;
}

/*************************** PRODUCT CATALOG ***************************/

/*************************** Product Management ***************************/
export type TProductProfile = {
	productId: number;
	productName: string;
	productImageUrl: string;
	productPrice: number;
};

export type TProductImage = {
	productCode: string;
	file: File;
};

export type TProductInput = {
	productCode: string;
	productName: string;
	productPrice: number;
	productCategory: string | null;
	description: string | null;
	isActive: boolean;
};

/*************************** Quantity Management ***************************/
export type TProductQuantityMovement = {
	productId: number;
	adjustmentQty: number;
	adjustmentType: string;
	note: string;
};
