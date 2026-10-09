// Načítá se před každým testovacím souborem (`node --test --import`).
//
// Testy importují caio-server (přes server/email/send.js) a jeho index při importu načte
// .env.development -- s MONGODB_URI by DAO otevřelo spojení do Monga a testovací proces by
// na otevřeném spojení nikdy neskončil. Prázdná hodnota tu zůstane, protože dotenv existující
// proměnné nepřepisuje.
process.env.MONGODB_URI = "";
