import { Component, signal } from '@angular/core';
import { ClienteService } from '../../services/clienteservice';
import { CorsoService } from '../../services/corsoservice';
import { Corso } from '../../models/corso';
import { Cliente } from '../../models/cliente';
import { FormsModule } from '@angular/forms';

// tool di Angular per sistemare la visualizzazione della data
import { DatePipe } from '@angular/common';


@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})

export class Dashboard {

  // signal che contiene il numero totale dei clienti
  // quando cambia Angular aggiorna automaticamente la Dashboard
  totaleClienti = signal<number>(0);

  // signal che contiene il numero totale dei corsi
  totaleCorsi = signal<number>(0);

  // array dei corsi
  corsi: Corso[] = [];

  // array che contiene tutti i clienti ricevuti dal backend
  clienti: Cliente[] = [];

  // data scelta dall'utente per controllare le scadenze
  dataSelezionata: string = '';

  // array che contiene gli abbonamenti scaduti risultanti dal filtro
  clientiInScadenza: Cliente[] = [];


  // Constructor
  constructor(private clienteService: ClienteService, private corsoService: CorsoService) {

  // carica i clienti dal backend
  this.caricaClienti();

  // carica i corsi dal backend
  this.caricaCorsi();

}


// Funzione per caricare i clienti dal backend da iniettare nel CRUD
caricaClienti(): void {

    this.clienteService.getClienti().subscribe({

      next: (clienti) => {

      // salva i clienti ricevuti dal backend
      // nell'array del componente
      this.clienti = clienti;

      // conta i clienti ricevuti dal database
      // e aggiorna il signal
      this.totaleClienti.set(clienti.length);

      // se è già stata scelta una data
      // aggiorna anche il filtro delle scadenze
      if (this.dataSelezionata) {
        this.filtraScadenze();
      }

    },


      // viene eseguito se la richiesta HTTP fallisce
      error: (errore) => {

        console.error(
          'Errore nel caricamento dei clienti:',
          errore
        );

      }

    });

  }


  // Filtro scadenze 
  filtraScadenze(): void {

    // se non è stata selezionata nessuna data
    if (!this.dataSelezionata) {

      // svuota i risultati
      this.clientiInScadenza = [];

      return;

    }


    // trasforma la data scelta dall'utente da stringa a oggetto Date
    const dataLimite = new Date(
      this.dataSelezionata
    );


    // filtra l'array dei clienti che abbiamo precedentemente ricevuto dal backend
    this.clientiInScadenza = this.clienti.filter(
      cliente => {

        // trasforma la scadenza del cliente da stringa a oggetto Date
        const dataScadenza = new Date(
          cliente.scadenzaAbbonamento
        );


        // mantiene il cliente se la sua scadenza è precedente oppure uguale alla data selezionata
        return dataScadenza <= dataLimite;

      }
    );

}

// carica i corsi dal backend
caricaCorsi(): void {

  this.corsoService.getCorsi().subscribe({

    next: (corsi) => {

      // salva i corsi ricevuti dal database
      this.corsi = corsi;

      // aggiorna il numero totale dei corsi
      this.totaleCorsi.set(corsi.length);

    },

    error: (errore) => {

      console.error(
        'Errore nel caricamento dei corsi:',
        errore
      );

    }

  });

}

}