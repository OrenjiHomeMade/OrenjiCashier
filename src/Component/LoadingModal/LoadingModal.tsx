// IMPORT STYLES
import Modal from "../ModalOverlay/Modal";
import style from "./LoadingModal.module.css";

type LoadingModalProps = {
	isOpen: boolean;
	children?: React.ReactNode;
};

const LoadingModal = ({ isOpen, children }: LoadingModalProps) => {
	if (!isOpen) {
		return null;
	}

	return (
		// <div className={style.overlay}>
		// 	<div className={style.modal} role="status" aria-live="polite">
		<Modal isOpen={isOpen}>
			<div className={style.spinner} />

			{children && <p className={style.message}>{children}</p>}
		</Modal>
		// 	</div>
		// </div>
	);
};

export default LoadingModal;
