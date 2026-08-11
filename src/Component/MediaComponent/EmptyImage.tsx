import type { SVGProps } from "react";

const EmptyImage = (props: SVGProps<SVGSVGElement>) => {
	return (
		<svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
			<path
				d="M9 12.5A3.5 3.5 0 0 1 12.5 9h23a3.5 3.5 0 0 1 3.5 3.5v23a3.5 3.5 0 0 1-3.5 3.5h-23A3.5 3.5 0 0 1 9 35.5v-23Z"
				fill="none"
				stroke="currentColor"
				strokeWidth="2.5"
			/>
			<circle cx="17" cy="17" r="3" fill="currentColor" />
			<path
				d="m12 34 8.5-9 6 6 4-4L38 34"
				fill="none"
				stroke="currentColor"
				strokeWidth="2.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export default EmptyImage;
