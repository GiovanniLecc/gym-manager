import { Injectable } from '@angular/core';
import { Corso } from '../models/corso';
// richieste HTTP verso il backend
import { HttpClient } from '@angular/common/http';
// rappresenta una risposta asincrona
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CorsoService {

  // indirizzo dell'API dei corsi nel backend
  private apiUrl = 'http://localhost:3000/corsi';

  constructor(private http: HttpClient) {}
  
// READ richiede al backend tutti i corsi presenti nel database
getCorsi(): Observable<Corso[]> {
  return this.http.get<Corso[]>(this.apiUrl);
}

// CREATE invia al backend i dati del nuovo corso
addCorso(corso: Omit<Corso, 'id'>): Observable<Corso> {

  return this.http.post<Corso>(
    this.apiUrl,
    corso
  );

}

// DELETE chiede al backend di eliminare il corso tramite il suo id
deleteCorso(id: number): Observable<void> {

  return this.http.delete<void>(
    `${this.apiUrl}/${id}`
  );

}

// UPDATE invia al backend i nuovi dati del corso
updateCorso(
  id: number,
  updatedCorso: Omit<Corso, 'id'>
): Observable<Corso> {

  return this.http.put<Corso>(
    `${this.apiUrl}/${id}`,
    updatedCorso
  );

}

}
