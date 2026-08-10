import type { SVGProps } from "react";

const CashierIcon = (props: SVGProps<SVGSVGElement>) => {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			{...props}
		>
			<path d="M16 10a4 4 0 0 1-8 0" />
			<path d="M3.103 6.034h17.794" />
			<path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2L19 3.6A2 2 0 0 0 17.4 2H6.6A2 2 0 0 0 5 3.6L3.4 5.467z" />
		</svg>
	);
};

export default CashierIcon;
