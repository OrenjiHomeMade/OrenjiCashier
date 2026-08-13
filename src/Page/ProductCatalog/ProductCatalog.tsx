import { useState } from "react";

import ProductSection from "../../Component/ProductSection/ProductSection";
import StockAdjustmentDrawer from "./StockAdjustmentDrawer/StockAdjustmentDrawer";

import style from "./ProductCatalog.module.css";

import type { TProductInfo } from "../../Component/ProductItem/ProductItem";
import { adjustQuantity } from "../../Services/supabase/productService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import EditProductDrawer from "./EditProductDrawer/EditProductDrawer";
import { toast } from "react-toastify";

const ProductCatalog = () => {
	const [stockProduct, setStockProduct] = useState<TProductInfo | null>(null);
	const [editProduct, setEditProduct] = useState<TProductInfo | null>(null);
	const queryClient = useQueryClient();
	const adjustProductQuantityMutation = useMutation({
		mutationFn: adjustQuantity,
		onSuccess: () => {
			setStockProduct(null);
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
						setStockProduct(product);
					}}
					onItemEdit={(product) => {
						setEditProduct(product);
					}}
				/>
			</main>
			{editProduct && (
				<EditProductDrawer
					key={editProduct.id}
					productId={Number(editProduct.id)}
					productName={editProduct.productName}
					productPrice={editProduct.price}
					productImageUrl={editProduct.productImageUrl ?? ""}
					onClose={() => setEditProduct(null)}
					onSave={() => {
						toast("This function is not yet available!");
					}}
				/>
			)}
			{stockProduct && (
				<StockAdjustmentDrawer
					key={stockProduct.id}
					productId={Number(stockProduct.id)}
					productName={stockProduct.productName}
					currentStock={stockProduct.availableStock}
					productImageUrl={stockProduct.productImageUrl ?? ""}
					onClose={() => setStockProduct(null)}
					onSave={(qtyAdjustment) => {
						adjustProductQuantityMutation.mutate(qtyAdjustment);
					}}
				/>
			)}
		</div>
	);
};

export default ProductCatalog;
