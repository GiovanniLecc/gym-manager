export interface Cliente {

    id: number;
    nome: string;
    cognome: string;
    email: string;
    // ID del corso associato al cliente
    corsoId: number;
    // Nome del corso, restituito dal backend tramite JOIN
    corsoNome: string;
    scadenzaAbbonamento: string;

}
