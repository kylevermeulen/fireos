import { useMemo, useRef, useEffect, useState } from 'react';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { formatCompactCurrency } from '@/lib/format';
import { CategoryTotal } from '@/types/cashflow';

interface SankeyNodeData {
  name: string;
  type: 'income' | 'L1' | 'L2';
}

interface SankeyLinkData {
  source: number;
  target: number;
  value: number;
}

interface SankeyDiagramProps {
  incomeByCategory: CategoryTotal[];
  spendingByL1: CategoryTotal[];
  spendingByL2?: CategoryTotal[];
  totalIncome: number;
  totalSpending: number;
  onDrillDown?: (l1Category: string) => void;
  drilldownCategory?: string | null;
  onBack?: () => void;
}

// Color palette - minimal with primary accent
const COLORS = {
  income: 'hsl(var(--success))',
  spending: 'hsl(var(--primary))',
  link: 'hsl(var(--muted-foreground) / 0.15)',
  linkHover: 'hsl(var(--primary) / 0.3)',
};

const NODE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--primary) / 0.8)',
  'hsl(var(--primary) / 0.6)',
  'hsl(var(--muted-foreground) / 0.5)',
  'hsl(var(--muted-foreground) / 0.4)',
  'hsl(var(--muted-foreground) / 0.3)',
];

// Calculate dynamic height based on number of categories
function calculateHeight(incomeCount: number, spendingCount: number): number {
  const maxCategories = Math.max(incomeCount, spendingCount);
  // Minimum 40px per category, plus padding
  const minHeight = 500;
  const perCategoryHeight = 45;
  return Math.max(minHeight, maxCategories * perCategoryHeight + 60);
}

export function SankeyDiagram({
  incomeByCategory,
  spendingByL1,
  spendingByL2,
  totalIncome,
  totalSpending,
  onDrillDown,
  drilldownCategory,
  onBack,
}: SankeyDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const spendingData = drilldownCategory ? (spendingByL2 || []) : spendingByL1;
  
  // Dynamic height based on category count
  const chartHeight = useMemo(() => 
    calculateHeight(incomeByCategory.length, spendingData.length),
    [incomeByCategory.length, spendingData.length]
  );

  // Wide margins for labels - labels go outside the chart area
  const labelMarginLeft = 180;
  const labelMarginRight = 200;

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setContainerWidth(Math.max(width, 400));
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const { nodes, links, nodePositions, linkPaths } = useMemo(() => {
    // Build nodes
    const nodesData: SankeyNodeData[] = [];
    const nodeIndexMap = new Map<string, number>();
    
    const addNode = (name: string, type: 'income' | 'L1' | 'L2'): number => {
      const key = `${type}:${name}`;
      if (nodeIndexMap.has(key)) {
        return nodeIndexMap.get(key)!;
      }
      const index = nodesData.length;
      nodesData.push({ name, type });
      nodeIndexMap.set(key, index);
      return index;
    };
    
    // Build links
    const linksData: SankeyLinkData[] = [];
    
    // Add income nodes and link to spending categories
    incomeByCategory.forEach(income => {
      const incomeIdx = addNode(income.category, 'income');
      
      spendingData.forEach(spend => {
        const spendIdx = addNode(spend.category, drilldownCategory ? 'L2' : 'L1');
        
        // Proportional flow based on income share
        const incomeShare = totalIncome > 0 ? income.total / totalIncome : 0;
        const flowValue = spend.total * incomeShare;
        
        if (flowValue > 0.01) {
          linksData.push({
            source: incomeIdx,
            target: spendIdx,
            value: flowValue,
          });
        }
      });
    });
    
    if (nodesData.length === 0 || linksData.length === 0) {
      return { nodes: [], links: [], nodePositions: [], linkPaths: [] };
    }
    
    // Create sankey generator with narrow center for links
    // Nodes positioned closer to edges, leaving minimal space in middle
    const sankeyGenerator = sankey<SankeyNodeData, SankeyLinkData>()
      .nodeWidth(12)
      .nodePadding(8)
      .extent([
        [labelMarginLeft, 30], 
        [containerWidth - labelMarginRight, chartHeight - 30]
      ]);
    
    try {
      const graph = sankeyGenerator({
        nodes: nodesData.map(d => ({ ...d })),
        links: linksData.map(d => ({ ...d })),
      });
      
      return {
        nodes: graph.nodes,
        links: graph.links,
        nodePositions: graph.nodes,
        linkPaths: graph.links.map(link => sankeyLinkHorizontal()(link as any)),
      };
    } catch {
      return { nodes: [], links: [], nodePositions: [], linkPaths: [] };
    }
  }, [incomeByCategory, spendingData, drilldownCategory, totalIncome, containerWidth, chartHeight, labelMarginLeft, labelMarginRight]);

  if (nodes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Cash Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No data to display for the selected filters.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {drilldownCategory && onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <CardTitle className="text-base font-medium">
              {drilldownCategory ? (
                <span className="flex items-center gap-1">
                  <span className="text-muted-foreground">All Categories</span>
                  <span className="text-muted-foreground">/</span>
                  <span>{drilldownCategory}</span>
                </span>
              ) : (
                'Income → Spending Categories'
              )}
            </CardTitle>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-muted-foreground">
              Income: <span className="font-medium text-foreground">{formatCompactCurrency(totalIncome)}</span>
            </span>
            <span className="text-muted-foreground">
              Spending: <span className="font-medium text-foreground">{formatCompactCurrency(totalSpending)}</span>
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div ref={containerRef} className="w-full min-w-[600px]">
          <svg width={containerWidth} height={chartHeight}>
            {/* Links - rendered first so nodes appear on top */}
            <g>
              {linkPaths.map((path, i) => {
                const link = links[i] as any;
                const sourceNode = link.source as any;
                const targetNode = link.target as any;
                const isHovered = hoveredNode === sourceNode?.name || hoveredNode === targetNode?.name;
                
                return (
                  <path
                    key={i}
                    d={path || ''}
                    fill="none"
                    stroke={isHovered ? COLORS.linkHover : COLORS.link}
                    strokeWidth={Math.max((link as any).width || 1, 1)}
                    opacity={isHovered ? 0.7 : 0.4}
                    style={{ transition: 'all 0.2s ease' }}
                  />
                );
              })}
            </g>
            
            {/* Nodes with labels */}
            <g>
              {nodePositions.map((node: any, i) => {
                const isIncome = node.type === 'income';
                const isHovered = hoveredNode === node.name;
                const colorIndex = Math.min(i % NODE_COLORS.length, NODE_COLORS.length - 1);
                const nodeHeight = Math.max((node.y1 || 0) - (node.y0 || 0), 4);
                
                return (
                  <g 
                    key={i}
                    onMouseEnter={() => setHoveredNode(node.name)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => {
                      if (node.type === 'L1' && onDrillDown && !drilldownCategory) {
                        onDrillDown(node.name);
                      }
                    }}
                    style={{ cursor: node.type === 'L1' && !drilldownCategory ? 'pointer' : 'default' }}
                  >
                    {/* Node bar */}
                    <rect
                      x={node.x0}
                      y={node.y0}
                      width={(node.x1 || 0) - (node.x0 || 0)}
                      height={nodeHeight}
                      fill={isIncome ? COLORS.income : NODE_COLORS[colorIndex]}
                      rx={2}
                      opacity={isHovered ? 1 : 0.85}
                      style={{ transition: 'opacity 0.2s ease' }}
                    />
                    
                    {/* Category name - full text, positioned outside chart */}
                    <text
                      x={isIncome ? (node.x0 || 0) - 8 : (node.x1 || 0) + 8}
                      y={(node.y0 || 0) + nodeHeight / 2}
                      textAnchor={isIncome ? 'end' : 'start'}
                      dominantBaseline="middle"
                      className="text-[12px] sm:text-[13px] fill-foreground"
                      fontWeight={isHovered ? 600 : 400}
                    >
                      {node.name}
                    </text>
                    
                    {/* Amount - shown below category name */}
                    <text
                      x={isIncome ? (node.x0 || 0) - 8 : (node.x1 || 0) + 8}
                      y={(node.y0 || 0) + nodeHeight / 2 + 14}
                      textAnchor={isIncome ? 'end' : 'start'}
                      dominantBaseline="middle"
                      className="text-[11px] fill-muted-foreground"
                    >
                      {formatCompactCurrency(node.value || 0)}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
        
        {!drilldownCategory && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Click a spending category to drill down
          </p>
        )}
      </CardContent>
    </Card>
  );
}
