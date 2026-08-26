import { useState } from "react";

import ProductSection from "../../Component/ProductSection/ProductSection";
import StockAdjustmentDrawer from "./StockAdjustmentDrawer/StockAdjustmentDrawer";
import EditProductDrawer from "./EditProductDrawer/EditProductDrawer";

import style from "./ProductCatalog.module.css";

import type { TProductInfo } from "../../Component/ProductItem/ProductItem";
import { adjustQuantity } from "../../Services/supabase/productService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

type TProductDrawer =
	| { type: "stock"; product: TProductInfo }
	| { type: "edit"; product: TProductInfo }
	| { type: "add" }
	| null;

const ProductCatalog = () => {
	const [drawer, setDrawer] = useState<TProductDrawer>(null);

	const queryClient = useQueryClient();

	const adjustProductQuantityMutation = useMutation({
		mutationFn: adjustQuantity,
		onSuccess: () => {
			setDrawer(null);

			queryClient.invalidateQueries({
				queryKey: ["products"]
			});
		}
	});

	return (
		<div className={`page ${style.productCatalog}`}>
			<main className={style.productSection}>
				<ProductSection
					mode="Catalog"
					onItemAdjusted={(product) => {
						setDrawer({
							type: "stock",
							product
						});
					}}
					onItemEdit={(product) => {
						setDrawer({
							type: "edit",
							product
						});
					}}
					onItemAdd={() => {
						setDrawer({
							type: "add"
						});
					}}
				/>
			</main>

			{drawer?.type === "edit" && (
				<EditProductDrawer
					key={drawer.product.id}
					productId={Number(drawer.product.id)}
					productName={drawer.product.productName}
					productPrice={drawer.product.price}
					productImageUrl={drawer.product.productImageUrl ?? ""}
					onClose={() => setDrawer(null)}
					onSave={(product) => {
						console.log(product);
						toast("This function is not yet available!");
					}}
				/>
			)}

			{drawer?.type === "stock" && (
				<StockAdjustmentDrawer
					key={drawer.product.id}
					productId={Number(drawer.product.id)}
					productName={drawer.product.productName}
					currentStock={drawer.product.availableStock}
					productImageUrl={drawer.product.productImageUrl ?? ""}
					onClose={() => setDrawer(null)}
					onSave={(qtyAdjustment) => {
						adjustProductQuantityMutation.mutate(qtyAdjustment);
					}}
				/>
			)}
		</div>
	);
};

export default ProductCatalog;
