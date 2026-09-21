require('dotenv').config();

// importa Express
const express = require('express');

// importa CORS
const cors = require('cors');

// crea il server Express
const app = express();

// importa mysql2 (il nostro database)
const mysql = require('mysql2');

// permette al server di ricevere dati JSON
app.use(express.json());

// permette ad Angular di comunicare con il backend
app.use(cors());

// porta su cui funzionerà il backend
const PORT = 3000;

// connessione al database MySQL
const db = mysql.createConnection({

    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME

});

// prova la connessione al database
db.connect((errore) => {

    if (errore) {
        console.error('Errore connessione MySQL:', errore);
        return;
    }

    console.log('Connesso al database gym_manager');

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


    // Inizia una transazione
    db.beginTransaction((errore) => {

        if (errore) {
            console.error(
                'Errore nell\'avvio della transazione:',
                errore
            );

            return res.status(500).json({
                errore: 'Errore del server'
            });
        }


        // Controlla che il corso esista e che abbia posti disponibili
        const sqlCorso = `
            SELECT id, posti_disponibili
            FROM corsi
            WHERE id = ?
            FOR UPDATE
        `;

        db.query(sqlCorso, [corsoId], (errore, corsi) => {

            if (errore) {
                return db.rollback(() => {
                    console.error(
                        'Errore nel controllo del corso:',
                        errore
                    );

                    res.status(500).json({
                        errore: 'Errore nel controllo del corso'
                    });
                });
            }


            // Il corso indicato non esiste
            if (corsi.length === 0) {
                return db.rollback(() => {
                    res.status(404).json({
                        errore: 'Corso non trovato'
                    });
                });
            }


            // Il corso esiste ma non ha più posti
            if (corsi[0].posti_disponibili <= 0) {
                return db.rollback(() => {
                    res.status(400).json({
                        errore: 'Il corso è al completo'
                    });
                });
            }


            // Inserisce il cliente utilizzando corso_id
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

            db.query(
                sqlCliente,
                valoriCliente,
                (errore, risultato) => {

                    if (errore) {
                        return db.rollback(() => {
                            console.error(
                                'Errore nell\'aggiunta del cliente:',
                                errore
                            );

                            res.status(500).json({
                                errore: 'Errore nell\'aggiunta del cliente'
                            });
                        });
                    }


                    // Occupa un posto nel corso scelto
                    const sqlPosto = `
                        UPDATE corsi
                        SET posti_disponibili = posti_disponibili - 1
                        WHERE id = ?
                    `;

                    db.query(
                        sqlPosto, [corsoId],
                        (errore) => {

                            if (errore) {
                                return db.rollback(() => {
                                    console.error(
                                        'Errore nell\'aggiornamento dei posti:',
                                        errore
                                    );

                                    res.status(500).json({
                                        errore: 'Errore nell\'aggiornamento dei posti'
                                    });
                                });
                            }


                            // Tutte le operazioni sono riuscite:
                            // salva definitivamente le modifiche
                            db.commit((errore) => {

                                if (errore) {
                                    return db.rollback(() => {
                                        console.error(
                                            'Errore nel commit:',
                                            errore
                                        );

                                        res.status(500).json({
                                            errore: 'Errore nel salvataggio'
                                        });
                                    });
                                }


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

        });

    });

});

// DELETE - elimina un cliente e libera il posto nel corso
app.delete('/clienti/:id', (req, res) => {

    // Recupera l'id del cliente dall'URL
    // Esempio: /clienti/4 -> id = 4
    const id = req.params.id;


    // Inizia la transazione
    db.beginTransaction((errore) => {

        if (errore) {
            console.error(
                'Errore nell\'avvio della transazione:',
                errore
            );

            return res.status(500).json({
                errore: 'Errore del server'
            });
        }


        // Prima di eliminare il cliente dobbiamo sapere
        // a quale corso è iscritto
        const sqlCliente = `
            SELECT corso_id
            FROM clienti
            WHERE id = ?
            FOR UPDATE
        `;

        db.query(sqlCliente, [id], (errore, clienti) => {

            if (errore) {
                return db.rollback(() => {
                    console.error(
                        'Errore nel recupero del cliente:',
                        errore
                    );

                    res.status(500).json({
                        errore: 'Errore nel recupero del cliente'
                    });
                });
            }


            // Se non esiste nessun cliente con questo id
            if (clienti.length === 0) {
                return db.rollback(() => {
                    res.status(404).json({
                        errore: 'Cliente non trovato'
                    });
                });
            }


            // Salviamo l'id del corso prima di eliminare il cliente
            const corsoId = clienti[0].corso_id;


            // Elimina il cliente
            const sqlDelete = `
                DELETE FROM clienti
                WHERE id = ?
            `;

            db.query(sqlDelete, [id], (errore) => {

                if (errore) {
                    return db.rollback(() => {
                        console.error(
                            'Errore nell\'eliminazione del cliente:',
                            errore
                        );

                        res.status(500).json({
                            errore: 'Errore nell\'eliminazione del cliente'
                        });
                    });
                }


                // Libera un posto nel corso del cliente eliminato
                const sqlPosto = `
                    UPDATE corsi
                    SET posti_disponibili = posti_disponibili + 1
                    WHERE id = ?
                `;

                db.query(sqlPosto, [corsoId], (errore, risultato) => {

                    if (errore) {
                        return db.rollback(() => {
                            console.error(
                                'Errore nella liberazione del posto:',
                                errore
                            );

                            res.status(500).json({
                                errore: 'Errore nella liberazione del posto'
                            });
                        });
                    }


                    // Controllo di sicurezza:
                    // il corso associato deve esistere
                    if (risultato.affectedRows === 0) {
                        return db.rollback(() => {
                            res.status(404).json({
                                errore: 'Corso associato non trovato'
                            });
                        });
                    }


                    // Eliminazione cliente + liberazione posto riuscite:
                    // confermiamo entrambe le modifiche
                    db.commit((errore) => {

                        if (errore) {
                            return db.rollback(() => {
                                console.error(
                                    'Errore nel commit:',
                                    errore
                                );

                                res.status(500).json({
                                    errore: 'Errore nel salvataggio'
                                });
                            });
                        }


                        // Operazione completata correttamente
                        res.status(204).send();

                    });

                });

            });

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


    // Inizia la transazione
    db.beginTransaction((errore) => {

        if (errore) {
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

        db.query(sqlCliente, [id], (errore, clienti) => {

            if (errore) {
                return db.rollback(() => {
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
                return db.rollback(() => {
                    res.status(404).json({
                        errore: 'Cliente non trovato'
                    });
                });
            }


            // Salva l'id del vecchio corso
            const vecchioCorsoId = clienti[0].corso_id;


            // Funzione che modifica i dati del cliente
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

                db.query(
                    sqlUpdateCliente,
                    valori,
                    (errore) => {

                        if (errore) {
                            return db.rollback(() => {
                                console.error(
                                    'Errore nella modifica del cliente:',
                                    errore
                                );

                                res.status(500).json({
                                    errore: 'Errore nella modifica del cliente'
                                });
                            });
                        }


                        // Tutto riuscito: conferma le modifiche
                        db.commit((errore) => {

                            if (errore) {
                                return db.rollback(() => {
                                    console.error(
                                        'Errore nel commit:',
                                        errore
                                    );

                                    res.status(500).json({
                                        errore: 'Errore nel salvataggio'
                                    });
                                });
                            }


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
            // aggiorna solamente i dati del cliente
            if (Number(vecchioCorsoId) === Number(corsoId)) {
                aggiornaCliente();
                return;
            }


            // Se il corso è cambiato,
            // controlla prima che il nuovo corso esista
            // e abbia almeno un posto disponibile
            const sqlNuovoCorso = `
                SELECT id, posti_disponibili
                FROM corsi
                WHERE id = ?
                FOR UPDATE
            `;

            db.query(
                sqlNuovoCorso, [corsoId],
                (errore, corsi) => {

                    if (errore) {
                        return db.rollback(() => {
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
                        return db.rollback(() => {
                            res.status(404).json({
                                errore: 'Nuovo corso non trovato'
                            });
                        });
                    }


                    // Il nuovo corso è pieno
                    if (corsi[0].posti_disponibili <= 0) {
                        return db.rollback(() => {
                            res.status(400).json({
                                errore: 'Il nuovo corso è al completo'
                            });
                        });
                    }


                    // Libera un posto nel vecchio corso
                    const sqlLiberaPosto = `
                        UPDATE corsi
                        SET posti_disponibili = posti_disponibili + 1
                        WHERE id = ?
                    `;

                    db.query(
                        sqlLiberaPosto, [vecchioCorsoId],
                        (errore, risultato) => {

                            if (errore) {
                                return db.rollback(() => {
                                    console.error(
                                        'Errore nel liberare il vecchio posto:',
                                        errore
                                    );

                                    res.status(500).json({
                                        errore: 'Errore nell\'aggiornamento del vecchio corso'
                                    });
                                });
                            }


                            // Controllo di sicurezza
                            if (risultato.affectedRows === 0) {
                                return db.rollback(() => {
                                    res.status(404).json({
                                        errore: 'Vecchio corso non trovato'
                                    });
                                });
                            }


                            // Occupa un posto nel nuovo corso
                            const sqlOccupaPosto = `
                                UPDATE corsi
                                SET posti_disponibili = posti_disponibili - 1
                                WHERE id = ?
                                AND posti_disponibili > 0
                            `;

                            db.query(
                                sqlOccupaPosto, [corsoId],
                                (errore, risultato) => {

                                    if (errore) {
                                        return db.rollback(() => {
                                            console.error(
                                                'Errore nell\'occupazione del nuovo posto:',
                                                errore
                                            );

                                            res.status(500).json({
                                                errore: 'Errore nell\'aggiornamento del nuovo corso'
                                            });
                                        });
                                    }


                                    // Nessun posto disponibile
                                    if (risultato.affectedRows === 0) {
                                        return db.rollback(() => {
                                            res.status(400).json({
                                                errore: 'Il nuovo corso è al completo'
                                            });
                                        });
                                    }


                                    // Solo dopo aver sistemato i posti
                                    // modifica il cliente
                                    aggiornaCliente();

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

// OCCUPA POSTO CORSO
app.put('/corsi/:id/occupa-posto', (req, res) => {

    // recupera l'id del corso dall'URL
    const id = req.params.id;

    // diminuisce i posti disponibili di 1
    // solamente se esiste ancora almeno un posto
    const sql = `
        UPDATE corsi
        SET posti_disponibili = posti_disponibili - 1
        WHERE id = ?
        AND posti_disponibili > 0
    `;

    db.query(sql, [id], (errore, risultato) => {

        if (errore) {
            console.error(
                'Errore nell\'occupazione del posto:',
                errore
            );

            res.status(500).json({
                errore: 'Errore nell\'occupazione del posto'
            });

            return;
        }

        // nessun posto disponibile oppure corso non trovato
        if (risultato.affectedRows === 0) {
            res.status(400).json({
                errore: 'Corso non disponibile'
            });

            return;
        }

        res.status(204).send();

    });

});

// LIBERA POSTO CORSO
app.put('/corsi/:id/libera-posto', (req, res) => {

    // recupera l'id del corso dall'URL
    const id = req.params.id;

    // aumenta di 1 i posti disponibili
    // senza superare la capienza di 20 posti
    const sql = `
        UPDATE corsi
        SET posti_disponibili = posti_disponibili + 1
        WHERE id = ?
        AND posti_disponibili < 20
    `;

    db.query(sql, [id], (errore, risultato) => {

        if (errore) {
            console.error(
                'Errore nella liberazione del posto:',
                errore
            );

            res.status(500).json({
                errore: 'Errore nella liberazione del posto'
            });

            return;
        }

        if (risultato.affectedRows === 0) {
            res.status(400).json({
                errore: 'Impossibile liberare il posto'
            });

            return;
        }

        res.status(204).send();

    });

});

// avvia il server
app.listen(PORT, () => {

    console.log(`Server avviato sulla porta ${PORT}`);

});