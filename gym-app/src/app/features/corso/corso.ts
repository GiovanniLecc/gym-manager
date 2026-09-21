import { Component,signal } from '@angular/core';
import { Corso } from '../../models/corso';
import { CorsoService } from '../../services/corsoservice';
import { FormsModule } from '@angular/forms';

// importiamo ClienteService per controllare
// se un corso ha clienti iscritti prima di eliminarlo
import { ClienteService } from '../../services/clienteservice';


@Component({
  selector: 'app-corso',
  imports: [FormsModule],
  templateUrl: './corso.html',
  styleUrl: './corso.css',
})

export class CorsoComponent {

  // signal che contiene i corsi ricevuti dal backend
  corsi = signal<Corso[]>([]);  


  // variabile per selezionare i giorni senza scriverli
  giorni: string[] = [
    'Lunedì',
    'Martedì',
    'Mercoledì',
    'Giovedì',
    'Venerdì',
    'Sabato',
    'Domenica'
  ];


  // variabile per Create
  newCorso: Omit<Corso, 'id'> = {
    nome: '',
    giorno: '',
    orario: '',
    postiDisponibili: 20
  };


  // variabile per Update
  editingCorso: Corso | null = null;


  // variabile per messaggio di errore
  messaggioErrore: string = '';


  // Dependency Injection dei Service
  constructor(private corsoService: CorsoService,private clienteService: ClienteService) {
  // carica i corsi presenti nel database
  this.caricaCorsi();
  }

  // READ richiede i corsi al backend e aggiorna il signal
  caricaCorsi(): void {

    this.corsoService.getCorsi().subscribe({

      next: (corsi) => {

        // aggiorna il signal con i corsi ricevuti
        // Angular aggiornerà automaticamente l'HTML
        this.corsi.set(corsi);

      },

      error: (errore) => {

        console.error(
          'Errore nel caricamento dei corsi:',
          errore
        );

      }

    });

}

//CREATE con backend
addCorso(): void {

  // invia il nuovo corso al backend
  this.corsoService.addCorso(this.newCorso).subscribe({

    next: () => {

      // ricarica i corsi dal database
      // così compare subito anche quello appena aggiunto
      this.caricaCorsi();

      // svuota il form dopo l'aggiunta
      this.newCorso = {
        nome: '',
        giorno: '',
        orario: '',
        postiDisponibili: 20
      };

    },

    error: (errore) => {

      console.error(
        'Errore nell\'aggiunta del corso:',
        errore
      );

      this.messaggioErrore =
        'Errore durante l\'aggiunta del corso';

    }

  });

}

// Delete
deleteCorso(id: number): void {

  // azzera eventuali messaggi di errore precedenti
  this.messaggioErrore = '';

  // cerca il corso che vogliamo eliminare
  const corsoDaEliminare = this.corsi().find(
    corso => corso.id === id
  );

  if (!corsoDaEliminare) return;


  // prima controlliamo se ci sono clienti iscritti al corso
  this.clienteService.getClienti().subscribe({

    next: (clienti) => {

      const haClientiIscritti = clienti.some(
        cliente => cliente.corsoId === corsoDaEliminare.id
      );


      // se ci sono clienti iscritti, blocchiamo l'eliminazione
      if (haClientiIscritti) {

        this.messaggioErrore =
          'Impossibile eliminare il corso: ci sono clienti iscritti';

        return;
      }


      // se non ci sono clienti iscritti,
      // chiediamo al backend di eliminare il corso
      this.corsoService.deleteCorso(id).subscribe({

        next: () => {

          // eliminazione completata:
          // ricarichiamo i corsi dal database
          this.caricaCorsi();

        },

        error: (errore) => {

          console.error(
            'Errore nell\'eliminazione del corso:',
            errore
          );

          this.messaggioErrore =
            'Errore durante l\'eliminazione del corso';

        }

      });

    },

    error: (errore) => {

      console.error(
        'Errore nel recupero dei clienti:',
        errore
      );

      this.messaggioErrore =
        'Errore durante il controllo dei clienti iscritti';

    }

  });

}

// Preparazione Update
startEdit(corso: Corso): void {

 // assegna una copia del corso per modificarlo senza cambiare subito quello originale
 this.editingCorso = { ...corso };

}

updateCorso(
  id: number,
  updatedCorso: Omit<Corso, 'id'>
): void {

  // invia al backend i dati modificati del corso
  this.corsoService
    .updateCorso(id, updatedCorso)
    .subscribe({

      next: () => {

        // ricarica i corsi aggiornati dal database
        this.caricaCorsi();

        // chiude il form di modifica
        this.editingCorso = null;

      },

      error: (errore) => {

        console.error(
          'Errore nella modifica del corso:',
          errore
        );

        this.messaggioErrore =
          'Errore durante la modifica del corso';

      }

    });

}
}