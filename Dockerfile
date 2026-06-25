# --- Estágio 1: Compilação ---
FROM node:20-alpine AS build

WORKDIR /app

# Copia apenas os arquivos de dependências primeiro (otimiza o cache do Docker)
COPY package*.json ./

# Instala todas as dependências do projeto
RUN npm install

# Copia o restante dos arquivos do projeto para o container
COPY . .

# Compila a aplicação Vite para gerar a pasta 'dist'
RUN npm run build

# --- Estágio 2: Produção com Nginx ---
FROM nginx:alpine

# Copia os arquivos estáticos compilados do estágio anterior para a pasta padrão do Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copia uma configuração customizada para o Nginx lidar com rotas do React (Single Page Application)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]