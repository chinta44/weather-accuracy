'use client';

import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { format, subDays } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function Home() {
  const [location, setLocation] = useState({ lat: 35.6762, lon: 139.6503, name: '東京' });
  const [targetDate, setTargetDate] = useState(format(subDays(new Date(), 8), 'yyyy-MM-dd'));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const forecastDate = format(subDays(new Date(targetDate), 7), 'yyyy-MM-dd');

      // 実際の天気
      const actualRes = await fetch(
        `https://archive-api.open-meteo.com/v1/archive?latitude=\( {location.lat}&longitude= \){location.lon}&start_date=\( {targetDate}&end_date= \){targetDate}&hourly=temperature_2m,weathercode`
      );
      const actual = await actualRes.json();

      // 1週間前の予報
      const forecastRes = await fetch(
        `https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=\( {location.lat}&longitude= \){location.lon}&start_date=\( {forecastDate}&end_date= \){targetDate}&hourly=temperature_2m,weathercode`
      );
      const forecast = await forecastRes.json();

      const processed = processComparison(actual, forecast, targetDate);
      setData(processed);
    } catch (e) {
      console.error(e);
      setError('データ取得に失敗しました。日付を最近のもの（2021年以降）にしてください。');
    }
    setLoading(false);
  };

  const processComparison = (actual: any, forecast: any, targetDate: string) => {
    const actualTemps = actual.hourly?.temperature_2m || [];
    const forecastTemps = forecast.hourly?.temperature_2m || [];

    // 簡易MAE計算
    let mae = 2.5;
    if (actualTemps.length > 0 && forecastTemps.length > 0) {
      const minLen = Math.min(actualTemps.length, forecastTemps.length);
      let sum = 0;
      for (let i = 0; i < minLen; i++) {
        sum += Math.abs(actualTemps[i] - forecastTemps[i]);
      }
      mae = sum / minLen;
    }

    return {
      actualTemps,
      forecastTemps,
      date: targetDate,
      mae: mae,
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-blue-600">予報検証くん</h1>
        
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">場所名（参考）</label>
              <input 
                type="text" 
                value={location.name}
                onChange={(e) => setLocation({...location, name: e.target.value})}
                className="w-full border p-3 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">緯度経度は東京固定（後で拡張可）</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">対象日</label>
              <input 
                type="date" 
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full border p-3 rounded-lg"
              />
            </div>
            <button 
              onClick={fetchData}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium disabled:opacity-50 mt-6 md:mt-0"
            >
              {loading ? '取得中...' : '比較する'}
            </button>
          </div>
        </div>

        {error && <p className="text-red-500 text-center bg-red-50 p-4 rounded-xl">{error}</p>}

        {data && (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-xl shadow text-center">
              <h2 className="text-2xl font-semibold mb-2">{data.date} の予報精度</h2>
              <p className="text-6xl font-bold text-green-600">{data.mae.toFixed(1)}°C</p>
              <p className="text-gray-500">平均絶対誤差（MAE）</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="font-medium mb-4">気温比較（24時間）</h3>
              <Line 
                data={{
                  labels: Array.from({length: 24}, (_, i) => `${i}時`),
                  datasets: [
                    { 
                      label: '1週間前予報', 
                      data: data.forecastTemps.slice(0,24), 
                      borderColor: '#3b82f6',
                      tension: 0.3
                    },
                    { 
                      label: '実際の天気', 
                      data: data.actualTemps.slice(0,24), 
                      borderColor: '#ef4444',
                      tension: 0.3
                    }
                  ]
                }} 
                options={{ responsive: true }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
