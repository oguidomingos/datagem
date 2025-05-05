-- Script para criar schema de projeto e inserir dados de exemplo
-- Substituir {project_id} pelo ID do projeto

-- Criar schema para o projeto (se não existir)
CREATE SCHEMA IF NOT EXISTS "project_{project_id}";

-- Criar tabela de pedidos (orders)
CREATE TABLE IF NOT EXISTS "project_{project_id}"."orders" (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL,
  date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) NOT NULL,
  customer_email VARCHAR(255),
  customer_name VARCHAR(255),
  total DECIMAL(10, 2) NOT NULL,
  items_count INTEGER DEFAULT 0,
  payment_method VARCHAR(100),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de produtos (products)
CREATE TABLE IF NOT EXISTS "project_{project_id}"."products" (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  price DECIMAL(10, 2) NOT NULL,
  regular_price DECIMAL(10, 2),
  sale_price DECIMAL(10, 2),
  stock_quantity INTEGER,
  stock_status VARCHAR(50),
  description TEXT,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de clientes (customers)
CREATE TABLE IF NOT EXISTS "project_{project_id}"."customers" (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  email VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50),
  date_created TIMESTAMP WITH TIME ZONE,
  orders_count INTEGER DEFAULT 0,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir dados de exemplo para pedidos
INSERT INTO "project_{project_id}"."orders" (order_id, date_created, status, customer_email, customer_name, total, items_count, payment_method)
VALUES
  (1001, NOW() - INTERVAL '5 days', 'completed', 'cliente1@example.com', 'João Silva', 125.50, 2, 'pix'),
  (1002, NOW() - INTERVAL '4 days', 'processing', 'cliente2@example.com', 'Maria Souza', 299.99, 1, 'credit_card'),
  (1003, NOW() - INTERVAL '3 days', 'completed', 'cliente3@example.com', 'Pedro Santos', 87.25, 3, 'boleto'),
  (1004, NOW() - INTERVAL '2 days', 'completed', 'cliente4@example.com', 'Ana Ferreira', 450.00, 5, 'pix'),
  (1005, NOW() - INTERVAL '1 day', 'processing', 'cliente5@example.com', 'Carlos Mendes', 199.90, 2, 'credit_card'),
  (1006, NOW() - INTERVAL '12 hours', 'on-hold', 'cliente6@example.com', 'Julia Costa', 75.50, 1, 'pix'),
  (1007, NOW() - INTERVAL '6 hours', 'pending', 'cliente7@example.com', 'Roberto Alves', 325.75, 4, 'boleto'),
  (1008, NOW() - INTERVAL '3 hours', 'processing', 'cliente1@example.com', 'João Silva', 89.90, 1, 'credit_card');

-- Inserir dados de exemplo para produtos
INSERT INTO "project_{project_id}"."products" (product_id, name, sku, price, regular_price, sale_price, stock_quantity, stock_status)
VALUES
  (101, 'Smartphone XYZ', 'PHONE-XYZ', 1299.99, 1499.99, 1299.99, 15, 'instock'),
  (102, 'Notebook Ultra', 'NOTE-ULTRA', 4599.90, 4999.90, 4599.90, 8, 'instock'),
  (103, 'Fones de Ouvido Bluetooth', 'AUDIO-BT', 199.90, 249.90, 199.90, 50, 'instock'),
  (104, 'Mouse Sem Fio', 'MOUSE-W', 89.90, 99.90, 89.90, 30, 'instock'),
  (105, 'Teclado Mecânico', 'KEY-MECH', 349.90, 399.90, 349.90, 12, 'instock'),
  (106, 'Monitor 24"', 'MON-24', 799.90, 899.90, 799.90, 5, 'instock'),
  (107, 'Câmera Digital', 'CAM-DIG', 1599.90, 1799.90, 1599.90, 7, 'instock'),
  (108, 'Carregador Rápido', 'CHARGE-FAST', 99.90, 129.90, 99.90, 40, 'instock');

-- Inserir dados de exemplo para clientes
INSERT INTO "project_{project_id}"."customers" (customer_id, email, first_name, last_name, role, date_created, orders_count, total_spent)
VALUES
  (201, 'cliente1@example.com', 'João', 'Silva', 'customer', NOW() - INTERVAL '30 days', 2, 215.40),
  (202, 'cliente2@example.com', 'Maria', 'Souza', 'customer', NOW() - INTERVAL '25 days', 1, 299.99),
  (203, 'cliente3@example.com', 'Pedro', 'Santos', 'customer', NOW() - INTERVAL '20 days', 1, 87.25),
  (204, 'cliente4@example.com', 'Ana', 'Ferreira', 'customer', NOW() - INTERVAL '15 days', 1, 450.00),
  (205, 'cliente5@example.com', 'Carlos', 'Mendes', 'customer', NOW() - INTERVAL '10 days', 1, 199.90),
  (206, 'cliente6@example.com', 'Julia', 'Costa', 'customer', NOW() - INTERVAL '5 days', 1, 75.50),
  (207, 'cliente7@example.com', 'Roberto', 'Alves', 'customer', NOW() - INTERVAL '2 days', 1, 325.75);

-- Exemplo de como executar este script com o ID do projeto:
-- psql -U postgres -d postgres -c "$(sed 's/{project_id}/cf623e37-48fa-41dd-a40a-277bc25b0f4a/g' create_project_sample_data.sql)"