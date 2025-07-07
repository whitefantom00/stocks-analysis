from fastapi import FastAPI
from google.cloud import bigquery
import os

app = FastAPI()

# Initialize BigQuery client
# Ensure your GOOGLE_APPLICATION_CREDENTIALS environment variable is set
# or provide credentials directly.
# For local development, you might use a service account key file:
# os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "path/to/your/keyfile.json"
def get_bigquery_client():
    return bigquery.Client()

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/stocks")
def get_all_stocks():
    query = """
        SELECT DISTINCT StockCode, StockName
        FROM `vu-kim.vietstock_ingestion.daily_stocks`
        ORDER BY StockCode
    """
    query_job = get_bigquery_client().query(query)
    results = query_job.result()

    stocks = []
    for row in results:
        stocks.append(dict(row))
    return stocks

@app.get("/stocks/{ticker}/history")
def get_stock_history(ticker: str):
    query = f"""
        SELECT
            TradingDate,
            OpenPrice,
            ClosePrice,
            HighestPrice,
            LowestPrice,
            TotalVol
        FROM
            `vu-kim.vietstock_ingestion.daily_stocks`
        WHERE
            StockCode = '{ticker}'
        ORDER BY
            TradingDate ASC
    """
    query_job = get_bigquery_client().query(query)
    results = query_job.result()

    data = []
    for row in results:
        data.append(dict(row))
    return data

from ta.volatility import BollingerBands
from ta.momentum import RSIIndicator, StochasticOscillator
from ta.trend import MACD, SMAIndicator, EMAIndicator
import pandas as pd

@app.get("/stocks/{ticker}/indicators")
def get_stock_indicators(ticker: str):
    query = f"""
        SELECT
            TradingDate,
            OpenPrice,
            ClosePrice,
            HighestPrice,
            LowestPrice,
            TotalVol
        FROM
            `vu-kim.vietstock_ingestion.daily_stocks`
        WHERE
            StockCode = '{ticker}'
        ORDER BY
            TradingDate ASC
    """
    query_job = get_bigquery_client().query(query)
    results = query_job.result()

    df = pd.DataFrame([dict(row) for row in results])
    
    if df.empty:
        return {"message": f"No data found for {ticker}"}

    # Ensure numeric types
    df['OpenPrice'] = pd.to_numeric(df['OpenPrice'])
    df['ClosePrice'] = pd.to_numeric(df['ClosePrice'])
    df['HighestPrice'] = pd.to_numeric(df['HighestPrice'])
    df['LowestPrice'] = pd.to_numeric(df['LowestPrice'])
    df['TotalVol'] = pd.to_numeric(df['TotalVol'])

    # Calculate SMA
    df['SMA_50'] = SMAIndicator(close=df['ClosePrice'], window=50).sma_indicator()
    df['SMA_200'] = SMAIndicator(close=df['ClosePrice'], window=200).sma_indicator()

    # Calculate EMA
    df['EMA_12'] = EMAIndicator(close=df['ClosePrice'], window=12).ema_indicator()
    df['EMA_26'] = EMAIndicator(close=df['ClosePrice'], window=26).ema_indicator()

    # Calculate RSI
    df['RSI'] = RSIIndicator(close=df['ClosePrice'], window=14).rsi()

    # Calculate MACD
    macd = MACD(close=df['ClosePrice'])
    df['MACD'] = macd.macd()
    df['MACD_Signal'] = macd.macd_signal()

    # Select relevant columns for output
    indicators = df[['TradingDate', 'ClosePrice', 'SMA_50', 'SMA_200', 'EMA_12', 'EMA_26', 'RSI', 'MACD', 'MACD_Signal']].tail(1).to_dict(orient='records')
    
    return indicators[0] if indicators else {}


from statsmodels.tsa.arima.model import ARIMA
import numpy as np

@app.get("/stocks/{ticker}/forecast")
def get_stock_forecast(ticker: str):
    query = f"""
        SELECT
            TradingDate,
            ClosePrice
        FROM
            `vu-kim.vietstock_ingestion.daily_stocks`
        WHERE
            StockCode = '{ticker}'
        ORDER BY
            TradingDate ASC
    """
    query_job = get_bigquery_client().query(query)
    results = query_job.result()

    df = pd.DataFrame([dict(row) for row in results])

    if df.empty:
        return {"message": f"No data found for {ticker}"}

    df['TradingDate'] = pd.to_datetime(df['TradingDate'])
    df.set_index('TradingDate', inplace=True)
    df['ClosePrice'] = pd.to_numeric(df['ClosePrice'])

    # Fit ARIMA model
    # (p,d,q) order can be optimized, using a common starting point for demonstration
    try:
        model = ARIMA(df['ClosePrice'], order=(5,1,0))
        model_fit = model.fit()

        # Forecast next 30 days
        forecast_steps = 30
        forecast = model_fit.predict(start=len(df), end=len(df) + forecast_steps - 1)

        forecast_dates = pd.date_range(start=df.index[-1] + pd.Timedelta(days=1), periods=forecast_steps, freq='D')

        forecast_data = []
        for i, date in enumerate(forecast_dates):
            forecast_data.append({"TradingDate": date.strftime("%Y-%m-%d"), "ForecastedClosePrice": forecast.iloc[i]})

        return forecast_data
    except Exception as e:
        return {"error": str(e), "message": "Could not generate forecast. Data might be insufficient or model parameters need adjustment."}