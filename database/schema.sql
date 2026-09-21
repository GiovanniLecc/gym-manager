-- ============================================
-- GymManager - Struttura del database
-- ============================================

CREATE DATABASE IF NOT EXISTS gym_manager;

USE gym_manager;


-- ============================================
-- Tabella corsi
-- ============================================

CREATE TABLE corsi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    giorno VARCHAR(20) NOT NULL,
    orario VARCHAR(10) NOT NULL,
    posti_disponibili INT NOT NULL
);


-- ============================================
-- Tabella clienti
-- ============================================

CREATE TABLE clienti (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    cognome VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    corso_id INT NOT NULL,
    scadenza_abbonamento DATE NOT NULL,

    CONSTRAINT fk_cliente_corso
        FOREIGN KEY (corso_id)
        REFERENCES corsi(id)
);