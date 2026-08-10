import type { SVGProps } from "react";

interface ChevronProps extends SVGProps<SVGSVGElement> {
	direction: "down" | "right" | "left" | "up";
}

const ChevronIcon = ({ direction, ...props }: ChevronProps) => {
	let drawing;
	switch (direction) {
		case "down":
			drawing = <path d="m6 9 6 6 6-6" />;
			break;
		case "right":
			drawing = <path d="m9 18 6-6-6-6" />;
			break;
		case "left":
			drawing = <path d="m15 18-6-6 6-6" />;
			break;
		case "up":
			drawing = <path d="m18 15-6-6-6 6" />;
			break;
		default:
			<div></div>;
			break;
	}
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.25"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="lucide lucide-chevron-down-icon lucide-chevron-down"
			{...props}
		>
			{drawing}
		</svg>
	);
};

export default ChevronIcon;
