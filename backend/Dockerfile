FROM python:3.10-slim-buster
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
COPY tests /app/tests
COPY vu-kim-75fd467f239e.json /app/vu-kim-75fd467f239e.json
ENV GOOGLE_APPLICATION_CREDENTIALS=/app/vu-kim-75fd467f239e.json
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]