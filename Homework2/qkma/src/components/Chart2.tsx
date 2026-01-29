import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { isEmpty } from 'lodash';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';

interface HeatmapData {
  genre: string;
  decade: number;
  count: number;
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

export default function GenreDecadeHeatmap() {
  const [data, setData] = useState<HeatmapData[]>([]);
  const heatmapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });

  const margin: Margin = { top: 0.2, right: 0.04, bottom: 0.32, left: 0.14 };

  const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
  useResizeObserver({ ref: heatmapRef as React.RefObject<HTMLDivElement>, onResize });

  useEffect(() => {
    const loadData = async () => {
      try {
        const rawData = await d3.csv('../../data/top_1000_most_swapped_books.csv');

        const topGenres = Array.from(
          d3.rollup(rawData, v => v.length, d => d.genre).entries()
        )
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(d => d[0]);

        const grouped = d3.rollups(
          rawData,
          v => v.length,
          d => (topGenres.includes(d.genre!) ? d.genre! : 'Other'),
          d => Math.floor(+d.publicationYear! / 10) * 10
        );

        const heatmapData: HeatmapData[] = [];
        grouped.forEach(([genre, decades]) => {
          decades.forEach(([decade, count]) => {
            heatmapData.push({ genre, decade, count });
          });
        });

        setData(heatmapData);
      } catch (error) {
        console.error('Error loading CSV:', error);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (isEmpty(data) || size.width === 0 || size.height === 0) return;
    d3.select('#heatmap-svg').selectAll('*').remove();
    drawChart();
  }, [data, size]);

  function drawChart() {
    const svg = d3.select('#heatmap-svg');
    const w = size.width;
    const h = size.height;

    const leftMargin = margin.left * w;
    const rightMargin = margin.right * w;
    const topMargin = margin.top * h;
    const bottomMargin = margin.bottom * h;

    const genreCounts = d3.rollup(
      data,
      v => d3.sum(v, d => d.count),
      d => d.genre
    );

    const genres = Array.from(genreCounts.entries())
      .filter(([g]) => g !== 'Other')
      .sort((a, b) => b[1] - a[1])
      .map(d => d[0])
      .concat(genreCounts.has('Other') ? ['Other'] : []);

    const decades = Array.from(new Set(data.map(d => d.decade))).sort((a, b) => a - b);

    const x = d3.scaleBand()
      .domain(decades.map(String))
      .range([leftMargin, w - rightMargin])
      .padding(0.05);

    const y = d3.scaleBand()
      .domain(genres)
      .range([topMargin, h - bottomMargin])
      .padding(0.05);

    const maxCount = d3.max(data, d => d.count) || 1;
    const color = d3.scaleSequential(d3.interpolateBlues)
      .domain([0, maxCount]);
    const maxByDecade = d3.rollup(
      data.filter(d => d.genre !== 'Other'),
      v => d3.max(v, d => d.count)!,
      d => d.decade
    );

    // background
    svg.append('rect')
      .attr('width', w)
      .attr('height', h)
      .attr('fill', '#f5f5f5');

    // heatmap cells
    svg.append('g')
      .selectAll('rect')
      .data(data)
      .join('rect')
      .attr('x', d => x(String(d.decade))!)
      .attr('y', d => y(d.genre)!)
      .attr('width', x.bandwidth())
      .attr('height', y.bandwidth())
      .attr('fill', d => color(d.count))
      .attr('stroke', d =>
        d.genre !== 'Other' && d.count === maxByDecade.get(d.decade)
          ? '#000'
          : '#ccc'
      )
      .attr('stroke-width', d =>
        d.genre !== 'Other' && d.count === maxByDecade.get(d.decade)
          ? 2.5
          : 1
      );

    // x
    svg.append('g')
      .attr('transform', `translate(0,${h - bottomMargin})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    // y
    svg.append('g')
      .attr('transform', `translate(${leftMargin},0)`)
      .call(d3.axisLeft(y));

    // x label
    svg.append('text')
      .attr('x', leftMargin + (w - leftMargin - rightMargin) / 2)
      .attr('y', h - bottomMargin + bottomMargin*0.5)
      .attr('text-anchor', 'middle')
      .style('font-size', `${0.018 * w}px`)
      .text('Publication Decade');

    // y label
    svg.append('text')
      .attr(
        'transform',
        `translate(${leftMargin - leftMargin*0.8}, ${topMargin + (h - topMargin - bottomMargin) / 2}) rotate(-90)`
      )
      .attr('text-anchor', 'middle')
      .style('font-size', `${0.018 * w}px`)
      .text('Counts of Genre');

    // title
    svg.append('text')
      .attr('x', w / 2)
      .attr('y', topMargin / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', `${0.025 * w}px`)
      .style('font-weight', 'bold')
      .text('Trends in Top 20 Genres of Top 1000 Swapped Book Publications');

    // color lengend
    const legendWidth = 0.3 * w;
    const legendHeight = 0.015 * h;
    const legendY = h - bottomMargin + 0.2 * h;

    const legendScale = d3.scaleLinear().domain([0, maxCount]).range([0, legendWidth]);
    const legend = svg.append('g')
      .attr('transform', `translate(${w/2 - legendWidth - 0.05*w}, ${legendY+0.04*h})`);

    const legendStops = d3.range(0, maxCount + 1, Math.max(1, Math.floor(maxCount/10)));
    legend.selectAll('rect')
      .data(legendStops)
      .join('rect')
      .attr('x', d => legendScale(d))
      .attr('width', legendWidth / legendStops.length)
      .attr('height', legendHeight)
      .attr('fill', d => color(d));

    legend.append('text')
      .attr('x', 0)
      .attr('y', -0.01*h)
      .style('font-size', `${0.013*w}px`)
      .text('Low');

    legend.append('text')
      .attr('x', legendWidth)
      .attr('y', -0.01*h)
      .style('font-size', `${0.013*w}px`)
      .attr('text-anchor', 'end')
      .text('High');

    const outlineLegend = svg.append('g')
      .attr('transform', `translate(${w/2 + 0.05*w}, ${legendY})`);
    const boxSize = 0.018*w;

    outlineLegend.append('rect')
      .attr('width', boxSize)
      .attr('height', boxSize)
      .attr('fill', 'none')
      .attr('stroke', '#000')
      .attr('stroke-width', 0.006*w);

    outlineLegend.append('text')
      .attr('x', boxSize + 0.01*w)
      .attr('y', boxSize*0.8)
      .style('font-size', `${0.013*w}px`)
      .text('Most dominant Top-20 genre in each decade');
  }

  return (
    <div ref={heatmapRef} style={{ width: '100%', height: '100%' }}>
      <svg id="heatmap-svg" width="100%" height="100%" />
    </div>
  );
}
