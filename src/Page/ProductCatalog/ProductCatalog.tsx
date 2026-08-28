// IMPORT STYLES
import style from "./ProductCatalog.module.css";
// IMPORT TYPES
import type { ProductInfoProps } from "../../Component/ProductItem/ProductItem";
// IMPORT HOOKS
import { useState } from "react";
import { adjustQuantity, getProductCategories, saveProduct } from "../../Services/supabase/productService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// IMPORT COMPONENTS
import ProductSection from "../../Component/ProductSection/ProductSection";
import StockAdjustmentDrawer from "./StockAdjustmentDrawer/StockAdjustmentDrawer";
import EditProductDrawer from "./EditProductDrawer/EditProductDrawer";

type TProductDrawer =
	| { type: "stock"; product: ProductInfoProps }
	| { type: "edit"; product: ProductInfoProps }
	| { type: "add" }
	| null;

const ProductCatalog = () => {
	const [drawer, setDrawer] = useState<TProductDrawer>(null);

	const queryClient = useQueryClient();

	const { data: productsCategory = [] } = useQuery({
		queryKey: ["category"],
		queryFn: () => getProductCategories()
	});

	const onProductQuerySuccess = () => {
		setDrawer(null);

		queryClient.invalidateQueries({
			queryKey: ["products"]
		});
	};

	const adjustProductQuantityMutation = useMutation({
		mutationFn: adjustQuantity,
		onSuccess: onProductQuerySuccess
	});

	const saveProductInformation = useMutation({
		mutationFn: saveProduct,
		onSuccess: onProductQuerySuccess
	});

	return (
		<div className={`page ${style.productCatalog}`}>
			<main className={style.productSection}>
				<ProductSection
					mode="Catalog"
					categories={productsCategory}
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
					categories={productsCategory}
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
					onClose={() => setDrawer(null)}
					onSave={(product) => {
						console.log(product);
						saveProductInformation.mutate(product);
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
