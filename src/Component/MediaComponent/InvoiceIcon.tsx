import type { SVGProps } from "react";

const InvoiceIcon = (props: SVGProps<SVGSVGElement>) => {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			strokeWidth="3"
			{...props}
		>
			<path
				d="M7 3H17C18.1046 3 19 3.89543 19 5V21L16 19L13 21L10 19L7 21V3Z"
				stroke="currentColor"
				// strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path d="M10 7H16" stroke="currentColor" strokeLinecap="round" />
			<path d="M10 11H16" stroke="currentColor" strokeLinecap="round" />
			<path d="M10 15H14" stroke="currentColor" strokeLinecap="round" />
		</svg>
	);
};

export default InvoiceIcon;
