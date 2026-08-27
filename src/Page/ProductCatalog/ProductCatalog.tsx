// IMPORT STYLES
import style from "./ProductCatalog.module.css";
// IMPORT TYPES
import type { ProductInfoProps } from "../../Component/ProductItem/ProductItem";
// IMPORT HOOKS
import { useState } from "react";
import { adjustQuantity } from "../../Services/supabase/productService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
// IMPORT COMPONENTS
import ProductSection from "../../Component/ProductSection/ProductSection";
import StockAdjustmentDrawer from "./StockAdjustmentDrawer/StockAdjustmentDrawer";
import EditProductDrawer from "./EditProductDrawer/EditProductDrawer";

// import { toast } from "react-toastify";

type TProductDrawer =
	| { type: "stock"; product: ProductInfoProps }
	| { type: "edit"; product: ProductInfoProps }
	| { type: "add" }
	| null;

const ProductCatalog = () => {
	const [drawer, setDrawer] = useState<TProductDrawer>(null);

	const queryClient = useQueryClient();

	const onQuerySuccess = () => {
		setDrawer(null);

		queryClient.invalidateQueries({
			queryKey: ["products"]
		});
	};

	const adjustProductQuantityMutation = useMutation({
		mutationFn: adjustQuantity,
		onSuccess: onQuerySuccess
	});

	// const saveProductInformation = useMutation({
	// 	mutationFn: saveProduct,
	// 	onSuccess: () => onQuerySuccess
	// });

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
					onEditProduct={(product) => {
						setDrawer({
							type: "edit",
							product
						});
					}}
					onAddProduct={() => {
						setDrawer({
							type: "add"
						});
					}}
				/>
			</main>

			{drawer?.type === "edit" && (
				<EditProductDrawer
					key={drawer.product.id}
					mode="edit"
					product={{
						productId: Number(drawer.product.id),
						productName: drawer.product.productName,
						productPrice: drawer.product.price,
						productCode: drawer.product.productCode,
						productCategory: drawer.product.productCategory,
						description: drawer.product.description,
						isActive: drawer.product.isActive,
						productImageUrl: drawer.product.productImageUrl
					}}
					// productImageUrl={drawer.product.productImageUrl ?? ""}
					onClose={() => setDrawer(null)}
					onSave={(product) => {
						console.log(product);
						// const { productId, productDetail } = product;

						// saveProductInformation.mutate({
						// 	productId: productId,
						// 	newProduct: productDetail
						// });
					}}
				/>
			)}
			{/* {drawer?.type === "add" && (
				<EditProductDrawer
					mode="add"
					onClose={() => setDrawer(null)}
					onSave={(product) => {
						console.log(product);
						saveProductInformation.mutate({
							productId: productId,
							newProduct: product
						});
					}}
				/>
			)} */}

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
