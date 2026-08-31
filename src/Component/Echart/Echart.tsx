import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";

export type EChartProps = {
	option: EChartsOption;
	height?: number | string;
	className?: string;
};

/**
 * Thin mount/resize/dispose wrapper around raw echarts — avoids pulling in
 * echarts-for-react as an extra dependency for what is otherwise ~20 lines.
 */
export default function EChart({ option, height = 220, className }: EChartProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const chartRef = useRef<echarts.ECharts | null>(null);

	useEffect(() => {
		if (!containerRef.current) {
			return;
		}

		const chart = echarts.init(containerRef.current);
		chartRef.current = chart;

		const resizeObserver = new ResizeObserver(() => chart.resize());
		resizeObserver.observe(containerRef.current);

		return () => {
			resizeObserver.disconnect();
			chart.dispose();
			chartRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		chartRef.current?.setOption(option, true);
	}, [option]);

	return <div ref={containerRef} className={className} style={{ width: "100%", height }} />;
}
