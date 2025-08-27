FROM python:3.12-slim

# Define diretório de trabalho
WORKDIR /app

# Copia requisitos e instala dependências
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
 && pip install --no-cache-dir -r requirements.txt

# Copia o código da aplicação
COPY app /app/app

# Expõe a porta usada pelo Flask
EXPOSE 5000

# Define a variável de ambiente para a aplicação Flask
ENV FLASK_APP=app
ENV PYTHONUNBUFFERED=1

# Comando padrão para iniciar o servidor de desenvolvimento
CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]