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
      const forecastDate = format(subDays(new Date(targetDate), 7), 'yyyy-MM-dd'); // 1週間前

      // 実際の天気 (Historical)
      const actualRes = await fetch(
        `https://archive-api.open-meteo.com/v1/archive?latitude=\( {location.lat}&longitude= \){location.lon}&start_date=\( {targetDate}&end_date= \){targetDate}&hourly=temperature_2m,weathercode`
      );
      const actual = await actualRes.json();

      // 1週間前の予報 (Historical Forecast)
      const forecastRes = await fetch(
        `https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=\( {location.lat}&longitude= \){location.lon}&start_date=\( {forecastDate}&end_date= \){targetDate}&hourly=temperature_2m,weathercode`
      );
      const forecast = await forecastRes.json();

      // 簡易処理（時間帯を揃えて比較）
      const processed = processComparison(actual, forecast, targetDate);
      setData(processed);
    } catch (e) {
      setError('データ取得に失敗しました。日付を最近のものにしてください。');
    }
    setLoading(false);
  };

  const processComparison = (actual: any, forecast: any, targetDate: string) => {
    // 簡易実装: 日中（6-18時）の平均など
    // ここに詳細ロジック（実際のコードではもっと丁寧に）
    return {
      actualTemps: actual.hourly?.temperature_2m || [],
      forecastTemps: forecast.hourly?.temperature_2m || [],
      date: targetDate,
      mae: 2.5, // 仮計算例
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-blue-600">予報検証くん</h1>
        
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label>場所</label>
              <input 
                type="text" 
                value={location.name}
                onChange={(e) => setLocation({...location, name: e.target.value})}
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label>対象日 (YYYY-MM-DD)</label>
              <input 
                type="date" 
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full border p-2 rounded"
              />
            </div>
            <button 
              onClick={fetchData}
              disabled={loading}
              className="bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '取得中...' : '比較する'}
            </button>
          </div>
        </div>

        {error && <p className="text-red-500 text-center">{error}</p>}

        {data && (
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="text-2xl font-semibold mb-4">{data.date} の予報精度</h2>
              <p className="text-5xl font-bold text-green-600">{data.mae.toFixed(1)}°C MAE</p>
              <p className="text-gray-500">平均絶対誤差（小さいほど正確）</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="font-medium mb-4">気温比較（予報 vs 実際）</h3>
              <Line data={{
                labels: Array.from({length: 24}, (_, i) => `${i}時`),
                datasets: [
                  { label: '1週間前予報', data: data.forecastTemps.slice(0,24), borderColor: '#3b82f6' },
                  { label: '実際の天気', data: data.actualTemps.slice(0,24), borderColor: '#ef4444' }
                ]
              }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}