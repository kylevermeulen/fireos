import { useMemo, useRef, useEffect, useState } from 'react';
import { sankey, sankeyLinkHorizontal, SankeyNode, SankeyLink } from 'd3-sankey';
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
  link: 'hsl(var(--muted-foreground) / 0.2)',
  linkHover: 'hsl(var(--primary) / 0.4)',
};

const NODE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--primary) / 0.8)',
  'hsl(var(--primary) / 0.6)',
  'hsl(var(--muted-foreground) / 0.5)',
  'hsl(var(--muted-foreground) / 0.4)',
  'hsl(var(--muted-foreground) / 0.3)',
];

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
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: Math.max(width, 300), height: 400 });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const { nodes, links, nodePositions, linkPaths } = useMemo(() => {
    const spendingData = drilldownCategory ? (spendingByL2 || []) : spendingByL1;
    
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
    
    // Create sankey generator
    const sankeyGenerator = sankey<SankeyNodeData, SankeyLinkData>()
      .nodeWidth(20)
      .nodePadding(12)
      .extent([[40, 20], [dimensions.width - 40, dimensions.height - 20]]);
    
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
    } catch (e) {
      return { nodes: [], links: [], nodePositions: [], linkPaths: [] };
    }
  }, [incomeByCategory, spendingByL1, spendingByL2, drilldownCategory, totalIncome, dimensions]);

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
        <div className="flex items-center justify-between">
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
      <CardContent>
        <div ref={containerRef} className="w-full">
          <svg width={dimensions.width} height={dimensions.height}>
            {/* Links */}
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
                    opacity={isHovered ? 0.8 : 0.5}
                    style={{ transition: 'all 0.2s ease' }}
                  />
                );
              })}
            </g>
            
            {/* Nodes */}
            <g>
              {nodePositions.map((node: any, i) => {
                const isIncome = node.type === 'income';
                const isHovered = hoveredNode === node.name;
                const colorIndex = Math.min(i % NODE_COLORS.length, NODE_COLORS.length - 1);
                
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
                    <rect
                      x={node.x0}
                      y={node.y0}
                      width={(node.x1 || 0) - (node.x0 || 0)}
                      height={Math.max((node.y1 || 0) - (node.y0 || 0), 1)}
                      fill={isIncome ? COLORS.income : NODE_COLORS[colorIndex]}
                      rx={2}
                      opacity={isHovered ? 1 : 0.9}
                      style={{ transition: 'opacity 0.2s ease' }}
                    />
                    <text
                      x={isIncome ? (node.x0 || 0) - 6 : (node.x1 || 0) + 6}
                      y={((node.y0 || 0) + (node.y1 || 0)) / 2}
                      textAnchor={isIncome ? 'end' : 'start'}
                      dominantBaseline="middle"
                      className="text-[11px] fill-foreground"
                      fontWeight={isHovered ? 600 : 400}
                    >
                      {node.name.length > 20 ? node.name.slice(0, 18) + '…' : node.name}
                    </text>
                    {isHovered && (
                      <text
                        x={isIncome ? (node.x0 || 0) - 6 : (node.x1 || 0) + 6}
                        y={((node.y0 || 0) + (node.y1 || 0)) / 2 + 14}
                        textAnchor={isIncome ? 'end' : 'start'}
                        dominantBaseline="middle"
                        className="text-[10px] fill-muted-foreground"
                      >
                        {formatCompactCurrency(node.value || 0)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
        
        {!drilldownCategory && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Click a spending category to drill down
          </p>
        )}
      </CardContent>
    </Card>
  );
}
