// IMPORT STYLES
import style from "./TransactionDetailItem.module.css";
// IMPORT UTILITITIES
import { rupiahFormater } from "../../../Utilities/NumberFormater";

export type TTransactionDetailItem = {
	id: string;

	/*
	 * Temporary field.
	 *
	 * Later this will come from:
	 *
	 * transaction_item
	 *      ↓
	 * product
	 *      ↓
	 * product_name
	 */
	productName: string;

	quantity: number;

	unitPrice: number;

	subtotal: number;
};

const TransactionDetailItem = ({ productName, quantity, unitPrice, subtotal }: TTransactionDetailItem) => {
	return (
		<div className={style.transactionDetailItem}>
			<div className={style.productInfo}>
				<span className={style.productName}>{productName}</span>

				<span className={style.productQuantity}>Qty {quantity}</span>
			</div>

			<div className={style.unitPrice}>{rupiahFormater(unitPrice)}</div>

			<div className={style.subtotal}>{rupiahFormater(subtotal)}</div>
		</div>
	);
};

export default TransactionDetailItem;
