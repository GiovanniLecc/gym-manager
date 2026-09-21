import { Injectable } from '@angular/core';
import { Cliente } from '../models/cliente';

// Richieste HTTP verso il backend
import { HttpClient } from '@angular/common/http';

// Rappresenta una risposta asincrona
import { Observable } from 'rxjs';


// Dati necessari per creare o modificare un cliente.
// Non servono:
// - id, perché viene gestito dal database
// - corsoNome, perché il backend lo ricava tramite JOIN
export type ClienteInput = Omit<Cliente, 'id' | 'corsoNome'>;


@Injectable({
  providedIn: 'root',
})

export class ClienteService {

  // Indirizzo delle API del backend
  private apiUrl = 'http://localhost:3000/clienti';


  // HttpClient permette di comunicare con il backend
  constructor(private http: HttpClient) {}


  // READ
  getClienti(): Observable<Cliente[]> {

    return this.http.get<Cliente[]>(this.apiUrl);

  }


  // CREATE
  addCliente(
    cliente: ClienteInput
  ): Observable<Cliente> {

    return this.http.post<Cliente>(
      this.apiUrl,
      cliente
    );

  }


  // DELETE
  deleteCliente(id: number): Observable<void> {

    return this.http.delete<void>(
      `${this.apiUrl}/${id}`
    );

  }


  // UPDATE
  updateCliente(
    id: number,
    updatedCliente: ClienteInput
  ): Observable<Cliente> {

    return this.http.put<Cliente>(
      `${this.apiUrl}/${id}`,
      updatedCliente
    );

  }

}