import { useRef, useEffect } from 'react';
import * as d3 from 'd3';

export default function NetworkGraphD3({ data, onNodeClick, selectedNode }) {
  const svgRef = useRef();
  const containerRef = useRef();

  useEffect(() => {
    if (!data || !data.nodes || !data.links) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 600;

    // 清除之前的SVG
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // 创建力导向模拟
    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => d.type === 'payer' ? 50 : 30));

    // 创建连线
    const link = svg.append('g')
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.value / 1000));

    // 创建节点组
    const node = svg.append('g')
      .selectAll('g')
      .data(data.nodes)
      .join('g')
      .call(drag(simulation))
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d);
      });

    // 添加圆圈
    node.append('circle')
      .attr('r', d => d.type === 'payer' ? 40 : (20 + (d.amount / 10000) * 15))
      .attr('fill', d => {
        if (d.type === 'payer') return '#3B82F6';
        switch (d.status) {
          case 'active': return '#10B981';
          case 'paused': return '#F59E0B';
          case 'completed': return '#6B7280';
          default: return '#60A5FA';
        }
      })
      .attr('stroke', d => selectedNode?.id === d.id ? '#fff' : 'none')
      .attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .style('filter', d => d.type === 'payer' ? 'drop-shadow(0 4px 8px rgba(59, 130, 246, 0.3))' : 'none');

    // 添加文本标签
    node.append('text')
      .text(d => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.type === 'payer' ? 50 : 35)
      .attr('font-size', d => d.type === 'payer' ? '14px' : '12px')
      .attr('fill', '#666')
      .attr('font-weight', d => d.type === 'payer' ? 'bold' : 'normal');

    // 添加金额标签（仅收款人节点）
    node.filter(d => d.type !== 'payer')
      .append('text')
      .text(d => `$${(d.amount / 1000).toFixed(1)}k`)
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .attr('font-size', '10px')
      .attr('fill', '#fff')
      .attr('font-weight', 'bold');

    // 更新位置
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // 拖拽功能
    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    }

    // 清理函数
    return () => {
      simulation.stop();
    };
  }, [data, selectedNode, onNodeClick]);

  return (
    <div ref={containerRef} className="w-full h-[600px] bg-gray-50 dark:bg-gray-900 rounded-lg">
      <svg ref={svgRef} className="w-full h-full"></svg>
    </div>
  );
}

