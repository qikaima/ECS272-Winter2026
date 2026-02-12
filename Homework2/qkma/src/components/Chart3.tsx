import React, { useEffect, useRef, useState } from 'react';  
import * as d3 from 'd3';
import {
  sankey as d3Sankey,
  sankeyLinkHorizontal,
  SankeyNode,
  SankeyLink,
} from 'd3-sankey';
import { classifyGenre } from '../classify';

interface MyNode {
  name: string;
  layer: number; 
}

interface MyLink {
  source: string;
  target: string;
  value: number;
}

export default function SankeyChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [nodeData, setNodeData] = useState<MyNode[]>([]);
  const [linkData, setLinkData] = useState<MyLink[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const margin = { top: 0.2, right: 0.05, bottom: 0.05, left: 0.05 };
  const layerNames = ['Supergenre', 'Age Category', 'Movie Adaptation', 'Bestseller Status'];
  const lightBlue = '#aeddff';

  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.contentRect) {
          setSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });

    if (containerRef.current) resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const rawData = await d3.csv('../../data/top_1000_most_swapped_books.csv');
      if (!rawData || rawData.length === 0) return;

      const nodeMap = new Map<string, MyNode>();
      const linkMap = new Map<string, number>();

      const addNode = (name: string, layer: number) => {
        if (!nodeMap.has(name)) nodeMap.set(name, { name, layer });
      };

      const addLink = (source: string, target: string) => {
        const key = `${source}|||${target}`;
        linkMap.set(key, (linkMap.get(key) ?? 0) + 1);
      };

      rawData.forEach(d => {
        const supergenre = classifyGenre(d.genre ?? 'Other');
        const age = d.age_category as string;
        if (!age || age === 'Unknown') return;

        const isBestseller = String(d.bestseller_status).toLowerCase() === 'true';
        const isMovie = String(d.adapted_to_movie).toLowerCase() === 'true';

        const bestsellerStatus = isBestseller ? 'Bestseller' : 'Not Bestseller';
        const movieStatus = isMovie ? 'Adapted To Movie' : 'Not Adapted To Movie';
        addNode(supergenre, 0);
        addNode(age, 1);
        addNode(movieStatus, 2);
        addNode(bestsellerStatus, 3);

        addLink(supergenre, age);
        addLink(age, movieStatus);
        addLink(movieStatus, bestsellerStatus);
      });

      setNodeData(Array.from(nodeMap.values()));
      setLinkData(
        Array.from(linkMap.entries()).map(([key, value]) => {
          const [source, target] = key.split('|||');
          return { source, target, value };
        })
      );
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!nodeData.length || !linkData.length) return;
    if (!size.width || !size.height) return;

    const svg = d3.select(svgRef.current!);
    svg.selectAll('*').remove();

    const widthInner = size.width * (1 - margin.left - margin.right);
    const heightInner = size.height * (1 - margin.top - margin.bottom);

    const sankey = d3Sankey<MyNode, MyLink>()
      .nodeId(d => d.name)
      .nodeAlign(d => d.layer)
      .nodeWidth(20) 
      .nodePadding(12)
      .extent([[0, 0], [widthInner, heightInner]]);

    const { nodes, links }: {
      nodes: SankeyNode<MyNode, MyLink>[];
      links: SankeyLink<SankeyNode<MyNode, MyLink>, MyLink>[];
    } = sankey({
      nodes: nodeData.map(d => ({ ...d })),
      links: linkData.map(d => ({ ...d })),
    });

    const g = svg
      .append('g')
      .attr('transform', `translate(${size.width * margin.left}, ${size.height * margin.top})`);

    // title
    svg.append('text')
      .attr('x', size.width / 2)
      .attr('y', size.height * margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', `${Math.max(16, 0.01 * size.width)}px`)
      .style('font-weight', 'bold')
      .text('Top 1000 Swaped Book Sankey Diagram by Supergenre');

    // links
    g.append('g')
      .attr('fill', 'none')
      .attr('stroke-opacity', 0.4)
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', '#adae9e')
      .attr('stroke-width', d => Math.max(1, d.width ?? 1));

    // nodes
    const nodeG = g
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    nodeG.append('rect')
      .attr('width', d => d.x1! - d.x0!)
      .attr('height', d => d.y1! - d.y0!)
      .attr('fill', '#adae9e') 
      .attr('stroke', '#666')
      .attr('stroke-width', '0.5px');

    nodeG.append('text')
      .attr('x', d => (d.x1! - d.x0!) / 2)
      .attr('y', d => (d.y1! - d.y0!) / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', `${Math.max(10, 0.009 * size.width)}px`)
      .style('pointer-events', 'none')
      .style('fill', '#333')
      .text(d => d.name);

    // column labels
    layerNames.forEach((layerName, i) => {
      const xPos = d3.mean(nodes.filter(n => n.layer === i), n => n.x0!) ?? 0;
      g.append('text')
        .attr('x', xPos)
        .attr('y', -15)
        .attr('text-anchor', 'middle')
        .style('font-size', `${Math.max(12, 0.008 * size.width)}px`)
        .style('font-weight', '600')
        .style('fill', '#555')
        .text(layerName);
    });

  }, [nodeData, linkData, size]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', boxSizing: 'border-box', background: '#dbdcd0' }}
    >
      <svg ref={svgRef} width="100%" height="100%" />
    </div>
  );
}