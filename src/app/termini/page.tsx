import type { Metadata } from 'next'
import { LegalPage } from '@/components/LegalPage'
import { CONTROLLER, APP_NAME, MIN_AGE } from '@/lib/legal'

export const metadata: Metadata = { title: `Termini d'uso — ${APP_NAME}` }

export default function TermsPage() {
  const c = CONTROLLER
  return (
    <LegalPage title="Termini d'uso">
      <p>
        Benvenuto su {APP_NAME}. Registrandoti accetti questi termini. Il servizio è offerto da {c.name}
        (contatto: <a href={`mailto:${c.email}`}>{c.email}</a>). Il trattamento dei tuoi dati è descritto
        nell&apos;<a href="/privacy">Informativa privacy</a>.
      </p>

      <h2>1. Il servizio</h2>
      <p>
        {APP_NAME} ti permette di catalogare i tuoi libri, seguire le tue letture, collegarti con amici, partecipare a book club
        (le cui conversazioni avvengono su Telegram) e ottenere stime di valore e testi per annunci di vendita.
        Il servizio è attualmente gratuito e in fase di sviluppo: alcune funzioni possono cambiare, essere sospese o interrompersi.
      </p>

      <h2>2. Account</h2>
      <ul>
        <li>Devi avere almeno {MIN_AGE} anni e fornire un indirizzo email valido.</li>
        <li>L&apos;account è personale: custodisci la password e non condividerla. Sei responsabile di ciò che avviene con il tuo account.</li>
        <li>Puoi eliminare l&apos;account in qualsiasi momento dal Profilo.</li>
      </ul>

      <h2>3. Regole di comportamento</h2>
      <p>Usando {APP_NAME}, e in particolare i book club, ti impegni a non:</p>
      <ul>
        <li>pubblicare contenuti offensivi, discriminatori, violenti, sessualmente espliciti o illegali;</li>
        <li>molestare altre persone o raccoglierne i dati personali;</li>
        <li>usare i book club per spam, truffe, pubblicità non richiesta o link diversi dai gruppi Telegram del club;</li>
        <li>violare diritti d&apos;autore (ad esempio condividendo copie pirata di libri);</li>
        <li>cercare di aggirare i limiti d&apos;uso, accedere ai dati di altri o danneggiare il servizio.</li>
      </ul>
      <p>
        Chiunque può segnalare un book club. I club segnalati da più persone vengono nascosti e possono essere rimossi.
        In caso di violazioni gravi o ripetute possiamo sospendere o chiudere l&apos;account.
      </p>

      <h2>4. Book club e Telegram</h2>
      <p>
        I gruppi di discussione sono creati e gestiti dagli utenti su Telegram, un servizio esterno con regole proprie.
        Chi crea un club è responsabile del gruppo e dei suoi contenuti. Non condividere dati personali sensibili e,
        se ti incontri con altre persone per scambiare libri, scegli luoghi pubblici.
      </p>

      <h2>5. Valutazioni, testi e contenuti generati</h2>
      <p>
        Le valutazioni di prezzo si basano su annunci pubblici trovati online e sono <b>stime indicative</b>, non perizie:
        i prezzi richiesti dai venditori possono essere diversi da quelli di vendita. Trame, consigli, annunci e riconoscimento
        dei libri sono prodotti in parte da sistemi di intelligenza artificiale e possono contenere errori: verificali prima di usarli,
        soprattutto in una vendita.
      </p>

      <h2>6. I tuoi contenuti</h2>
      <p>
        I dati e i testi che inserisci restano tuoi. Ci concedi solo il permesso di conservarli e mostrarli nei modi necessari
        a far funzionare il servizio (per esempio mostrare ai tuoi amici il libro che stai leggendo, se lo condividi).
      </p>

      <h2>7. Responsabilità</h2>
      <p>
        Il servizio è fornito &quot;così com&apos;è&quot;. Facciamo il possibile per mantenerlo sicuro e funzionante, ma non
        garantiamo che sia sempre disponibile o privo di errori. Nei limiti consentiti dalla legge, non rispondiamo di danni indiretti
        derivanti dall&apos;uso delle stime o dei contenuti generati, né dei rapporti tra utenti (scambi, vendite, incontri).
        Restano salvi i diritti che la legge riconosce ai consumatori.
      </p>

      <h2>8. Modifiche e legge applicabile</h2>
      <p>
        Possiamo aggiornare questi termini; le modifiche rilevanti ti saranno segnalate nell&apos;app. Si applica la legge italiana.
        Per i consumatori resta competente il foro del luogo di residenza.
      </p>
    </LegalPage>
  )
}
