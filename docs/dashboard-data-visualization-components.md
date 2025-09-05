# Dashboard Data Visualization Components

## Executive Summary

This document defines the comprehensive data visualization strategy for the new dashboard system, building upon existing jsPDF/XLSX export patterns and establishing a robust chart library integration with KES currency formatting. The design emphasizes interactive, accessible, and mobile-responsive visualizations.

## Chart Library Integration Strategy

### 1. **Library Selection and Architecture**

#### Primary Chart Library: Chart.js
```typescript
// Chart.js integration with dashboard theming
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

// Dashboard chart configuration
export const DASHBOARD_CHART_CONFIG = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        usePointStyle: true,
        padding: 20,
        font: {
          family: 'Inter, sans-serif',
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      borderColor: '#3b82f6',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
      callbacks: {
        label: (context: any) => {
          const label = context.dataset.label || ''
          const value = formatKESValue(context.parsed.y)
          return `${label}: ${value}`
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        display: false
      },
      ticks: {
        font: {
          family: 'Inter, sans-serif',
          size: 11
        }
      }
    },
    y: {
      grid: {
        color: 'rgba(0, 0, 0, 0.1)'
      },
      ticks: {
        font: {
          family: 'Inter, sans-serif',
          size: 11
        },
        callback: (value: any) => formatKESValue(value)
      }
    }
  }
}
```

#### Alternative Library: Recharts (React-specific)
```typescript
// Recharts integration for React components
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

// Custom tooltip for KES formatting
export const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="dashboard-chart-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="tooltip-value" style={{ color: entry.color }}>
            {`${entry.name}: ${formatKESValue(entry.value)}`}
          </p>
        ))}
      </div>
    )
  }
  return null
}
```

### 2. **KES Currency Formatting System**

#### Enhanced Currency Formatter
```typescript
// Enhanced KES formatting for dashboard charts
export const formatKESValue = (
  value: number,
  options: {
    compact?: boolean
    precision?: number
    showSymbol?: boolean
  } = {}
): string => {
  const { compact = false, precision = 0, showSymbol = true } = options

  if (compact) {
    // Compact formatting for charts (e.g., 2.5M, 150K)
    if (value >= 1000000) {
      return `${showSymbol ? 'KES ' : ''}${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${showSymbol ? 'KES ' : ''}${(value / 1000).toFixed(1)}K`
    }
  }

  // Standard formatting
  return new Intl.NumberFormat('en-KE', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'KES',
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value)
}

// Percentage formatter
export const formatPercentageValue = (value: number, precision: number = 1): string => {
  return `${value.toFixed(precision)}%`
}

// Number formatter with K/M suffixes
export const formatNumberValue = (value: number, compact: boolean = false): string => {
  if (compact) {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
  }
  
  return new Intl.NumberFormat('en-KE').format(value)
}
```

## Chart Component Library

### 1. **Revenue Trend Charts**

#### Line Chart Component
```typescript
// Revenue trend line chart
export const RevenueTrendChart: React.FC<{
  data: RevenueData[]
  timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly'
  height?: number
}> = ({ data, timeframe, height = 300 }) => {
  const chartData = {
    labels: data.map(item => formatDateLabel(item.date, timeframe)),
    datasets: [
      {
        label: 'Revenue',
        data: data.map(item => item.revenue),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'Target',
        data: data.map(item => item.target),
        borderColor: '#10b981',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0
      }
    ]
  }

  const options = {
    ...DASHBOARD_CHART_CONFIG,
    plugins: {
      ...DASHBOARD_CHART_CONFIG.plugins,
      title: {
        display: true,
        text: `Revenue Trends - ${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}`,
        font: {
          size: 16,
          weight: 'bold'
        }
      }
    }
  }

  return (
    <div className="chart-container" style={{ height }}>
      <Line data={chartData} options={options} />
    </div>
  )
}
```

#### Area Chart Component
```typescript
// Revenue area chart with multiple series
export const RevenueAreaChart: React.FC<{
  data: RevenueBreakdownData[]
  categories: string[]
  height?: number
}> = ({ data, categories, height = 300 }) => {
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'
  ]

  return (
    <div className="chart-container" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => formatDateLabel(value, 'monthly')}
          />
          <YAxis 
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => formatKESValue(value, { compact: true })}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {categories.map((category, index) => (
            <Area
              key={category}
              type="monotone"
              dataKey={category}
              stackId="1"
              stroke={colors[index % colors.length]}
              fill={colors[index % colors.length]}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
```

### 4. **Mini Charts and Sparklines**

#### Enhanced Sparkline Component
```typescript
// Enhanced sparkline component building on existing Sparkline.tsx
export const DashboardSparkline: React.FC<{
  data: number[]
  trend: 'up' | 'down' | 'stable'
  width?: number
  height?: number
  showValue?: boolean
  currency?: boolean
}> = ({
  data,
  trend,
  width = 100,
  height = 30,
  showValue = false,
  currency = false
}) => {
  const trendColors = {
    up: '#10b981',
    down: '#ef4444',
    stable: '#6b7280'
  }

  const currentValue = data[data.length - 1]
  const previousValue = data[data.length - 2]
  const change = currentValue - previousValue
  const changePercent = ((change / previousValue) * 100).toFixed(1)

  return (
    <div className="dashboard-sparkline">
      <div className="sparkline-chart">
        <Sparkline
          data={data}
          width={width}
          height={height}
          stroke={trendColors[trend]}
          fill={`${trendColors[trend]}20`}
        />
      </div>
      {showValue && (
        <div className="sparkline-value">
          <span className="current-value">
            {currency ? formatKESValue(currentValue, { compact: true }) : currentValue}
          </span>
          <span className={`trend-indicator trend-${trend}`}>
            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} {changePercent}%
          </span>
        </div>
      )}
    </div>
  )
}
```

#### Metric Card with Chart
```typescript
// Metric card with integrated mini chart
export const MetricCardWithChart: React.FC<{
  title: string
  value: number
  unit?: string
  trend: 'up' | 'down' | 'stable'
  trendValue: number
  chartData: number[]
  currency?: boolean
  target?: number
}> = ({
  title,
  value,
  unit,
  trend,
  trendValue,
  chartData,
  currency = false,
  target
}) => {
  const trendIcon = {
    up: '↗️',
    down: '↘️',
    stable: '➡️'
  }

  const trendColor = {
    up: 'text-green-600',
    down: 'text-red-600',
    stable: 'text-gray-600'
  }

  const displayValue = currency
    ? formatKESValue(value, { compact: true })
    : formatNumberValue(value, true)

  return (
    <div className="metric-card-with-chart">
      <div className="metric-header">
        <h3 className="metric-title">{title}</h3>
        <div className="metric-actions">
          <button className="metric-refresh" aria-label="Refresh metric">
            ↻
          </button>
        </div>
      </div>

      <div className="metric-content">
        <div className="metric-value-section">
          <div className="metric-main-value">
            {displayValue}
            {unit && <span className="metric-unit">{unit}</span>}
          </div>

          <div className={`metric-trend ${trendColor[trend]}`}>
            <span className="trend-icon">{trendIcon[trend]}</span>
            <span className="trend-value">
              {trendValue > 0 ? '+' : ''}{trendValue}%
            </span>
            <span className="trend-label">vs last period</span>
          </div>
        </div>

        <div className="metric-chart-section">
          <DashboardSparkline
            data={chartData}
            trend={trend}
            width={120}
            height={40}
            currency={currency}
          />
        </div>
      </div>

      {target && (
        <div className="metric-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${Math.min((value / target) * 100, 100)}%` }}
            />
          </div>
          <div className="progress-label">
            {((value / target) * 100).toFixed(1)}% of target
          </div>
        </div>
      )}
    </div>
  )
}
```

## Interactive Features

### 1. **Chart Interaction Handlers**

#### Drill-down Functionality
```typescript
// Chart drill-down interaction system
export const useChartDrillDown = () => {
  const [drillDownStack, setDrillDownStack] = useState<DrillDownLevel[]>([])
  const [currentLevel, setCurrentLevel] = useState<DrillDownLevel>({
    type: 'overview',
    data: null,
    title: 'Overview'
  })

  const drillDown = (level: DrillDownLevel) => {
    setDrillDownStack(prev => [...prev, currentLevel])
    setCurrentLevel(level)
  }

  const drillUp = () => {
    if (drillDownStack.length > 0) {
      const previousLevel = drillDownStack[drillDownStack.length - 1]
      setDrillDownStack(prev => prev.slice(0, -1))
      setCurrentLevel(previousLevel)
    }
  }

  const resetToTop = () => {
    setDrillDownStack([])
    setCurrentLevel({
      type: 'overview',
      data: null,
      title: 'Overview'
    })
  }

  return {
    currentLevel,
    canDrillUp: drillDownStack.length > 0,
    drillDown,
    drillUp,
    resetToTop
  }
}

// Interactive chart component with drill-down
export const InteractiveRevenueChart: React.FC<{
  data: RevenueData[]
  onDrillDown?: (period: string, data: any) => void
}> = ({ data, onDrillDown }) => {
  const handleChartClick = (event: any, elements: any[]) => {
    if (elements.length > 0 && onDrillDown) {
      const elementIndex = elements[0].index
      const clickedData = data[elementIndex]
      onDrillDown(clickedData.period, clickedData)
    }
  }

  const options = {
    ...DASHBOARD_CHART_CONFIG,
    onClick: handleChartClick,
    plugins: {
      ...DASHBOARD_CHART_CONFIG.plugins,
      tooltip: {
        ...DASHBOARD_CHART_CONFIG.plugins.tooltip,
        callbacks: {
          ...DASHBOARD_CHART_CONFIG.plugins.tooltip.callbacks,
          footer: () => 'Click to drill down'
        }
      }
    }
  }

  return (
    <div className="interactive-chart">
      <Line data={data} options={options} />
    </div>
  )
}
```

### 2. **Real-time Chart Updates**

#### Live Data Integration
```typescript
// Real-time chart data management
export const useRealTimeChartData = <T>(
  initialData: T[],
  updateInterval: number = 30000
) => {
  const [data, setData] = useState<T[]>(initialData)
  const [isLive, setIsLive] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout>()

  const startLiveUpdates = useCallback(() => {
    setIsLive(true)
    intervalRef.current = setInterval(async () => {
      try {
        const newData = await fetchLatestChartData()
        setData(newData)
      } catch (error) {
        console.error('Failed to update chart data:', error)
      }
    }, updateInterval)
  }, [updateInterval])

  const stopLiveUpdates = useCallback(() => {
    setIsLive(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    data,
    isLive,
    startLiveUpdates,
    stopLiveUpdates,
    refreshData: () => setData(initialData)
  }
}

// Animated chart transitions
export const AnimatedChart: React.FC<{
  data: any
  type: 'line' | 'bar' | 'pie'
  animationDuration?: number
}> = ({ data, type, animationDuration = 1000 }) => {
  const chartOptions = {
    ...DASHBOARD_CHART_CONFIG,
    animation: {
      duration: animationDuration,
      easing: 'easeInOutQuart'
    },
    transitions: {
      active: {
        animation: {
          duration: 400
        }
      }
    }
  }

  const ChartComponent = {
    line: Line,
    bar: Bar,
    pie: Pie
  }[type]

  return <ChartComponent data={data} options={chartOptions} />
}
```

## Export Integration

### 1. **Chart Export Functionality**

#### Enhanced Export with Charts
```typescript
// Chart export utilities extending existing export-utils.ts
export const addChartToPDF = async (
  doc: jsPDF,
  chartRef: React.RefObject<HTMLCanvasElement>,
  title: string,
  startY: number,
  width: number = 170,
  height: number = 100
): Promise<number> => {
  if (!chartRef.current) {
    throw new Error('Chart reference not available')
  }

  // Add chart title
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 20, startY)

  // Convert chart to image and add to PDF
  const chartImage = chartRef.current.toDataURL('image/png', 1.0)
  doc.addImage(chartImage, 'PNG', 20, startY + 5, width, height)

  return startY + height + 15
}

// Dashboard PDF export with charts
export const exportDashboardToPDF = async (
  dashboardData: DashboardExportData,
  options: ExportOptions
): Promise<void> => {
  const { jsPDF } = await loadJsPDF()
  const doc = new jsPDF()

  let currentY = createPDFHeader(doc, options)

  // Add summary metrics
  const summaryCards = dashboardData.metrics.map(metric => ({
    title: metric.title,
    value: metric.currency ? formatKESValue(metric.value) : metric.value.toString(),
    change: `${metric.trend === 'up' ? '+' : ''}${metric.changePercent}%`
  }))

  currentY = addSummaryCardsToPDF(doc, summaryCards, currentY)

  // Add charts
  for (const chart of dashboardData.charts) {
    if (currentY > 250) {
      doc.addPage()
      currentY = 20
    }

    currentY = await addChartToPDF(
      doc,
      chart.ref,
      chart.title,
      currentY
    )
  }

  // Add data tables
  for (const table of dashboardData.tables) {
    if (currentY > 200) {
      doc.addPage()
      currentY = 20
    }

    currentY = addTableToPDF(doc, table, currentY)
  }

  savePDFFile(doc, options.filename)
}
```

### 2. **Excel Export with Chart Data**

#### Chart Data Export
```typescript
// Excel export with chart data
export const addChartDataToExcel = (
  workbook: XLSX.WorkBook,
  chartData: ChartExportData,
  sheetName: string
): void => {
  const worksheetData = [
    [chartData.title],
    [''],
    ['Period', ...chartData.series.map(s => s.name)],
    ...chartData.data.map(row => [
      row.label,
      ...chartData.series.map(series =>
        row.values[series.key] || 0
      )
    ])
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

  // Style the header
  if (worksheet['A1']) {
    worksheet['A1'].s = {
      font: { bold: true, size: 14 },
      alignment: { horizontal: 'center' }
    }
  }

  // Style column headers
  const headerRow = 3
  chartData.series.forEach((_, index) => {
    const cellRef = XLSX.utils.encode_cell({ r: headerRow - 1, c: index + 1 })
    if (worksheet[cellRef]) {
      worksheet[cellRef].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: '3B82F6' } }
      }
    }
  })

  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, // Period column
    ...chartData.series.map(() => ({ wch: 12 }))
  ]

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
}

// Complete dashboard Excel export
export const exportDashboardToExcel = async (
  dashboardData: DashboardExportData,
  options: ExportOptions
): Promise<void> => {
  const workbook = createExcelWorkbook(options)

  // Add summary dashboard
  addSummaryDashboardToExcel(workbook, dashboardData.summary, options)

  // Add chart data sheets
  dashboardData.chartData.forEach((chart, index) => {
    addChartDataToExcel(workbook, chart, `Chart_${index + 1}_${chart.title}`)
  })

  // Add raw data tables
  dashboardData.tables.forEach((table, index) => {
    addTableToExcel(workbook, table, `Data_${index + 1}`)
  })

  saveExcelFile(workbook, options.filename)
}
```

## Accessibility and Performance

### 1. **Chart Accessibility**

#### Screen Reader Support
```typescript
// Accessible chart wrapper
export const AccessibleChart: React.FC<{
  children: React.ReactNode
  title: string
  description: string
  data: any[]
  type: string
}> = ({ children, title, description, data, type }) => {
  const chartId = `chart-${Math.random().toString(36).substr(2, 9)}`

  // Generate text description of chart data
  const generateDataDescription = () => {
    if (type === 'line' || type === 'bar') {
      return data.map((point, index) =>
        `Point ${index + 1}: ${point.label} has value ${point.value}`
      ).join('. ')
    }
    return `Chart contains ${data.length} data points`
  }

  return (
    <div className="accessible-chart">
      <div
        role="img"
        aria-labelledby={`${chartId}-title`}
        aria-describedby={`${chartId}-desc`}
      >
        {children}
      </div>

      <div id={`${chartId}-title`} className="sr-only">
        {title}
      </div>

      <div id={`${chartId}-desc`} className="sr-only">
        {description}. {generateDataDescription()}
      </div>

      {/* Data table for screen readers */}
      <table className="sr-only" aria-label={`Data table for ${title}`}>
        <thead>
          <tr>
            <th>Category</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point, index) => (
            <tr key={index}>
              <td>{point.label}</td>
              <td>{point.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

### 2. **Performance Optimization**

#### Chart Performance Strategies
```typescript
// Chart performance optimization
export const useChartPerformance = () => {
  const [isVisible, setIsVisible] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)

  // Intersection observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (chartRef.current) {
      observer.observe(chartRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // Data sampling for large datasets
  const sampleData = useCallback((data: any[], maxPoints: number = 100) => {
    if (data.length <= maxPoints) return data

    const step = Math.ceil(data.length / maxPoints)
    return data.filter((_, index) => index % step === 0)
  }, [])

  // Debounced resize handler
  const debouncedResize = useCallback(
    debounce(() => {
      // Trigger chart resize
      window.dispatchEvent(new Event('resize'))
    }, 250),
    []
  )

  useEffect(() => {
    window.addEventListener('resize', debouncedResize)
    return () => window.removeEventListener('resize', debouncedResize)
  }, [debouncedResize])

  return {
    chartRef,
    isVisible,
    sampleData
  }
}

// Memoized chart component
export const MemoizedChart = memo<ChartProps>(({ data, type, options }) => {
  const { chartRef, isVisible, sampleData } = useChartPerformance()

  const optimizedData = useMemo(() => {
    return sampleData(data, 200) // Limit to 200 points for performance
  }, [data, sampleData])

  if (!isVisible) {
    return (
      <div ref={chartRef} className="chart-placeholder">
        <div className="chart-skeleton" />
      </div>
    )
  }

  return (
    <div ref={chartRef}>
      <Chart data={optimizedData} type={type} options={options} />
    </div>
  )
})
```

---

**Document Version**: 1.0
**Last Updated**: December 2024
**Review Date**: January 2025

### 2. **Property Performance Charts**

#### Bar Chart Component
```typescript
// Property performance bar chart
export const PropertyPerformanceChart: React.FC<{
  data: PropertyPerformanceData[]
  metric: 'revenue' | 'occupancy' | 'roi'
  height?: number
}> = ({ data, metric, height = 300 }) => {
  const getMetricConfig = () => {
    switch (metric) {
      case 'revenue':
        return {
          label: 'Revenue (KES)',
          color: '#3b82f6',
          formatter: (value: number) => formatKESValue(value, { compact: true })
        }
      case 'occupancy':
        return {
          label: 'Occupancy Rate (%)',
          color: '#10b981',
          formatter: (value: number) => formatPercentageValue(value)
        }
      case 'roi':
        return {
          label: 'ROI (%)',
          color: '#f59e0b',
          formatter: (value: number) => formatPercentageValue(value)
        }
    }
  }

  const config = getMetricConfig()
  
  const chartData = {
    labels: data.map(item => item.propertyName),
    datasets: [{
      label: config.label,
      data: data.map(item => item[metric]),
      backgroundColor: config.color,
      borderColor: config.color,
      borderWidth: 1,
      borderRadius: 4,
      borderSkipped: false
    }]
  }

  const options = {
    ...DASHBOARD_CHART_CONFIG,
    indexAxis: 'y' as const,
    plugins: {
      ...DASHBOARD_CHART_CONFIG.plugins,
      tooltip: {
        ...DASHBOARD_CHART_CONFIG.plugins.tooltip,
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${config.formatter(context.parsed.x)}`
          }
        }
      }
    },
    scales: {
      x: {
        ...DASHBOARD_CHART_CONFIG.scales.y,
        ticks: {
          ...DASHBOARD_CHART_CONFIG.scales.y.ticks,
          callback: (value: any) => config.formatter(value)
        }
      },
      y: {
        ...DASHBOARD_CHART_CONFIG.scales.x
      }
    }
  }

  return (
    <div className="chart-container" style={{ height }}>
      <Bar data={chartData} options={options} />
    </div>
  )
}
```

### 3. **Occupancy and Distribution Charts**

#### Pie Chart Component
```typescript
// Property type distribution pie chart
export const PropertyDistributionChart: React.FC<{
  data: DistributionData[]
  title?: string
  height?: number
}> = ({ data, title = 'Property Distribution', height = 300 }) => {
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'
  ]

  const chartData = {
    labels: data.map(item => item.label),
    datasets: [{
      data: data.map(item => item.value),
      backgroundColor: colors.slice(0, data.length),
      borderColor: '#ffffff',
      borderWidth: 2,
      hoverBorderWidth: 3
    }]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            family: 'Inter, sans-serif',
            size: 12
          },
          generateLabels: (chart: any) => {
            const data = chart.data
            return data.labels.map((label: string, index: number) => ({
              text: `${label} (${data.datasets[0].data[index]})`,
              fillStyle: data.datasets[0].backgroundColor[index],
              strokeStyle: data.datasets[0].backgroundColor[index],
              pointStyle: 'circle'
            }))
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#3b82f6',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
            const percentage = ((context.parsed / total) * 100).toFixed(1)
            return `${context.label}: ${context.parsed} (${percentage}%)`
          }
        }
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold'
        }
      }
    }
  }

  return (
    <div className="chart-container" style={{ height }}>
      <Pie data={chartData} options={options} />
    </div>
  )
}
```

#### Doughnut Chart Component
```typescript
// Occupancy status doughnut chart
export const OccupancyStatusChart: React.FC<{
  occupied: number
  vacant: number
  maintenance: number
  height?: number
}> = ({ occupied, vacant, maintenance, height = 250 }) => {
  const total = occupied + vacant + maintenance
  
  const chartData = {
    labels: ['Occupied', 'Vacant', 'Maintenance'],
    datasets: [{
      data: [occupied, vacant, maintenance],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
      borderColor: '#ffffff',
      borderWidth: 3,
      cutout: '60%'
    }]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            family: 'Inter, sans-serif',
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#3b82f6',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const percentage = ((context.parsed / total) * 100).toFixed(1)
            return `${context.label}: ${context.parsed} units (${percentage}%)`
          }
        }
      }
    }
  }

  return (
    <div className="chart-container" style={{ height }}>
      <div className="relative">
        <Doughnut data={chartData} options={options} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{total}</div>
            <div className="text-sm text-gray-600">Total Units</div>
          </div>
        </div>
      </div>
    </div>
  )
}
```
