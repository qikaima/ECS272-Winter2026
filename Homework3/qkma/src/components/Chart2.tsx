import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { isEmpty } from 'lodash';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { classifyGenre } from '../classify';

interface Props { selectedSupergenre: string | null; }

export default function Chart2({ selectedSupergenre }: Props) {
  const [data, setData] = useState<any[]>([]);
  const heatmapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onResize = useDebounceCallback((s) => setSize(s), 200);
  useResizeObserver({ ref: heatmapRef as React.RefObject<HTMLDivElement>, onResize });

  useEffect(() => {
    const loadData = async () => {
      const rawData = await d3.csv('../../data/top_1000_most_swapped_books.csv');
      const rolled = d3.rollups(rawData, v => v.length, d => d.genre || 'Other', d => Math.floor(+d.publicationYear! / 10) * 10);
      const formatted: any[] = [];
      rolled.forEach(([genre, decades]) => {
        decades.forEach(([decade, count]) => {
          if (decade) formatted.push({ genre, supergenre: classifyGenre(genre), subgenre: genre, decade, count });
        });
      });
      setData(formatted);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isEmpty(data) || size.width === 0 || size.height === 0) return;
    const svg = d3.select(heatmapRef.current).select<SVGSVGElement>('#heatmap-svg');
    svg.selectAll('*').remove(); 

    const { width: w, height: h } = size;

    const leftM = Math.max(0.18 * w, 130);
    const topM = Math.max(0.2 * h, 80); 
    const bottomM = Math.max(0.35 * h, 180);
    const chartBottom = h - bottomM;
    const rightM = 0.04 * w;

    const filtered = selectedSupergenre ? data.filter(d => d.supergenre === selectedSupergenre) : data;
    let displayData: any[] = [];
    if (!selectedSupergenre) {
      const summary = d3.rollups(filtered, v => d3.sum(v, d => d.count), d => d.supergenre, d => d.decade);
      summary.forEach(([sup, decs]) => decs.forEach(([dec, count]) => displayData.push({ supergenre: sup, decade: dec, count })));
    } else {
      displayData = filtered.map(d => ({ ...d, supergenre: d.subgenre }));
    }

    const yValues = Array.from(new Set(displayData.map(d => d.supergenre))).sort();
    const xValues = Array.from(new Set(data.map(d => String(d.decade)))).sort((a,b) => +a - +b);

    const x = d3.scaleBand().domain(xValues).range([leftM, w - rightM]).padding(0.06);
    const y = d3.scaleBand<string>().domain(yValues).range([topM, chartBottom]).padding(0.06);
    
    const maxCount = d3.max(displayData, d => d.count) || 1;
    const color = d3.scaleSequential(d3.interpolateBlues).domain([0, maxCount]);

    const maxInDecade = new Map();
    d3.groups(displayData, d => d.decade).forEach(([decade, values]) => {
      const maxObj = values.reduce((prev, current) => (prev.count > current.count) ? prev : current);
      maxInDecade.set(`${decade}-${maxObj.supergenre}`, true);
    });

    const strokeWidth = 0.0025 * w;
    const sortedData = [...displayData].sort((a, b) => (maxInDecade.has(`${a.decade}-${a.supergenre}`) ? 1 : 0) - (maxInDecade.has(`${b.decade}-${b.supergenre}`) ? 1 : 0));

    svg.append('rect').attr('class', 'bg').attr('width', w).attr('height', h).attr('fill', '#dbdcd0');


    const g = svg.append('g').attr('class', 'cells');
    g.selectAll('rect')
      .data(sortedData, (d: any) => `${d.supergenre}-${d.decade}`)
      .join('rect')
      .attr('x', d => x(String(d.decade))!)
      .attr('y', d => y(d.supergenre)!)
      .attr('width', x.bandwidth())
      .attr('height', y.bandwidth())
      .attr('fill', d => color(d.count))
      .style('shape-rendering', 'crispEdges')
      .attr('stroke', d => maxInDecade.has(`${d.decade}-${d.supergenre}`) ? '#000' : 'none')
      .attr('stroke-width', d => maxInDecade.has(`${d.decade}-${d.supergenre}`) ? strokeWidth : 0);

    svg.append('g').attr('class', 'x-axis')
      .attr('transform', `translate(0,${chartBottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", `${Math.max(w * 0.008, 10)}px`);

    svg.append('g').attr('class', 'y-axis')
      .attr('transform', `translate(${leftM},0)`)
      .call(d3.axisLeft(y))
      .selectAll("text")
      .style("font-size", `${Math.max(w * 0.008, 10)}px`);

    // title
    svg.append('text').attr('class', 'title')
      .attr('x', w / 2).attr('y', topM * 0.45).attr('text-anchor', 'middle')
      .style('font-size', `${0.025 * w}px`).style('font-weight', 'bold')
      .text(selectedSupergenre ? `Trends in ${selectedSupergenre}` : 'Trends in Top 1000 Swaped Book by Supergenres Over Decades');


    // x lable
    svg.append('text').attr('class', 'x-label')
      .attr('x', leftM + (w - leftM - rightM) / 2)
      .attr('y', h - bottomM * 0.65)
      .attr('text-anchor', 'middle')
      .style('font-size', `${Math.max(w * 0.015, 12)}px`)
      .text('Publication Decade');

    // y lable
    svg.append('text').attr('class', 'y-label')
      .attr('transform', `translate(${leftM * 0.3}, ${topM + (chartBottom - topM) / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .style('font-size', `${Math.max(w * 0.015, 12)}px`)
      .text(selectedSupergenre ? 'Subgenres' : 'Supergenres');

    // legend
    const legendWidth = 0.3 * w;
    const legendHeight = 0.015 * h;
    const legendY = h - bottomM + 0.2 * h;

    const legendScale = d3.scaleLinear().domain([0, maxCount]).range([0, legendWidth]);
    const colorLegend = svg.append('g').attr('transform', `translate(${w/2 - legendWidth - 0.05*w}, ${legendY + 0.04*h})`);
    
    const legendStops = d3.range(0, maxCount + 1, Math.max(1, Math.floor(maxCount/10)));
    colorLegend.selectAll('rect').data(legendStops).join('rect')
      .attr('x', d => legendScale(d)).attr('width', legendWidth / legendStops.length).attr('height', legendHeight).attr('fill', d => color(d)).style('shape-rendering', 'crispEdges');
    colorLegend.append('text').attr('x', 0).attr('y', -0.01*h).style('font-size', `${0.013*w}px`).text('Low');
    colorLegend.append('text').attr('x', legendWidth).attr('y', -0.01*h).style('font-size', `${0.013*w}px`).attr('text-anchor', 'end').text('High');

    const outlineLegend = svg.append('g').attr('transform', `translate(${w/2 + 0.05*w}, ${legendY + 0.04*h})`);
    const boxSize = 0.018 * w;
    outlineLegend.append('rect').attr('width', boxSize).attr('height', boxSize).attr('fill', 'none').attr('stroke', '#000').attr('stroke-width', strokeWidth).style('shape-rendering', 'crispEdges');
    outlineLegend.append('text').attr('x', boxSize + 0.01*w).attr('y', boxSize * 0.8).style('font-size', `${0.013*w}px`).text('Most dominant genre in each decade');

  }, [data, size, selectedSupergenre]);

  return <div ref={heatmapRef} style={{ width: '100%', height: '100%' }}><svg id="heatmap-svg" width="100%" height="100%" /></div>;
}