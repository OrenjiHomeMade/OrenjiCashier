import type { Item } from "react-use-cart";

export type TProduct = {
	productCode: string;
	productName: string;
	productImageUrl?: string;
	productCategory: string;
	description: string;
	isActive: boolean;
};

/*************************** CART ITEM ***************************/
export type TProductItem = TProduct & Item;

/*************************** PRODUCT CATALOG ***************************/

/*************************** Product Management ***************************/
export type TProductProfile = TProduct & {
	productId: number;
	// productCode: string;
	// productName: string;
	productPrice: number;
	// productImageUrl: string | null;
	// productCategory: string | null;
	// description: string | null;
};

export type TProductImage = {
	productCode: string;
	file: File;
};

export type TSaveProductParams = {
	productId?: number;
	previousProductCode?: string;
	newProduct: Omit<TProductProfile, "productId">;
	image?: File | null;
};

/*************************** Quantity Management ***************************/
export type TProductWithQty = TProductProfile & {
	stockQuantity: number;
};

export type TProductQuantityMovement = {
	productId: number;
	adjustmentQty: number;
	adjustmentType: string;
	note: string;
};
