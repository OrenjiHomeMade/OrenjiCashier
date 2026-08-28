// IMPORT STYLES
import style from "./TransactionDetailItem.module.css";
// IMPORT UTILITITIES
import { rupiahFormater } from "../../../Utilities/NumberFormater";
import type { TTransactionItem } from "../../../Types/transaction";

type TransactionDetailItemProps = TTransactionItem;

const TransactionDetailItem = ({ productName, quantity, unitPrice, subtotal }: TransactionDetailItemProps) => {
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
