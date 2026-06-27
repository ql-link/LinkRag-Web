import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Minus, Plus } from 'lucide-react';
import { GraphNode, GraphLink } from '../types';
import { useTheme } from '@/contexts/ThemeContext';

const INITIAL_NODES: GraphNode[] = [
  { id: '1', label: '大模型', group: 'tech', value: 30 },
  { id: '2', label: '自然语言处理', group: 'field', value: 20 },
  { id: '3', label: '核心技术', group: 'tech', value: 15 },
  { id: '4', label: '应用场景', group: 'app', value: 15 },
  { id: '5', label: '评估方法', group: 'eval', value: 15 },
  { id: '6', label: '文本生成', group: 'field', value: 10 },
  { id: '7', label: '对话系统', group: 'field', value: 10 },
  { id: '8', label: '智能客服', group: 'app', value: 10 },
];

const INITIAL_LINKS: GraphLink[] = [
  { source: '1', target: '2' },
  { source: '1', target: '3' },
  { source: '1', target: '4' },
  { source: '1', target: '5' },
  { source: '2', target: '6' },
  { source: '2', target: '7' },
  { source: '4', target: '8' },
];

export const KnowledgeGraph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { darkMode } = useTheme();

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 400;
    const height = 300;
    const styles = getComputedStyle(document.documentElement);
    const ink = styles.getPropertyValue('--color-ink').trim() || '#141413';
    const canvas = styles.getPropertyValue('--color-canvas').trim() || '#faf9f5';
    const card = styles.getPropertyValue('--color-bg-card-solid').trim() || '#ffffff';
    const border = styles.getPropertyValue('--color-border-subtle').trim() || '#e6dfd8';

    const svg = d3.select(svgRef.current).attr('viewBox', [0, 0, width, height]);

    svg.selectAll('*').remove();

    const simulation = d3
      .forceSimulation<GraphNode>(INITIAL_NODES)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(INITIAL_LINKS)
          .id((d) => d.id)
          .distance(60),
      )
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg
      .append('g')
      .selectAll('line')
      .data(INITIAL_LINKS)
      .join('line')
      .attr('stroke', ink)
      .attr('stroke-opacity', darkMode ? 0.18 : 0.1)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2');

    const node = svg
      .append('g')
      .selectAll('g')
      .data(INITIAL_NODES)
      .join('g')
      .call(d3.drag<SVGGElement, GraphNode>().on('start', dragstarted).on('drag', dragged).on('end', dragended));

    node
      .append('rect')
      .attr('width', (d) => d.label.length * 8 + 12)
      .attr('height', 20)
      .attr('x', (d) => -(d.label.length * 8 + 12) / 2)
      .attr('y', -10)
      .attr('rx', 10)
      .attr('ry', 10)
      .attr('fill', (d) => (d.group === 'tech' ? ink : darkMode ? card : canvas))
      .attr('stroke', border)
      .attr('stroke-width', 1)
      .attr('class', 'cursor-pointer hover:fill-primary transition-colors');

    node
      .append('text')
      .attr('dy', 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', '8px')
      .attr('font-weight', 'bold')
      .attr(
        'font-family',
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      )
      .attr('fill', (d) => (d.group === 'tech' ? canvas : ink))
      .text((d) => d.label.toUpperCase());

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => getNodePosition(d.source, 'x'))
        .attr('y1', (d) => getNodePosition(d.source, 'y'))
        .attr('x2', (d) => getNodePosition(d.target, 'x'))
        .attr('y2', (d) => getNodePosition(d.target, 'y'));

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    function getNodePosition(node: string | GraphNode, axis: 'x' | 'y') {
      return typeof node === 'string' ? 0 : (node[axis] ?? 0);
    }

    function dragstarted(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [darkMode]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-bg-base/30 art-border">
      <div className="min-h-0 flex-1">
        <svg ref={svgRef} className="h-full w-full" />
      </div>

      <div className="absolute right-4 top-4 flex flex-col gap-2">
        <button className="flex h-8 w-8 items-center justify-center bg-bg-card-solid art-border transition-all hover:bg-text-main hover:text-bg-base">
          <Plus size={14} />
        </button>
        <button className="flex h-8 w-8 items-center justify-center bg-bg-card-solid art-border transition-all hover:bg-text-main hover:text-bg-base">
          <Minus size={14} />
        </button>
      </div>

      <div className="absolute bottom-4 left-4 flex gap-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-text-main" />
          <span className="mono-label italic">Core Node</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 border border-text-main" />
          <span className="mono-label italic">Entity</span>
        </div>
      </div>
    </div>
  );
};
