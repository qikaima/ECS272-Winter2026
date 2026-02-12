import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { isEmpty } from 'lodash';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { classifyGenre } from '../classify';

interface Props {
  selectedSupergenre: string | null;
  onSelectSupergenre: React.Dispatch<React.SetStateAction<string | null>>;
}

export default function Example({ selectedSupergenre, onSelectSupergenre }: Props) {
  const [bars, setBars] = useState<any[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const margin = { top: 0.2, right: 0.04, bottom: 0.32, left: 0.18 };

  const onResize = useDebounceCallback((s) => setSize(s), 200);
  useResizeObserver({ ref: barRef as React.RefObject<HTMLDivElement>, onResize });

  useEffect(() => {
    const loadData = async () => {
      const rawData = await d3.csv('../../data/top_1000_most_swapped_books.csv');
      const processed = rawData
        .filter(d => d.age_category && d.age_category !== 'Unknown')
        .map(d => ({
          category: classifyGenre(d.genre ?? 'Other'),
          stack: d.age_category,
          value: 1
        }));

      const grouped = d3.rollups(processed, v => v.length, d => d.category, d => d.stack);
      const finalBars: any[] = [];
      grouped.forEach(([cat, stacks]) => {
        stacks.forEach(([stk, val]) => finalBars.push({ category: cat, stack: stk, value: val }));
      });
      setBars(finalBars);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isEmpty(bars) || size.width === 0 || size.height === 0) return;

    const svg = d3.select(barRef.current).select<SVGSVGElement>('#bar-svg');
    const { width: w, height: h } = size;

    // tooltip
    let tooltip = d3.select(barRef.current).select<HTMLDivElement>('.d3-tooltip');
    if (tooltip.empty()) {
      tooltip = d3.select(barRef.current)
        .append('div')
        .attr('class', 'd3-tooltip')
        .style('position', 'absolute')
        .style('z-index', '10')
        .style('visibility', 'hidden')
        .style('padding', '10px')
        .style('background', 'rgba(255, 255, 255, 0.95)')
        .style('border', '1px solid #999')
        .style('border-radius', '4px')
        .style('box-shadow', '0 2px 4px rgba(0,0,0,0.2)')
        .style('pointer-events', 'none')
        .style('font-family', 'sans-serif')
        .style('font-size', '12px');
    }

    const leftM = margin.left * w;
    const topM = Math.max(margin.top * h, 80);
    const bottomM = margin.bottom * h;

    const ageOrder = ['Adult', 'Young Adult', 'Children'];
    const categories = Array.from(new Set(bars.map(d => d.category))).sort();
    const dataMap = d3.rollup(bars, v => Object.fromEntries(v.map(d => [d.stack, d.value])), d => d.category);
    const stackedData = Array.from(dataMap, ([category, values]) => ({ category, ...values }));
    const series = d3.stack().keys(ageOrder).value((d: any, key) => d[key] || 0)(stackedData as any);

    const x = d3.scaleBand().domain(categories).range([leftM, w - margin.right * w]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(series, s => d3.max(s, d => d[1])) || 0]).nice().range([h - bottomM, topM]);

    const color = d3.scaleOrdinal<string>().domain(ageOrder).range(['#1fb787a5', '#52deb2a5', '#a1ffe1a5']);

    svg.selectAll('rect.bg').data([null]).join('rect').attr('class', 'bg').attr('width', w).attr('height', h).attr('fill', '#dbdcd0');

    const chartG = svg.selectAll<SVGGElement, any>('g.chart-g').data([null]).join('g').attr('class', 'chart-g');

    const layers = chartG.selectAll<SVGGElement, any>('g.layer')
      .data(series, (d: any) => d.key)
      .join('g').attr('class', 'layer').attr('fill', d => color(d.key));

    layers.selectAll('rect')
      .data(d => d.map((item: any) => ({ ...item, key: d.key, category: item.data.category })), (d: any) => d.category)
      .join('rect')
      .attr('x', d => x(d.category)!)
      .attr('width', x.bandwidth())
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d: any) {
        const count = d[1] - d[0];
        const totalInGenre = d3.sum(Object.values(d.data).filter(v => typeof v === 'number'));
        const percent = d3.format(".1%")(count / totalInGenre);

        tooltip.style('visibility', 'visible')
          .html(`
            <div style="font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid #ccc; padding-bottom: 2px;">${d.category}</div>
            <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
              <span style="width:10px; height:10px; background:${color(d.key)}; border-radius:50%; display:inline-block;"></span>
              <span>Age: <b>${d.key}</b></span>
            </div>
            <div style="margin-top: 4px;">Count: <b>${count}</b></div>
            <div>Percentage: <b>${percent}</b></div>
          `);
        
        d3.select(this).style('stroke', '#333').style('stroke-width', '1.5px');
      })
      .on('mousemove', function (event) {
        tooltip
          .style('top', (event.offsetY - 10) + 'px')
          .style('left', (event.offsetX + 15) + 'px');
      })
      .on('mouseleave', function () {
        tooltip.style('visibility', 'hidden');
        d3.select(this).style('stroke', 'none');
      })
      // click
      .on('click', (event, d: any) => onSelectSupergenre(prev => prev === d.category ? null : d.category))
      .transition().duration(500)
      .attr('y', d => y(d[1]))
      .attr('height', d => y(d[0]) - y(d[1]))
      .style('opacity', d => (selectedSupergenre === null || d.category === selectedSupergenre) ? 1 : 0.3);

    svg.selectAll<SVGGElement, any>('g.x-axis').data([null]).join('g').attr('class', 'x-axis')
      .attr('transform', `translate(0,${h - bottomM})`)
      .transition().duration(500)
      .call(d3.axisBottom(x) as any)
      .selectAll("text")
      .attr("font-size", `${Math.max(w * 0.008, 10)}px`)
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    svg.selectAll<SVGGElement, any>('g.y-axis').data([null]).join('g').attr('class', 'y-axis')
      .attr('transform', `translate(${leftM},0)`)
      .transition().duration(500)
      .call(d3.axisLeft(y) as any);

    // x lable
    svg.selectAll('text.x-label').data([null]).join('text').attr('class', 'x-label')
      .attr('x', leftM + (w - leftM - margin.right * w) / 2).attr('y', h - bottomM / 4)
      .attr('text-anchor', 'middle')
      .style('font-size', `${Math.max(w * 0.015, 12)}px`)
      .text('Supergenre');

    // y lable
    svg.selectAll('text.y-label').data([null]).join('text').attr('class', 'y-label')
      .attr('transform', `translate(${leftM / 4}, ${topM + (h - topM - bottomM) / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .style('font-size', `${Math.max(w * 0.015, 12)}px`)
      .text('Book Count');

    // title
    svg.selectAll('text.title').data([null]).join('text').attr('class', 'title')
      .attr('x', w / 2)
      .attr('y', topM * 0.45)
      .attr('text-anchor', 'middle')
      .style('font-size', `${0.025 * w}px`)
      .style('font-weight', 'bold')
      .text('Top 1000 Swaped Book Count by Supergenre & Age Group');

    // legend
    const legG = svg.selectAll<SVGGElement, any>('g.legend').data([null]).join('g').attr('class', 'legend')
      .attr('transform', `translate(${leftM}, ${topM * 0.75})`);

    const legItems = legG.selectAll<SVGGElement, string>('g.item').data(ageOrder, d => d)
      .join('g').attr('class', 'item')
      .attr('transform', (d, i) => `translate(${i * 0.15 * w}, 0)`);

    legItems.selectAll('rect').data(d => [d]).join('rect').attr('width', 0.015 * w).attr('height', 0.015 * w).attr('fill', d => color(d));
    legItems.selectAll('text').data(d => [d]).join('text').attr('x', 0.02 * w).attr('y', 0.012 * w).text(d => d)
      .style('font-size', `${Math.max(w * 0.01, 10)}px`);

  }, [bars, size, selectedSupergenre]);

  return (
    <div ref={barRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg id="bar-svg" width="100%" height="100%"></svg>
    </div>
  );
}