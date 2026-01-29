import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { isEmpty } from 'lodash';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';

interface StackedBar {
  category: string;
  stack: string;
  value: number;
}

interface StackedData {
  category: string;
  [key: string]: number | string;
}

interface ComponentSize {
  width: number;
  height: number;
}

interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export default function StackedBarChart() {
  const [bars, setBars] = useState<StackedBar[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });

  const margin: Margin = { top: 0.2, right: 0.04, bottom: 0.3, left: 0.12 };

  const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
  useResizeObserver({ ref: barRef as React.RefObject<HTMLDivElement>, onResize });

  useEffect(() => {
    const loadData = async () => {
      try {
        const rawData = await d3.csv('../../data/top_1000_most_swapped_books.csv');

        const grouped = d3.rollup(
          rawData,
          v => v.length,
          d => d.genre,
          d => d.age_category
        );

        const barsData: StackedBar[] = [];
        for (const [genre, map] of grouped) {
          for (const [age, count] of map) {
            barsData.push({ category: genre ?? 'Unknown', stack: age ?? 'Unknown', value: count });
          }
        }

        setBars(barsData);
      } catch (error) {
        console.error('Error loading CSV:', error);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (isEmpty(bars)) return;
    if (size.width === 0 || size.height === 0) return;
    d3.select('#bar-svg').selectAll('*').remove();
    drawChart();
  }, [bars, size]);

  function drawChart() {
    const svg = d3.select('#bar-svg');
    const w = size.width;
    const h = size.height;

    const leftMargin = margin.left * w;
    const rightMargin = margin.right * w;
    const topMargin = margin.top * h;
    const bottomMargin = margin.bottom * h;

    const genres = Array.from(new Set(bars.map(d => d.category)));
    const stacks = Array.from(new Set(bars.map(d => d.stack)));

    const dataMap = d3.rollup(
      bars,
      v => {
        const obj: Record<string, number> = {};
        for (const d of v) obj[d.stack] = d.value;
        return obj;
      },
      d => d.category
    );

    const stackedInput: StackedData[] = Array.from(dataMap, ([category, values]) => ({
      category,
      ...values,
    }));

    const series = d3.stack<StackedData, string>()
      .keys(stacks)
      .value((d, key) => (d[key] as number) ?? 0)
      (stackedInput);

    const x = d3.scaleBand()
      .domain(genres)
      .range([leftMargin, w - rightMargin])
      .padding(0.1);

    const chartHeight = h - topMargin - bottomMargin;

    const y = d3.scaleLinear()
      .domain([0, d3.max(series, s => d3.max(s, d => d[1])) || 0])
      .nice()
      .range([chartHeight + topMargin, topMargin]);

    const color = d3.scaleOrdinal<string>()
      .domain(stacks)
      .range(['#018dffa5', '#73c0ffb1', '#c5efffbc', '#C7F464', '#C44D58']);

    // backgroud
  svg.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', size.width)
    .attr('height', size.height)
    .attr('fill', '#dbdcd0');

    // bar
    svg.append('g')
      .selectAll('g')
      .data(series)
      .join('g')
      .attr('fill', s => color(s.key))
      .selectAll('rect')
      .data(s => s.map(p => ({ ...p, seriesKey: s.key })))
      .join('rect')
      .attr('x', d => x(d.data.category)!)
      .attr('y', d => y(d[1]))
      .attr('height', d => y(d[0]) - y(d[1]))
      .attr('width', x.bandwidth())
      .append('title')
      .text(d => `${d.data.category} ${d.seriesKey}: ${d[1] - d[0]}`);

// x
svg.append('g')
  .attr('transform', `translate(0, ${chartHeight + topMargin})`)
  .call(d3.axisBottom(x))
  .selectAll("text")
  .attr("font-size", `${Math.max(Math.min(x.bandwidth() * 0.6, w * 0.024), w * 0.008)}px`)
  .attr("text-anchor", "end")
  .attr("transform", function(d) {
    const rotate = x.bandwidth() < w * 0.04 ? -60 : -45;
    const shift = -0.8 * x.bandwidth();
    return `translate(${shift},0) rotate(${rotate})`;
  })
  .attr("dy", "0.35em");

    // y
    svg.append('g')
      .attr('transform', `translate(${leftMargin},0)`)
      .call(d3.axisLeft(y));

    // title
    svg.append('text')
      .attr('x', w / 2)
      .attr('y', topMargin / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', `${0.025 * w}px`)
      .style('font-weight', 'bold')
      .text('Top 1000 Swapped Books by Genre and Age Category');

    // x lable
    svg.append('text')
      .attr('x', margin.left + w / 2)
      .attr('y', chartHeight + topMargin + 0.25 * h)
      .attr('text-anchor', 'middle')
      .style('font-size', `${0.02 * w}`)
      .text('Genre');
    // y lable
    svg.append('text')
      .attr('transform', `translate(${leftMargin * 0.6}, ${topMargin + chartHeight / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .style('font-size', `${0.02 * w}`)
      .text('Counts');


    // legend
    const legend = svg.append('g')
      .attr('transform', `translate(${leftMargin}, ${topMargin * 0.7})`);

    stacks.forEach((stack, i) => {
      const g = legend.append('g')
        .attr('transform', `translate(${i * 0.08 * w},0)`);

      g.append('rect')
        .attr('width', 0.015 * w)
        .attr('height', 0.015 * w)
        .attr('fill', color(stack));

      g.append('text')
        .attr('x', 0.02 * w)
        .attr('y', 0.012 * w)
        .text(stack)
        .style('font-size', `${0.012 * w}px`);
    });
  }

  return (
    <div ref={barRef} style={{ width: '100%', height: '100%' }}>
      <svg id='bar-svg' width='100%' height='100%'></svg>
    </div>
  );
}
