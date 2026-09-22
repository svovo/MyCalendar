# MyCalendar 🗓️
Web App completa, moderna e responsive per la gestione del tempo, dei calendari sovrapponibili e delle attività (To-Do List).

---

## ✨ Funzionalità Principali

### 1. 📌 Sidebar Sinistra (Gestione Calendari e Sovrapposizione)
- **Creazione Calendari Personalizzati**: Assegna un nome e un colore dedicato scegliendo da una palette moderna o con selettore HEX.
- **Modifica & Cancellazione**: Modifica nome e colore dei calendari esistenti o eliminali con rimozione sicura degli eventi.
- **Sovrapposizione Dinamica (Filtro Istantaneo)**: Tramite le caselle di controllo (checkbox), puoi attivare o disattivare singoli calendari. Il calendario centrale mostrerà solo gli impegni appartenenti ai calendari attualmente attivati, aggiornandosi all'istante senza ricaricare la pagina.
- **Azioni Veloci**: Attivazione o disattivazione rapida con un clic ("Tutti" / "Nessuno").

### 2. 📅 Sezione Centrale (Calendario Principale ed Eventi)
- **3 Viste Temporali**:
  - **Mese**: Panoramica completa con griglia a 7 colonne (Lunedì - Domenica) ed etichette data chiare.
  - **Settimana**: Dettaglio orario (00:00 - 23:00 con scroll fluido) con intestazione esplicita per ciascun giorno (es. *"Lunedì 15"*).
  - **Giorno**: Vista a singola colonna con schede orarie espanse per note e impegni del singolo giorno.
- **Navigazione Semplice**: Tasti *"Precedente"*, *"Successivo"* e *"Oggi"* per tornare istantaneamente alla data corrente.
- **Gestione Impegni (CRUD)**:
  - Clic su qualsiasi data o fascia oraria per aggiungere un nuovo evento.
  - Campi: Titolo, Calendario di appartenenza, Data, Orario Inizio, Orario Fine, Note.
  - Colori dinamici ereditati dal calendario selezionato.
  - Clic su un evento esistente per rinominarlo, modificare gli orari, spostarlo di giorno o eliminarlo.
- **🔁 Ripetizione Rapida Eventi (Copia-Incolla Settimanale)**:
  - Pulsante *"Copia Impegni"* nella barra superiore per attivare la modalità di selezione multipla.
  - Clicca su uno o più impegni nel calendario per evidenziarli con il badge di spunta.
  - Clicca *"Ripeti Eventi"* per aprire il popup e scegliere per quante settimane successive duplicarli (es. 1, 2, 4, 8 o 12 settimane).
  - Il sistema calcola automaticamente le date future (aggiungendo blocchi di 7 giorni) preservando orari, calendario e giorno della settimana.
  - Salvataggio automatico e aggiornamento istantaneo del calendario.

### 3. ✅ Sidebar Destra (To-Do List Indipendente)
- Bacheca autonoma per attività non vincolate a un orario specifico.
- Inserimento rapido tramite tasto Invio o pulsante "+".
- Checkbox per contrassegnare le attività completate (con testo barrato ed evidenziazione visiva).
- Filtri: *"Tutte"*, *"Da fare"*, *"Fatte"*.
- Rimozione selettiva con pulsante cestino o pulizia in blocco delle attività completate.

### 4. 📱 Design Responsive (Desktop & Mobile)
- **Desktop (>= 1024px)**: Layout fisso e armonioso a 3 colonne (Calendari a sinistra, Calendario al centro, To-Do a destra).
- **Mobile (< 1024px)**: Il calendario centrale occupa il 100% dello schermo. Le sezioni laterali sono comodamente accessibili tramite **menu a comparsa (Offcanvas / Drawers)** con sfondo oscurato e gesture di chiusura.

### 5. 💾 Persistenza Dati
- Salvataggio automatico e trasparente su `localStorage` del browser: calendari, eventi, preferenze di visualizzazione e to-do list vengono conservati ad ogni sessione.
- Dati demo realistici pre-caricati al primo avvio.

---

## 👤 Gestione Utenti Locali (Multi-Utente)
- **Schermata Iniziale**: All'avvio l'app mostra una schermata pulita per inserire il **Nome Utente** e cliccare **"Entra"**.
- **Isolamento Completo dei Dati**: I calendari, eventi e to-do list sono associati esclusivamente a quel Nome Utente.
- **Salvataggio Locale**: Se l'app gira in Electron, i dati vengono scritti su file JSON dedicati (`dati_<nomeutente>.json`). Se aperta nel browser, i dati sono salvati in chiavi `localStorage` separate per ciascun profilo.
- **Accesso Rapido**: Mostra i profili usati di recente per accedervi con un solo clic.
- **Cambio Profilo**: In qualsiasi momento è possibile cliccare l'icona di uscita accanto al nome utente nella barra in alto per tornare alla schermata iniziale e cambiare utente.

---

## 🖥️ Come Avviare l'App su PC

### Metodo 1: Avvio come vera Applicazione Desktop Nativa (Electron)
Se hai Node.js installato:
1. Apri un terminale nella cartella del progetto:
   ```cmd
   cd C:\Users\HP\.gemini\antigravity\scratch\mycalendar
   ```
2. Installa Electron (se non presente globalmente):
   ```cmd
   npm install electron
   ```
3. Avvia l'app nativa:
   ```cmd
   npm start
   ```
   oppure:
   ```cmd
   npx electron .
   ```

### Metodo 2: Doppio Clic Diretto
Fai doppio clic sul file [`start.bat`](file:///C:/Users/HP/.gemini/antigravity/scratch/mycalendar/start.bat) oppure apri [`index.html`](file:///C:/Users/HP/.gemini/antigravity/scratch/mycalendar/index.html).
Lo script rileva automaticamente se Electron è installato e lo usa; altrimenti avvia l'interfaccia nel browser mantenendo attiva al 100% la gestione multi-utente e l'isolamento dei dati.
