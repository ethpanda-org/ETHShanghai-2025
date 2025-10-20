import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

export default function PaymentNetworkGraph({ suppliers }) {
  const svgRef = useRef(null)
  const width = 800
  const height = 600

  useEffect(() => {
    if (!svgRef.current || !suppliers || suppliers.length === 0) return

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
    const container = svg.append('g')

    // Create nodes
    const mainNode = {
      id: 'main',
      name: 'Main Wallet',
      x: width / 2,
      y: height / 2,
      radius: 40,
      type: 'main'
    }

    const supplierNodes = suppliers.map((supplier, index) => {
      const angle = (index / suppliers.length) * 2 * Math.PI
      const distance = 200
      return {
        id: supplier.id,
        name: supplier.name,
        amount: supplier.amount,
        x: width / 2 + Math.cos(angle) * distance,
        y: height / 2 + Math.sin(angle) * distance,
        radius: 20 + (supplier.percentage / 100) * 15,
        type: 'supplier',
        ...supplier
      }
    })

    const nodes = [mainNode, ...supplierNodes]

    // Create links
    const links = supplierNodes.map(node => ({
      source: mainNode,
      target: node,
      value: node.percentage
    }))

    // Add zoom
    const zoom = d3.zoom()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        container.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Draw links
    const link = container.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', d => 1 + d.value / 10)
      .attr('stroke-opacity', 0.6)

    // Draw nodes
    const node = container.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('cursor', 'pointer')

    // Node circles
    node.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => d.type === 'main' ? '#10b981' : '#3b82f6')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('opacity', 0.9)

    // Node labels
    node.append('text')
      .text(d => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.radius + 20)
      .attr('fill', '#1f2937')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .style('pointer-events', 'none')

    // Amount labels for suppliers
    node.filter(d => d.type === 'supplier')
      .append('text')
      .text(d => d.amount)
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.radius + 35)
      .attr('fill', '#10b981')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .style('pointer-events', 'none')

    // Hover effects
    node.on('mouseenter', function(event, d) {
      if (d.type === 'supplier') {
        d3.select(this).select('circle')
          .transition()
          .duration(200)
          .attr('r', d.radius * 1.2)
          .attr('opacity', 1)
      }
    })

    node.on('mouseleave', function(event, d) {
      d3.select(this).select('circle')
        .transition()
        .duration(200)
        .attr('r', d.radius)
        .attr('opacity', 0.9)
    })

    // Initial zoom to fit
    svg.call(zoom.transform, d3.zoomIdentity.translate(0, 0).scale(1))

  }, [suppliers])

  return (
    <div className="relative w-full bg-gray-50 rounded-lg overflow-hidden" style={{ height: '600px' }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full h-full"
      />
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded px-3 py-2 text-xs text-gray-600 border border-gray-200">
        🖱️ 拖拽缩放 | 👆 悬停查看详情
      </div>
    </div>
  )
}

