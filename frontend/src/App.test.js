import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import App from './App';

// Mock axios to prevent actual API calls during tests
jest.mock('axios');

describe('App Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    axios.get.mockClear();

    // Mock API responses
    axios.get.mockImplementation((url) => {
      if (url === 'http://localhost:8000/stocks') {
        return Promise.resolve({
          data: [
            { StockCode: 'AAA', StockName: 'Stock A' },
            { StockCode: 'BBB', StockName: 'Stock B' },
          ],
        });
      } else if (url === 'http://localhost:8000/stocks/AAA/history') {
        return Promise.resolve({
          data: [
            { TradingDate: '2023-01-01', OpenPrice: 100, ClosePrice: 105, HighestPrice: 110, LowestPrice: 98, TotalVol: 10000 },
            { TradingDate: '2023-01-02', OpenPrice: 105, ClosePrice: 103, HighestPrice: 108, LowestPrice: 102, TotalVol: 12000 },
          ],
        });
      } else if (url === 'http://localhost:8000/stocks/AAA/indicators') {
        return Promise.resolve({
          data: {
            SMA_50: 100.50,
            SMA_200: 90.25,
            EMA_12: 102.10,
            EMA_26: 95.60,
            RSI: 60.00,
            MACD: 2.50,
            MACD_Signal: 2.00,
          },
        });
      } else if (url === 'http://localhost:8000/stocks/AAA/forecast') {
        return Promise.resolve({
          data: [
            { TradingDate: '2023-01-03', ForecastedClosePrice: 104 },
            { TradingDate: '2023-01-04', ForecastedClosePrice: 106 },
          ],
        });
      }
      return Promise.reject(new Error('not found'));
    });
  });

  test('renders main heading', () => {
    render(<App />);
    expect(screen.getByText(/Stock Analysis Application/i)).toBeInTheDocument();
  });

  test('renders stock selection dropdown', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Select a stock.../i)).toBeInTheDocument();
    });
  });

  test('displays error message if stocks fail to load', async () => {
    axios.get.mockImplementation((url) => {
      if (url === 'http://localhost:8000/stocks') {
        return Promise.reject(new Error('Network Error'));
      }
      return Promise.reject(new Error('not found'));
    });

    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Error fetching stocks:/i)).toBeInTheDocument();
    });
  });

  test('displays historical data and indicators after selecting a stock', async () => {
    render(<App />);

    // Wait for stocks to load and select one
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Select a stock.../i)).toBeInTheDocument();
    });

    const select = screen.getByPlaceholderText(/Select a stock.../i);
    userEvent.click(select);
    await waitFor(() => {
      userEvent.click(screen.getByText(/AAA - Stock A/i));
    });

    // Check for historical data table
    await waitFor(() => {
      expect(screen.getByText(/Raw Historical Data/i)).toBeInTheDocument();
      expect(screen.getByText('2023-01-01')).toBeInTheDocument();
      expect(screen.getByText('105')).toBeInTheDocument(); // ClosePrice for 2023-01-01
    });

    // Check for indicators section
    await waitFor(() => {
      expect(screen.getByText(/Technical Indicators/i)).toBeInTheDocument();
      expect(screen.getByText(/SMA 50: 100.50/i)).toBeInTheDocument();
      expect(screen.getByText(/RSI: 60.00/i)).toBeInTheDocument();
    });

    // Check for forecast data
    await waitFor(() => {
      expect(screen.getByText(/Historical Data & Forecast/i)).toBeInTheDocument();
      // Chart.js renders on canvas, so we can't directly check text content for forecast values
      // We can check if the chart element is present
      expect(screen.getByRole('img', { name: /Stock Price for AAA - Stock A/i })).toBeInTheDocument();
    });
  });
});