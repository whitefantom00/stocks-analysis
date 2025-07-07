import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import pandas as pd

# This fixture will patch main.get_bigquery_client before the app is imported
@pytest.fixture(scope="module")
def mock_bigquery_client_module():
    with patch('main.get_bigquery_client') as mock_get_client:
        mock_bigquery_client_instance = MagicMock()
        mock_get_client.return_value = mock_bigquery_client_instance
        yield mock_bigquery_client_instance

# This fixture will create the TestClient after the mock is active
@pytest.fixture(scope="module")
def test_app(mock_bigquery_client_module):
    # Import app here to ensure the mock is active when app is loaded
    from main import app
    with TestClient(app) as client:
        yield client

def test_read_root(test_app):
    response = test_app.get("/")
    assert response.status_code == 200
    assert response.json() == {"Hello": "World"}

def test_get_all_stocks(test_app, mock_bigquery_client_module):
    mock_query_job = MagicMock()
    mock_bigquery_client_module.query.return_value = mock_query_job
    mock_query_job.result.return_value = [
        {"StockCode": "AAA", "StockName": "Stock A"},
        {"StockCode": "BBB", "StockName": "Stock B"}
    ]

    response = test_app.get("/stocks")
    assert response.status_code == 200
    assert response.json() == [
        {"StockCode": "AAA", "StockName": "Stock A"},
        {"StockCode": "BBB", "StockName": "Stock B"}
    ]

def test_get_stock_history(test_app, mock_bigquery_client_module):
    mock_query_job = MagicMock()
    mock_bigquery_client_module.query.return_value = mock_query_job
    mock_query_job.result.return_value = [
        {"TradingDate": "2023-01-01", "OpenPrice": 100, "ClosePrice": 105, "HighestPrice": 110, "LowestPrice": 98, "TotalVol": 10000},
        {"TradingDate": "2023-01-02", "OpenPrice": 105, "ClosePrice": 103, "HighestPrice": 108, "LowestPrice": 102, "TotalVol": 12000}
    ]

    response = test_app.get("/stocks/TEST/history")
    assert response.status_code == 200
    assert response.json() == [
        {"TradingDate": "2023-01-01", "OpenPrice": 100, "ClosePrice": 105, "HighestPrice": 110, "LowestPrice": 98, "TotalVol": 10000},
        {"TradingDate": "2023-01-02", "OpenPrice": 105, "ClosePrice": 103, "HighestPrice": 108, "LowestPrice": 102, "TotalVol": 12000}
    ]

def test_get_stock_indicators(test_app, mock_bigquery_client_module):
    mock_query_job = MagicMock()
    mock_bigquery_client_module.query.return_value = mock_query_job
    # Generate enough mock data for SMA_200 calculation
    mock_data = []
    for i in range(250):
        mock_data.append({
            "TradingDate": (pd.to_datetime("2023-01-01") + pd.Timedelta(days=i)).strftime("%Y-%m-%d"),
            "OpenPrice": 100 + i,
            "ClosePrice": 101 + i,
            "HighestPrice": 102 + i,
            "LowestPrice": 99 + i,
            "TotalVol": 10000 + i * 100
        })
    mock_query_job.result.return_value = mock_data

    response = test_app.get("/stocks/TEST/indicators")
    assert response.status_code == 200
    json_response = response.json()
    assert "SMA_50" in json_response
    assert "SMA_200" in json_response
    assert "RSI" in json_response
    assert "MACD" in json_response

def test_get_stock_forecast(test_app, mock_bigquery_client_module):
    mock_query_job = MagicMock()
    mock_bigquery_client_module.query.return_value = mock_query_job
    # Generate enough mock data for ARIMA model (e.g., 100 data points)
    mock_data = []
    for i in range(100):
        mock_data.append({
            "TradingDate": (pd.to_datetime("2023-01-01") + pd.Timedelta(days=i)).strftime("%Y-%m-%d"),
            "ClosePrice": 100 + i + (i % 5) # Add some variation
        })
    mock_query_job.result.return_value = mock_data

    response = test_app.get("/stocks/TEST/forecast")
    assert response.status_code == 200
    json_response = response.json()
    assert isinstance(json_response, list)
    assert len(json_response) == 30 # Expecting 30 days forecast
    assert "TradingDate" in json_response[0]
    assert "ForecastedClosePrice" in json_response[0]