// Carica le variabili presenti nel file .env
require('dotenv').config();

// Importa Express
const express = require('express');

// Importa CORS
const cors = require('cors');

// Importa mysql2
const mysql = require('mysql2');

// Crea il server Express
const app = express();

// Permette al server di ricevere dati JSON
app.use(express.json());

// Permette ad Angular di comunicare con il backend
app.use(cors());

// Render fornisce la porta in produzione,
// mentre in locale utilizziamo la porta 3000
const PORT = process.env.PORT || 3000;


// Pool di connessioni al database MySQL
const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    ssl: {
        rejectUnauthorized: false
    },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


// Verifica la connessione al database
db.getConnection((errore, connection) => {

    if (errore) {
        console.error('Errore connessione MySQL:', errore);
        return;
    }

    console.log('Connesso al database gym_manager');

    // Restituisce la connessione al pool
    connection.release();
});

// GET - restituisce tutti i clienti presenti nel database
app.get('/clienti', (req, res) => {

    // Recupera i clienti e le informazioni del corso associato
    const sql = `
        SELECT
            clienti.id,
            clienti.nome,
            clienti.cognome,
            clienti.email,

            clienti.corso_id AS corsoId,
            corsi.nome AS corsoNome,

            DATE_FORMAT(
                clienti.scadenza_abbonamento,
                '%Y-%m-%d'
            ) AS scadenzaAbbonamento

        FROM clienti

        JOIN corsi
        ON clienti.corso_id = corsi.id
    `;


    // Esegue la query sul database
    db.query(sql, (errore, risultati) => {

        // Se MySQL restituisce un errore
        if (errore) {

            console.error(
                'Errore nel recupero dei clienti:',
                errore
            );

            res.status(500).json({
                errore: 'Errore nel recupero dei clienti'
            });

            return;
        }


        // Restituisce i clienti in formato JSON
        res.json(risultati);

    });

});

// POST - aggiunge un nuovo cliente al database
app.post('/clienti', (req, res) => {

    // Recupera i dati inviati da Angular
    const {
        nome,
        cognome,
        email,
        corsoId,
        scadenzaAbbonamento
    } = req.body;


    // Prende una connessione dal pool
    db.getConnection((errore, connection) => {

        if (errore) {
            console.error(
                'Errore nel recupero della connessione:',
                errore
            );

            return res.status(500).json({
                errore: 'Errore del server'
            });
        }


        // Inizia la transazione sulla stessa connessione
        connection.beginTransaction((errore) => {

            if (errore) {

                // Restituisce la connessione al pool
                connection.release();

                console.error(
                    'Errore nell\'avvio della transazione:',
                    errore
                );

                return res.status(500).json({
                    errore: 'Errore del server'
                });
            }


            // Controlla che il corso esista
            // e che abbia posti disponibili
            const sqlCorso = `
                SELECT id, posti_disponibili
                FROM corsi
                WHERE id = ?
                FOR UPDATE
            `;


            // IMPORTANTE:
            // usiamo connection.query e non db.query
            connection.query(
                sqlCorso, [corsoId],
                (errore, corsi) => {

                    if (errore) {

                        return connection.rollback(() => {

                            connection.release();

                            console.error(
                                'Errore nel controllo del corso:',
                                errore
                            );

                            res.status(500).json({
                                errore: 'Errore nel controllo del corso'
                            });
                        });
                    }


                    // Il corso non esiste
                    if (corsi.length === 0) {

                        return connection.rollback(() => {

                            connection.release();

                            res.status(404).json({
                                errore: 'Corso non trovato'
                            });
                        });
                    }


                    // Il corso non ha più posti disponibili
                    if (corsi[0].posti_disponibili <= 0) {

                        return connection.rollback(() => {

                            connection.release();

                            res.status(400).json({
                                errore: 'Il corso è al completo'
                            });
                        });
                    }


                    // Inserisce il cliente
                    const sqlCliente = `
                        INSERT INTO clienti
                        (
                            nome,
                            cognome,
                            email,
                            corso_id,
                            scadenza_abbonamento
                        )
                        VALUES (?, ?, ?, ?, ?)
                    `;


                    const valoriCliente = [
                        nome,
                        cognome,
                        email,
                        corsoId,
                        scadenzaAbbonamento
                    ];


                    connection.query(
                        sqlCliente,
                        valoriCliente,
                        (errore, risultato) => {

                            if (errore) {

                                return connection.rollback(() => {

                                    connection.release();

                                    console.error(
                                        'Errore nell\'aggiunta del cliente:',
                                        errore
                                    );

                                    res.status(500).json({
                                        errore: 'Errore nell\'aggiunta del cliente'
                                    });
                                });
                            }


                            // Occupa un posto nel corso
                            const sqlPosto = `
                                UPDATE corsi
                                SET posti_disponibili =
                                    posti_disponibili - 1
                                WHERE id = ?
                            `;


                            connection.query(
                                sqlPosto, [corsoId],
                                (errore) => {

                                    if (errore) {

                                        return connection.rollback(() => {

                                            connection.release();

                                            console.error(
                                                'Errore nell\'aggiornamento dei posti:',
                                                errore
                                            );

                                            res.status(500).json({
                                                errore: 'Errore nell\'aggiornamento dei posti'
                                            });
                                        });
                                    }


                                    // Conferma definitivamente
                                    // tutte le operazioni
                                    connection.commit((errore) => {

                                        if (errore) {

                                            return connection.rollback(() => {

                                                connection.release();

                                                console.error(
                                                    'Errore nel commit:',
                                                    errore
                                                );

                                                res.status(500).json({
                                                    errore: 'Errore nel salvataggio'
                                                });
                                            });
                                        }


                                        // La transazione è terminata:
                                        // restituiamo la connessione al pool
                                        connection.release();


                                        // Risposta inviata ad Angular
                                        res.status(201).json({
                                            id: risultato.insertId,
                                            nome,
                                            cognome,
                                            email,
                                            corsoId,
                                            scadenzaAbbonamento
                                        });

                                    });

                                }
                            );

                        }
                    );

                }
            );

        });

    });

});

// DELETE - elimina un cliente e libera il posto nel corso
app.delete('/clienti/:id', (req, res) => {

    // Recupera l'id del cliente dall'URL
    const id = req.params.id;


    // Prende una connessione dal pool
    db.getConnection((errore, connection) => {

        if (errore) {
            console.error(
                'Errore nel recupero della connessione:',
                errore
            );

            return res.status(500).json({
                errore: 'Errore del server'
            });
        }


        // Inizia la transazione sulla connessione ottenuta
        connection.beginTransaction((errore) => {

            if (errore) {

                connection.release();

                console.error(
                    'Errore nell\'avvio della transazione:',
                    errore
                );

                return res.status(500).json({
                    errore: 'Errore del server'
                });
            }


            // Recupera il corso a cui appartiene il cliente
            const sqlCliente = `
                SELECT corso_id
                FROM clienti
                WHERE id = ?
                FOR UPDATE
            `;


            connection.query(
                sqlCliente, [id],
                (errore, clienti) => {

                    if (errore) {

                        return connection.rollback(() => {

                            connection.release();

                            console.error(
                                'Errore nel recupero del cliente:',
                                errore
                            );

                            res.status(500).json({
                                errore: 'Errore nel recupero del cliente'
                            });
                        });
                    }


                    // Il cliente non esiste
                    if (clienti.length === 0) {

                        return connection.rollback(() => {

                            connection.release();

                            res.status(404).json({
                                errore: 'Cliente non trovato'
                            });
                        });
                    }


                    // Salviamo il corso del cliente
                    // prima di eliminarlo
                    const corsoId = clienti[0].corso_id;


                    // Elimina il cliente
                    const sqlDelete = `
                        DELETE FROM clienti
                        WHERE id = ?
                    `;


                    connection.query(
                        sqlDelete, [id],
                        (errore) => {

                            if (errore) {

                                return connection.rollback(() => {

                                    connection.release();

                                    console.error(
                                        'Errore nell\'eliminazione del cliente:',
                                        errore
                                    );

                                    res.status(500).json({
                                        errore: 'Errore nell\'eliminazione del cliente'
                                    });
                                });
                            }


                            // Libera un posto nel corso
                            const sqlPosto = `
                                UPDATE corsi
                                SET posti_disponibili =
                                    posti_disponibili + 1
                                WHERE id = ?
                            `;


                            connection.query(
                                sqlPosto, [corsoId],
                                (errore, risultato) => {

                                    if (errore) {

                                        return connection.rollback(() => {

                                            connection.release();

                                            console.error(
                                                'Errore nella liberazione del posto:',
                                                errore
                                            );

                                            res.status(500).json({
                                                errore: 'Errore nella liberazione del posto'
                                            });
                                        });
                                    }


                                    // Controllo di sicurezza
                                    if (risultato.affectedRows === 0) {

                                        return connection.rollback(() => {

                                            connection.release();

                                            res.status(404).json({
                                                errore: 'Corso associato non trovato'
                                            });
                                        });
                                    }


                                    // Conferma definitivamente
                                    // eliminazione + aggiornamento posto
                                    connection.commit((errore) => {

                                        if (errore) {

                                            return connection.rollback(() => {

                                                connection.release();

                                                console.error(
                                                    'Errore nel commit:',
                                                    errore
                                                );

                                                res.status(500).json({
                                                    errore: 'Errore nel salvataggio'
                                                });
                                            });
                                        }


                                        // Restituisce la connessione al pool
                                        connection.release();


                                        // Eliminazione completata
                                        res.status(204).send();

                                    });

                                }
                            );

                        }
                    );

                }
            );

        });

    });

});

// PUT - modifica un cliente
// Se cambia corso, aggiorna automaticamente anche i posti disponibili
app.put('/clienti/:id', (req, res) => {

    // Recupera l'id del cliente dall'URL
    const id = req.params.id;

    // Recupera i nuovi dati inviati da Angular
    const {
        nome,
        cognome,
        email,
        corsoId,
        scadenzaAbbonamento
    } = req.body;


    // Prende una connessione dal pool
    db.getConnection((errore, connection) => {

        if (errore) {
            console.error(
                'Errore nel recupero della connessione:',
                errore
            );

            return res.status(500).json({
                errore: 'Errore del server'
            });
        }


        // Inizia la transazione
        connection.beginTransaction((errore) => {

            if (errore) {

                connection.release();

                console.error(
                    'Errore nell\'avvio della transazione:',
                    errore
                );

                return res.status(500).json({
                    errore: 'Errore del server'
                });
            }


            // Recupera il corso attuale del cliente
            const sqlCliente = `
                SELECT corso_id
                FROM clienti
                WHERE id = ?
                FOR UPDATE
            `;


            connection.query(
                sqlCliente, [id],
                (errore, clienti) => {

                    if (errore) {

                        return connection.rollback(() => {

                            connection.release();

                            console.error(
                                'Errore nel recupero del cliente:',
                                errore
                            );

                            res.status(500).json({
                                errore: 'Errore nel recupero del cliente'
                            });
                        });
                    }


                    // Il cliente non esiste
                    if (clienti.length === 0) {

                        return connection.rollback(() => {

                            connection.release();

                            res.status(404).json({
                                errore: 'Cliente non trovato'
                            });
                        });
                    }


                    // Salva l'id del corso attuale
                    const vecchioCorsoId =
                        clienti[0].corso_id;


                    // Funzione che aggiorna i dati del cliente
                    const aggiornaCliente = () => {

                        const sqlUpdateCliente = `
                            UPDATE clienti
                            SET
                                nome = ?,
                                cognome = ?,
                                email = ?,
                                corso_id = ?,
                                scadenza_abbonamento = ?
                            WHERE id = ?
                        `;


                        const valori = [
                            nome,
                            cognome,
                            email,
                            corsoId,
                            scadenzaAbbonamento,
                            id
                        ];


                        connection.query(
                            sqlUpdateCliente,
                            valori,
                            (errore) => {

                                if (errore) {

                                    return connection.rollback(() => {

                                        connection.release();

                                        console.error(
                                            'Errore nella modifica del cliente:',
                                            errore
                                        );

                                        res.status(500).json({
                                            errore: 'Errore nella modifica del cliente'
                                        });
                                    });
                                }


                                // Conferma tutte le modifiche
                                connection.commit((errore) => {

                                    if (errore) {

                                        return connection.rollback(() => {

                                            connection.release();

                                            console.error(
                                                'Errore nel commit:',
                                                errore
                                            );

                                            res.status(500).json({
                                                errore: 'Errore nel salvataggio'
                                            });
                                        });
                                    }


                                    // Restituisce la connessione al pool
                                    connection.release();


                                    // Restituisce il cliente modificato
                                    res.status(200).json({
                                        id: Number(id),
                                        nome,
                                        cognome,
                                        email,
                                        corsoId,
                                        scadenzaAbbonamento
                                    });

                                });

                            }
                        );

                    };


                    // Se il corso NON è cambiato,
                    // aggiorna solamente il cliente
                    if (
                        Number(vecchioCorsoId) ===
                        Number(corsoId)
                    ) {

                        aggiornaCliente();
                        return;
                    }


                    // Se il corso è cambiato,
                    // controlla il nuovo corso
                    const sqlNuovoCorso = `
                        SELECT id, posti_disponibili
                        FROM corsi
                        WHERE id = ?
                        FOR UPDATE
                    `;


                    connection.query(
                        sqlNuovoCorso, [corsoId],
                        (errore, corsi) => {

                            if (errore) {

                                return connection.rollback(() => {

                                    connection.release();

                                    console.error(
                                        'Errore nel controllo del nuovo corso:',
                                        errore
                                    );

                                    res.status(500).json({
                                        errore: 'Errore nel controllo del nuovo corso'
                                    });
                                });
                            }


                            // Il nuovo corso non esiste
                            if (corsi.length === 0) {

                                return connection.rollback(() => {

                                    connection.release();

                                    res.status(404).json({
                                        errore: 'Nuovo corso non trovato'
                                    });
                                });
                            }


                            // Il nuovo corso è pieno
                            if (
                                corsi[0].posti_disponibili <= 0
                            ) {

                                return connection.rollback(() => {

                                    connection.release();

                                    res.status(400).json({
                                        errore: 'Il nuovo corso è al completo'
                                    });
                                });
                            }


                            // Libera un posto nel vecchio corso
                            const sqlLiberaPosto = `
                                UPDATE corsi
                                SET posti_disponibili =
                                    posti_disponibili + 1
                                WHERE id = ?
                            `;


                            connection.query(
                                sqlLiberaPosto, [vecchioCorsoId],
                                (errore, risultato) => {

                                    if (errore) {

                                        return connection.rollback(() => {

                                            connection.release();

                                            console.error(
                                                'Errore nel liberare il vecchio posto:',
                                                errore
                                            );

                                            res.status(500).json({
                                                errore: 'Errore nell\'aggiornamento del vecchio corso'
                                            });
                                        });
                                    }


                                    // Controlla che il vecchio corso esista
                                    if (
                                        risultato.affectedRows === 0
                                    ) {

                                        return connection.rollback(() => {

                                            connection.release();

                                            res.status(404).json({
                                                errore: 'Vecchio corso non trovato'
                                            });
                                        });
                                    }


                                    // Occupa un posto nel nuovo corso
                                    const sqlOccupaPosto = `
                                        UPDATE corsi
                                        SET posti_disponibili =
                                            posti_disponibili - 1
                                        WHERE id = ?
                                        AND posti_disponibili > 0
                                    `;


                                    connection.query(
                                        sqlOccupaPosto, [corsoId],
                                        (errore, risultato) => {

                                            if (errore) {

                                                return connection.rollback(() => {

                                                    connection.release();

                                                    console.error(
                                                        'Errore nell\'occupazione del nuovo posto:',
                                                        errore
                                                    );

                                                    res.status(500).json({
                                                        errore: 'Errore nell\'aggiornamento del nuovo corso'
                                                    });
                                                });
                                            }


                                            // Il nuovo corso non ha posti
                                            if (
                                                risultato.affectedRows === 0
                                            ) {

                                                return connection.rollback(() => {

                                                    connection.release();

                                                    res.status(400).json({
                                                        errore: 'Il nuovo corso è al completo'
                                                    });
                                                });
                                            }


                                            // Ora modifica il cliente
                                            aggiornaCliente();

                                        }
                                    );

                                }
                            );

                        }
                    );

                }
            );

        });

    });

});

//  GET CORSI
app.get('/corsi', (req, res) => {

    // recupera tutti i corsi dal database
    // e rinomina posti_disponibili con il nome
    // utilizzato dal model Angular
    const sql = `
        SELECT
            id,
            nome,
            giorno,
            orario,
            posti_disponibili AS postiDisponibili
        FROM corsi
    `;

    db.query(sql, (errore, risultati) => {

        if (errore) {
            console.error(
                'Errore nel recupero dei corsi:',
                errore
            );

            res.status(500).json({
                errore: 'Errore nel recupero dei corsi'
            });

            return;
        }

        // restituisce i corsi ad Angular in formato JSON
        res.json(risultati);
    });

});

// POST CORSO
app.post('/corsi', (req, res) => {

    // recuperiamo i dati inviati da Angular
    const {
        nome,
        giorno,
        orario,
        postiDisponibili
    } = req.body;

    // query per inserire il nuovo corso nel database
    const sql = `
        INSERT INTO corsi
        (nome, giorno, orario, posti_disponibili)
        VALUES (?, ?, ?, ?)
    `;

    const valori = [
        nome,
        giorno,
        orario,
        postiDisponibili
    ];

    db.query(sql, valori, (errore, risultato) => {

        if (errore) {
            console.error(
                'Errore nell\'aggiunta del corso:',
                errore
            );

            res.status(500).json({
                errore: 'Errore nell\'aggiunta del corso'
            });

            return;
        }

        // restituiamo ad Angular il corso appena creato
        // compreso l'id generato automaticamente da MySQL
        res.status(201).json({
            id: risultato.insertId,
            nome,
            giorno,
            orario,
            postiDisponibili
        });

    });

});

// DELETE CORSO
app.delete('/corsi/:id', (req, res) => {

    // recupera l'id del corso dall'URL
    const id = req.params.id;

    const sql = `
        DELETE FROM corsi
        WHERE id = ?
    `;

    db.query(sql, [id], (errore, risultato) => {

        if (errore) {
            console.error(
                'Errore nell\'eliminazione del corso:',
                errore
            );

            res.status(500).json({
                errore: 'Errore nell\'eliminazione del corso'
            });

            return;
        }

        // nessun corso trovato con questo id
        if (risultato.affectedRows === 0) {
            res.status(404).json({
                errore: 'Corso non trovato'
            });

            return;
        }

        // eliminazione riuscita
        res.status(204).send();

    });

});

// UPDATE CORSO
app.put('/corsi/:id', (req, res) => {

    // recupera l'id del corso dall'URL
    const id = req.params.id;

    // recupera i nuovi dati inviati da Angular
    const {
        nome,
        giorno,
        orario,
        postiDisponibili
    } = req.body;

    // aggiorna il corso nel database
    const sql = `
        UPDATE corsi
        SET
            nome = ?,
            giorno = ?,
            orario = ?,
            posti_disponibili = ?
        WHERE id = ?
    `;

    const valori = [
        nome,
        giorno,
        orario,
        postiDisponibili,
        id
    ];

    db.query(sql, valori, (errore, risultato) => {

        if (errore) {
            console.error(
                'Errore nella modifica del corso:',
                errore
            );

            res.status(500).json({
                errore: 'Errore nella modifica del corso'
            });

            return;
        }

        // controlla se il corso esiste
        if (risultato.affectedRows === 0) {
            res.status(404).json({
                errore: 'Corso non trovato'
            });

            return;
        }

        // restituisce ad Angular il corso modificato
        res.status(200).json({
            id: Number(id),
            nome,
            giorno,
            orario,
            postiDisponibili
        });

    });

});

app.listen(PORT, () => {
    console.log(`Server avviato sulla porta ${PORT}`);
});