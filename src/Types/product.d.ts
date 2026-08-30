import type { Item } from "react-use-cart";

export type TProduct = {
	productCode: string;
	productName: string;
	productImageUrl?: string;
	productCategory: string;
	description: string;
	isActive: boolean;
};

export type TProductPricing = {
	productPrice: number;
	costIngredient?: number;
	costLabor?: number;
	costPackaging?: number;
	costUtilities?: number;
};

/*************************** CART ITEM ***************************/
export type TProductItem = TProduct & TProductPricing & Item;

/*************************** PRODUCT CATALOG ***************************/

/*************************** Product Management ***************************/
export type TProductProfile = {
	productId: number;
} & TProduct &
	TProductPricing;

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
