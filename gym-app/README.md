# GymManager

GymManager è un'applicazione web sviluppata con l'obiettivo di realizzare un piccolo gestionale per una palestra, mettendo in pratica non solo lo sviluppo dell'interfaccia frontend, ma anche la comunicazione con un backend e la gestione persistente dei dati tramite database.

## Obiettivo del progetto

L'obiettivo principale del progetto è stato quello di creare un'applicazione completa, superando la semplice gestione dei dati tramite LocalStorage e introducendo un'architettura composta da:

- Frontend sviluppato con Angular
- Backend sviluppato con Node.js ed Express
- Database relazionale MySQL
- API REST per la comunicazione tra frontend e backend

In questo modo i dati relativi ai clienti e ai corsi vengono salvati realmente nel database e gestiti attraverso il backend.

## Funzionalità

L'applicazione permette di:

- visualizzare, aggiungere, modificare ed eliminare clienti;
- visualizzare, aggiungere, modificare ed eliminare corsi;
- associare ogni cliente a un corso;
- gestire automaticamente i posti disponibili dei corsi;
- impedire l'iscrizione a un corso quando non ci sono più posti disponibili;
- aggiornare i posti quando un cliente viene aggiunto, eliminato o spostato in un altro corso;
- impedire l'eliminazione di un corso al quale risultano ancora associati dei clienti;
- controllare le scadenze degli abbonamenti;
- visualizzare nella Dashboard il numero totale di clienti, corsi e posti disponibili.

## Gestione dei dati

Il database è composto principalmente dalle tabelle `clienti` e `corsi`.

I clienti sono collegati ai corsi attraverso una relazione basata sull'identificativo del corso (`corso_id`) e una Foreign Key.

Il backend utilizza inoltre delle transazioni per mantenere coerenti i dati. Ad esempio, quando viene aggiunto un cliente, l'inserimento del cliente e la diminuzione dei posti disponibili del corso vengono gestiti come un'unica operazione.

Se una delle operazioni fallisce, le modifiche vengono annullate tramite rollback.

## Tecnologie utilizzate

### Frontend
- Angular
- TypeScript
- HTML
- CSS
- Bootstrap

### Backend
- Node.js
- Express
- REST API

### Database
- MySQL
- MySQL Workbench

## Architettura

Il progetto segue una struttura in cui le responsabilità sono separate:

`Angular → API REST → Node.js / Express → MySQL`

Angular gestisce l'interfaccia e l'interazione con l'utente.

I Service Angular effettuano le richieste HTTP verso le API.

Il backend riceve le richieste, applica la logica dell'applicazione e comunica con MySQL.

Il database si occupa della persistenza e delle relazioni tra i dati.

## Perché ho realizzato GymManager

Ho realizzato GymManager come progetto personale per approfondire lo sviluppo di un'applicazione web completa e comprendere meglio il funzionamento della comunicazione tra frontend, backend e database.

Il progetto mi ha permesso di mettere in pratica le conoscenze acquisite con Angular e TypeScript e, allo stesso tempo, di avvicinarmi allo sviluppo backend con Node.js, Express e MySQL, lavorando con API REST, operazioni CRUD, relazioni tra tabelle e transazioni.

## Sviluppi futuri

Il progetto può essere ulteriormente ampliato introducendo funzionalità come autenticazione degli utenti, invio e-mail scadenza abbonamento , fix prenotazione ultimo posto disponibile in contemporane e ulteriori statistiche nella Dashboard.