import type { Metadata } from 'next'
import { LegalPage } from '@/components/LegalPage'
import { CONTROLLER, APP_NAME, APP_URL, MIN_AGE } from '@/lib/legal'

export const metadata: Metadata = { title: `Informativa privacy — ${APP_NAME}` }

export default function PrivacyPage() {
  const c = CONTROLLER
  return (
    <LegalPage title="Informativa sulla privacy">
      <p>
        Questa informativa spiega quali dati personali tratta {APP_NAME} ({APP_URL}), perché, per quanto tempo e quali
        diritti hai, ai sensi del Regolamento UE 2016/679 (&quot;GDPR&quot;) e del D.Lgs. 196/2003 come modificato dal D.Lgs. 101/2018.
      </p>

      <h2>1. Titolare del trattamento</h2>
      <p>
        {c.name}{c.kind ? ` (${c.kind})` : ''}{c.address ? `, ${c.address}` : ''}{c.vat ? `, P.IVA ${c.vat}` : ''}.<br />
        Per qualsiasi richiesta sulla privacy scrivi a <a href={`mailto:${c.email}`}>{c.email}</a>.
      </p>

      <h2>2. Quali dati trattiamo</h2>
      <ul>
        <li><b>Dati dell&apos;account:</b> email, nome che scegli, password (conservata solo in forma cifrata: nessuno, nemmeno noi, può leggerla), data e versione dei documenti che hai accettato.</li>
        <li><b>La tua libreria:</b> i libri che inserisci con titolo, autore, copertina, stato di lettura, voti, emozioni, note, posizione in casa, eventuali foto dello scaffale, prezzi di vendita e valutazioni.</li>
        <li><b>Dati sociali:</b> le amicizie create con i link d&apos;invito, il libro che stai leggendo e i tuoi generi preferiti (visibili ai tuoi amici solo se lasci attiva l&apos;opzione &quot;Condividi cosa leggi&quot;), i book club che crei o a cui ti iscrivi, le segnalazioni che invii.</li>
        <li><b>Foto che scatti per riconoscere i libri:</b> vengono usate solo per leggere titolo e autore e non vengono conservate da noi, salvo la copertina che decidi di tenere nella scheda.</li>
        <li><b>Dati tecnici:</b> indirizzo IP e informazioni del browser registrati automaticamente dai server per sicurezza e funzionamento; contatori giornalieri di utilizzo delle funzioni di intelligenza artificiale, per evitare abusi.</li>
      </ul>
      <p>Non trattiamo dati di pagamento e non ti chiediamo dati sensibili. Ti chiediamo di non inserirne nelle note o nei book club.</p>

      <h2>3. Perché li trattiamo e su quale base</h2>
      <ul>
        <li><b>Fornirti il servizio</b> (account, libreria salvata e sincronizzata, amici, book club, scansione, valutazioni, annunci): esecuzione del contratto che accetti registrandoti (art. 6.1.b GDPR).</li>
        <li><b>Sicurezza e prevenzione degli abusi</b> (protezione degli accessi, limiti d&apos;uso, gestione delle segnalazioni): legittimo interesse del titolare a proteggere il servizio e gli utenti (art. 6.1.f).</li>
        <li><b>Obblighi di legge</b> e richieste delle autorità (art. 6.1.c).</li>
      </ul>
      <p>Non usiamo i tuoi dati per pubblicità, non li vendiamo e non facciamo profilazione commerciale.</p>

      <h2>4. Chi li tratta per nostro conto</h2>
      <p>Per far funzionare {APP_NAME} ci appoggiamo a fornitori nominati responsabili del trattamento (art. 28 GDPR):</p>
      <ul>
        <li><b>Supabase</b> — database e gestione degli account. I dati sono conservati su server nell&apos;Unione Europea (Irlanda).</li>
        <li><b>Vercel</b> — ospita l&apos;app e i suoi server; le richieste possono essere elaborate negli Stati Uniti.</li>
        <li><b>Anthropic</b> — intelligenza artificiale che legge le foto dei libri e scrive trame, consigli, annunci e valutazioni. Riceve solo i dati del libro e le foto necessarie, non la tua email. Ha sede negli Stati Uniti.</li>
      </ul>
      <p>
        Per cercare informazioni sui libri interroghiamo anche Google Books, Open Library e Wikipedia, inviando solo titolo, autore o ISBN, mai dati che ti identificano.
        I gruppi dei book club si trovano su <b>Telegram</b>, un servizio esterno: entrandoci accetti le regole e l&apos;informativa privacy di Telegram, e quello che scrivi lì non passa da {APP_NAME}.
      </p>

      <h2>5. Trasferimenti fuori dall&apos;Unione Europea</h2>
      <p>
        Quando i dati sono elaborati negli Stati Uniti (Vercel, Anthropic), il trasferimento avviene sulla base del EU-US Data Privacy Framework
        o delle Clausole Contrattuali Standard approvate dalla Commissione Europea, con le garanzie previste dagli artt. 45-46 GDPR.
      </p>

      <h2>6. Per quanto tempo li conserviamo</h2>
      <ul>
        <li>Dati dell&apos;account, libreria, amicizie e book club: finché l&apos;account resta attivo. Se lo elimini, vengono cancellati subito e in modo definitivo.</li>
        <li>I libri che elimini dalla libreria lasciano solo un segnaposto senza contenuto, necessario per allineare i tuoi dispositivi; sparisce con l&apos;account.</li>
        <li>Log tecnici dei server: per il tempo previsto dai fornitori, di norma poche settimane.</li>
      </ul>

      <h2>7. I tuoi diritti</h2>
      <p>Puoi in ogni momento:</p>
      <ul>
        <li><b>accedere</b> ai tuoi dati e <b>riceverne una copia</b> in un formato leggibile (portabilità): in Profilo trovi &quot;Scarica i miei dati&quot;;</li>
        <li><b>correggerli</b> direttamente nell&apos;app;</li>
        <li><b>cancellarli</b>: in Profilo trovi &quot;Elimina account&quot;, che cancella tutto in modo definitivo;</li>
        <li><b>limitare</b> il trattamento od <b>opporti</b> a quello basato sul legittimo interesse, scrivendo a <a href={`mailto:${c.email}`}>{c.email}</a>;</li>
        <li><b>proporre reclamo</b> al Garante per la protezione dei dati personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">www.garanteprivacy.it</a>).</li>
      </ul>
      <p>Rispondiamo alle richieste entro 30 giorni.</p>

      <h2>8. Età minima</h2>
      <p>{APP_NAME} è riservata a chi ha almeno {MIN_AGE} anni. Se scopriamo un account di una persona più giovane, lo cancelliamo.</p>

      <h2>9. Cookie e memoria del dispositivo</h2>
      <p>
        {APP_NAME} non usa cookie di profilazione né strumenti di analisi o pubblicità. Usa solo la memoria tecnica del browser
        (localStorage) per tenerti collegato e per far funzionare la libreria anche senza connessione. Questi strumenti tecnici
        non richiedono consenso. Quando esci dall&apos;account, la memoria del dispositivo viene svuotata.
      </p>

      <h2>10. Sicurezza</h2>
      <p>
        Le comunicazioni sono sempre cifrate (HTTPS), le password sono cifrate, ogni utente può leggere e modificare solo i propri dati
        grazie a regole di accesso applicate direttamente dal database, e le funzioni più delicate hanno limiti d&apos;uso giornalieri.
        In caso di violazione dei dati che possa metterti a rischio, ti avviseremo e avviseremo il Garante come previsto dalla legge.
      </p>

      <h2>11. Modifiche</h2>
      <p>
        Se cambiamo questa informativa in modo rilevante te lo segnaleremo nell&apos;app. La data in alto indica l&apos;ultima versione.
      </p>
    </LegalPage>
  )
}
