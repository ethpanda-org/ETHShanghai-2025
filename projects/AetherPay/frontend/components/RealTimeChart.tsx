'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PriceData {
  timestamp: string;
  actualPrice: number;
  predictedPrice: number;
  accuracy: number;
}

export default function RealTimeChart() {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [currentAccuracy, setCurrentAccuracy] = useState(97.4);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 模拟实时数据（在实际项目中应该连接WebSocket）
  useEffect(() => {
    const generateMockData = () => {
      const now = new Date();
      const basePrice = 1.0001;
      const newPoint: PricePoint = {
        timestamp: now.toLocaleTimeString(),
        price: basePrice + (Math.random() - 0.5) * 0.0002,
        predicted: basePrice + (Math.random() - 0.5) * 0.0001,
        confidence: 0.85 + Math.random() * 0.1
      };

      setPriceData(prev => {
        const updated = [...prev, newPoint];
        // 保持最近30个数据点
        return updated.slice(-30);
      });
      setLastUpdate(now);
    };

    // 初始化数据
    for (let i = 0; i < 10; i++) {
      setTimeout(() => generateMockData(), i * 100);
    }

    // 每5秒更新一次
    const interval = setInterval(generateMockData, 5000);
    setIsConnected(true);

    return () => {
      clearInterval(interval);
      setIsConnected(false);
    };
  }, []);

  const chartData = {
    labels: priceData.map(point => point.timestamp),
    datasets: [
      {
        label: 'Actual Price',
        data: priceData.map(point => point.price),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
      },
      {
        label: 'AI Prediction',
        data: priceData.map(point => point.predicted || null),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'USDC/USDT Real-time Price & AI Prediction',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          afterBody: function(context: any) {
            const dataIndex = context[0].dataIndex;
            const confidence = priceData[dataIndex]?.confidence;
            return confidence ? `Confidence: ${(confidence * 100).toFixed(1)}%` : '';
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Price (USDT)'
        },
        beginAtZero: false,
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  const currentPrice = priceData[priceData.length - 1]?.price;
  const currentPrediction = priceData[priceData.length - 1]?.predicted;
  const currentConfidence = priceData[priceData.length - 1]?.confidence;
  const accuracy = priceData.length > 1 ? 
    priceData.slice(-10).reduce((acc, point, index, arr) => {
      if (index === 0 || !point.predicted) return acc;
      const actualChange = point.price - arr[index - 1].price;
      const predictedChange = point.predicted - (arr[index - 1].predicted || arr[index - 1].price);
      const error = Math.abs(actualChange - predictedChange);
      return acc + (1 - Math.min(error / 0.0001, 1));
    }, 0) / Math.max(priceData.slice(-10).length - 1, 1) : 0;

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          📈 Real-time Price Chart
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
        </h3>
        <div className="text-sm text-gray-600">
          {lastUpdate && `Last update: ${lastUpdate.toLocaleTimeString()}`}
        </div>
      </div>

      {/* 实时指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
          <div className="text-xs text-green-700 mb-1">Current Price</div>
          <div className="text-lg font-bold text-green-900">
            {currentPrice ? currentPrice.toFixed(6) : 'N/A'}
          </div>
        </div>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
          <div className="text-xs text-blue-700 mb-1">AI Prediction</div>
          <div className="text-lg font-bold text-blue-900">
            {currentPrediction ? currentPrediction.toFixed(6) : 'N/A'}
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-3 border border-purple-200">
          <div className="text-xs text-purple-700 mb-1">Confidence</div>
          <div className="text-lg font-bold text-purple-900">
            {currentConfidence ? `${(currentConfidence * 100).toFixed(1)}%` : 'N/A'}
          </div>
        </div>
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-3 border border-orange-200">
          <div className="text-xs text-orange-700 mb-1">Model Accuracy</div>
          <div className="text-lg font-bold text-orange-900">
            {(accuracy * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* 图表 */}
      <div className="h-80">
        <Line data={chartData} options={chartOptions} />
      </div>

      {/* 技术指标 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Data Points:</span>
            <span className="font-semibold text-gray-900">{priceData.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Update Frequency:</span>
            <span className="font-semibold text-gray-900">5s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Prediction Window:</span>
            <span className="font-semibold text-gray-900">30s</span>
          </div>
        </div>
      </div>
    </div>
  );
}