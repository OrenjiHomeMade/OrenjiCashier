// IMPORT STYLES
import style from "./Modal.module.css";

type ModalProps = {
	isOpen: boolean;
	children?: React.ReactNode;
};

const Modal = ({ isOpen, children }: ModalProps) => {
	if (!isOpen) {
		return null;
	}

	return (
		<div className={style.overlay}>
			<div className={style.modal} role="status" aria-live="polite">
				{children}
			</div>
		</div>
	);
};

export default Modal;
