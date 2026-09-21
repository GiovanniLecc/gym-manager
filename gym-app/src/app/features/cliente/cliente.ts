import { Component, signal } from '@angular/core';
import { Cliente } from '../../models/cliente';
import {
  ClienteService,
  ClienteInput
} from '../../services/clienteservice';

import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

import { CorsoService } from '../../services/corsoservice';
import { Corso } from '../../models/corso';


@Component({
  selector: 'app-cliente',
  imports: [FormsModule, DatePipe],
  templateUrl: './cliente.html',
  styleUrl: './cliente.css',
})

export class ClienteComponent {

  // Clienti ricevuti dal backend
  clienti = signal<Cliente[]>([]);


  // Corsi ricevuti dal backend
  corsi: Corso[] = [];


  // Dati del form per aggiungere un nuovo cliente
  newCliente: ClienteInput = {
    nome: '',
    cognome: '',
    email: '',
    corsoId: 0,
    scadenzaAbbonamento: ''
  };


  // Cliente attualmente in fase di modifica
  editingCliente: Cliente | null = null;


  // Messaggio da mostrare in caso di errore
  messaggioErrore: string = '';



  constructor(
    private clienteService: ClienteService,
    private corsoService: CorsoService
  ) {

    // Carica i dati iniziali
    this.caricaClienti();
    this.caricaCorsi();

  }



  // READ CLIENTI
  // Recupera tutti i clienti dal backend
  caricaClienti(): void {

    this.clienteService
      .getClienti()
      .subscribe({

        next: (clienti) => {

          // Aggiorna il signal
          this.clienti.set(clienti);

        },

        error: (errore) => {

          console.error(
            'Errore nel caricamento dei clienti:',
            errore
          );

          this.messaggioErrore =
            'Errore nel caricamento dei clienti';

        }

      });

  }



  // READ CORSI
  // Recupera tutti i corsi dal backend
  caricaCorsi(): void {

    this.corsoService
      .getCorsi()
      .subscribe({

        next: (corsi) => {

          this.corsi = corsi;

        },

        error: (errore) => {

          console.error(
            'Errore nel caricamento dei corsi:',
            errore
          );

        }

      });

  }



  // CREATE
  // Aggiunge un nuovo cliente
  addCliente(): void {

    // Cancella eventuali errori precedenti
    this.messaggioErrore = '';


    // Controlla che sia stato selezionato un corso
    if (!this.newCliente.corsoId) {

      this.messaggioErrore =
        'Seleziona un corso';

      return;

    }


    // Invia una sola richiesta al backend.
    // Sarà il backend a controllare i posti disponibili
    // e a scalarne uno dal corso.
    this.clienteService
      .addCliente(this.newCliente)
      .subscribe({

        next: () => {

          // Ricarica i clienti
          this.caricaClienti();

          // Ricarica i corsi perché il numero
          // dei posti disponibili è cambiato
          this.caricaCorsi();


          // Svuota il form
          this.newCliente = {
            nome: '',
            cognome: '',
            email: '',
            corsoId: 0,
            scadenzaAbbonamento: ''
          };

        },

        error: (errore) => {

          console.error(
            'Errore nell\'aggiunta del cliente:',
            errore
          );


          // Se il backend restituisce un messaggio,
          // utilizza quello.
          this.messaggioErrore =
            errore.error?.errore ||
            'Errore durante l\'aggiunta del cliente';

        }

      });

  }



  // DELETE
  // Elimina un cliente
  deleteCliente(id: number): void {

    this.messaggioErrore = '';


    // Angular invia solamente l'id.
    // Il backend elimina il cliente e libera
    // automaticamente il posto del suo corso.
    this.clienteService
      .deleteCliente(id)
      .subscribe({

        next: () => {

          // Aggiorna entrambe le liste
          this.caricaClienti();
          this.caricaCorsi();

        },

        error: (errore) => {

          console.error(
            'Errore nell\'eliminazione del cliente:',
            errore
          );

          this.messaggioErrore =
            errore.error?.errore ||
            'Errore durante l\'eliminazione del cliente';

        }

      });

  }



  // PREPARAZIONE UPDATE
  // Crea una copia del cliente selezionato
  startEdit(cliente: Cliente): void {

    this.editingCliente = {
      ...cliente
    };

    this.messaggioErrore = '';

  }



  // UPDATE
  // Modifica un cliente
  updateCliente(
    id: number,
    updatedCliente: Cliente
  ): void {

    this.messaggioErrore = '';


    // Prepariamo solamente i dati che il backend necessita.
    // corsoNome non viene inviato perché il backend
    // conosce il corso tramite corsoId.
    const clienteDaAggiornare: ClienteInput = {

      nome: updatedCliente.nome,

      cognome: updatedCliente.cognome,

      email: updatedCliente.email,

      corsoId: updatedCliente.corsoId,

      scadenzaAbbonamento:
        updatedCliente.scadenzaAbbonamento

    };


    // Una sola PUT.
    // Se il corso è cambiato, sarà il backend
    // a liberare il vecchio posto e occupare il nuovo.
    this.clienteService
      .updateCliente(
        id,
        clienteDaAggiornare
      )
      .subscribe({

        next: () => {

          // Ricarica i clienti modificati
          this.caricaClienti();

          // Ricarica anche i corsi perché
          // i posti potrebbero essere cambiati
          this.caricaCorsi();


          // Chiude il form di modifica
          this.editingCliente = null;

        },

        error: (errore) => {

          console.error(
            'Errore nella modifica del cliente:',
            errore
          );

          this.messaggioErrore =
            errore.error?.errore ||
            'Errore durante la modifica del cliente';

        }

      });

  }

}