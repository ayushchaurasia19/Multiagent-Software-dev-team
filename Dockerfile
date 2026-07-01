FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code and execution script
COPY src/ src/
COPY run.sh .

# Ensure the script is executable
RUN chmod +x run.sh

# Expose backend port
EXPOSE 8080

CMD ["./run.sh"]
