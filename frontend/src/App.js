import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function App() {
  const [stocks, setStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [forecastData, setForecastData] = useState([]);
  const [indicators, setIndicators] = useState(null);
  const [selectedForecastPeriod, setSelectedForecastPeriod] = useState({ value: 'month', label: '1 Month' });

  const forecastPeriodOptions = [
    { value: 'week', label: '1 Week' },
    { value: 'month', label: '1 Month' },
    { value: 'year', label: '1 Year' },
  ];

  useEffect(() => {
    // Fetch list of all stocks
    axios.get('http://localhost:8000/stocks')
      .then(response => {
        const stockOptions = response.data.map(stock => ({
          value: stock.StockCode,
          label: `${stock.StockCode} - ${stock.StockName}`
        }));
        setStocks(stockOptions);
      })
      .catch(error => {
        console.error('Error fetching stocks:', error);
      });
  }, []);

  useEffect(() => {
    if (selectedStock) {
      // Fetch historical data
      axios.get(`http://localhost:8000/stocks/${selectedStock.value}/history`)
        .then(response => {
          setHistoricalData(response.data);
        })
        .catch(error => {
          console.error('Error fetching historical data:', error);
        });

      // Fetch indicators
      axios.get(`http://localhost:8000/stocks/${selectedStock.value}/indicators`)
        .then(response => {
          setIndicators(response.data);
        })
        .catch(error => {
          console.error('Error fetching indicators:', error);
        });
    }
  }, [selectedStock]);

  useEffect(() => {
    if (selectedStock && selectedForecastPeriod) {
      // Fetch forecast data with selected period
      axios.get(`http://localhost:8000/stocks/${selectedStock.value}/forecast?period=${selectedForecastPeriod.value}`)
        .then(response => {
          setForecastData(response.data);
        })
        .catch(error => {
          console.error('Error fetching forecast data:', error);
        });
    }
  }, [selectedStock, selectedForecastPeriod]);

  const allDates = [...new Set([...historicalData.map(data => data.TradingDate), ...forecastData.map(data => data.TradingDate)])].sort();

  const chartData = {
    labels: allDates,
    datasets: [
      {
        label: 'Close Price',
        data: allDates.map(date => {
          const historical = historicalData.find(data => data.TradingDate === date);
          return historical ? historical.ClosePrice : null;
        }),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
        fill: false,
      },
      {
        label: 'Forecasted Close Price',
        data: allDates.map(date => {
          const forecast = forecastData.find(data => data.TradingDate === date);
          return forecast ? forecast.ForecastedClosePrice : null;
        }),
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1,
        fill: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Stock Price for ${selectedStock ? selectedStock.label : ''} with ${selectedForecastPeriod.label} Forecast`,
      },
    },
    scales: {
      x: {
        type: 'category',
        labels: allDates,
      },
    },
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Stock Analysis Application</h1>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <Select
            options={stocks}
            onChange={setSelectedStock}
            placeholder="Select a stock..."
            isClearable
            isSearchable
          />
        </div>
        <div style={{ flex: 1 }}>
          <Select
            options={forecastPeriodOptions}
            onChange={setSelectedForecastPeriod}
            value={selectedForecastPeriod}
            placeholder="Select forecast period..."
          />
        </div>
      </div>

      {selectedStock && (
        <div>
          <h2>Historical Data & Forecast</h2>
          <Line data={chartData} options={chartOptions} />

          <h2>Technical Indicators</h2>
          {indicators ? (
            <div>
              <p>SMA 50: {indicators.SMA_50?.toFixed(2)}</p>
              <p>SMA 200: {indicators.SMA_200?.toFixed(2)}</p>
              <p>EMA 12: {indicators.EMA_12?.toFixed(2)}</p>
              <p>EMA 26: {indicators.EMA_26?.toFixed(2)}</p>
              <p>RSI: {indicators.RSI?.toFixed(2)}</p>
              <p>MACD: {indicators.MACD?.toFixed(2)}</p>
              <p>MACD Signal: {indicators.MACD_Signal?.toFixed(2)}</p>
            </div>
          ) : (
            <p>Loading indicators...</p>
          )}

          <h2>Raw Historical Data</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Trading Date</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Open Price</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Close Price</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Highest Price</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Lowest Price</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Total Volume</th>
              </tr>
            </thead>
            <tbody>
              {historicalData.map((data, index) => (
                <tr key={index}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{data.TradingDate}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{data.OpenPrice}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{data.ClosePrice}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{data.HighestPrice}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{data.LowestPrice}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{data.TotalVol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;