import type { SVGProps } from "react";

const InvoiceIcon = (props: SVGProps<SVGSVGElement>) => {
	return (
		// <svg
		// 	width="18"
		// 	height="18"
		// 	viewBox="0 0 24 24"
		// 	fill="none"
		// 	xmlns="http://www.w3.org/2000/svg"
		// 	aria-hidden="true"
		// 	strokeWidth="3"
		// 	{...props}
		// >
		// 	<path
		// 		d="M7 3H17C18.1046 3 19 3.89543 19 5V21L16 19L13 21L10 19L7 21V3Z"
		// 		stroke="currentColor"
		// 		// strokeWidth="1.8"
		// 		strokeLinecap="round"
		// 		strokeLinejoin="round"
		// 	/>
		// 	<path d="M10 7H16" stroke="currentColor" strokeLinecap="round" />
		// 	<path d="M10 11H16" stroke="currentColor" strokeLinecap="round" />
		// 	<path d="M10 15H14" stroke="currentColor" strokeLinecap="round" />
		// </svg>
		<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 640 640" {...props}>
			<path d="M192 64C156.7 64 128 92.7 128 128L128 512C128 547.3 156.7 576 192 576L448 576C483.3 576 512 547.3 512 512L512 234.5C512 217.5 505.3 201.2 493.3 189.2L386.7 82.7C374.7 70.7 358.5 64 341.5 64L192 64zM453.5 240L360 240C346.7 240 336 229.3 336 216L336 122.5L453.5 240zM192 448L192 384C192 366.3 206.3 352 224 352L416 352C433.7 352 448 366.3 448 384L448 448C448 465.7 433.7 480 416 480L224 480C206.3 480 192 465.7 192 448zM216 128L264 128C277.3 128 288 138.7 288 152C288 165.3 277.3 176 264 176L216 176C202.7 176 192 165.3 192 152C192 138.7 202.7 128 216 128zM216 224L264 224C277.3 224 288 234.7 288 248C288 261.3 277.3 272 264 272L216 272C202.7 272 192 261.3 192 248C192 234.7 202.7 224 216 224z" />
		</svg>
	);
};

export default InvoiceIcon;
