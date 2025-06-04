const amqp = require("amqplib");
const config = require("./config");
const { log } = require("./utils");

class ResultConsumer {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.consumerId = `consumer-${Math.random().toString(36).substr(2, 9)}`;
    this.resultCount = 0;
  }

  async connect() {
    try {
      log(`Consumer ${this.consumerId} se connecte à RabbitMQ...`);
      this.connection = await amqp.connect(config.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Déclaration de la file des résultats
      await this.channel.assertQueue(config.QUEUES.RESULTS, { durable: true });

      // Traitement d'un message à la fois
      await this.channel.prefetch(1);

      log(`Consumer ${this.consumerId} connecté avec succès`);
    } catch (error) {
      log(`Échec de connexion du consumer ${this.consumerId}`, error.message);
      process.exit(1);
    }
  }

  displayResult(result) {
    this.resultCount++;

    console.log("\n" + "=".repeat(80));
    console.log(`📊 RÉSULTAT DE CALCUL #${this.resultCount}`);
    console.log("=".repeat(80));

    // Informations de base sur le calcul
    console.log(`📋 ID de la requête: ${result.id}`);
    console.log(
      `🔢 Opération: ${result.n1} ${this.getOperationSymbol(result.op)} ${
        result.n2
      } = ${result.result}`
    );
    console.log(`⚡ Type d'opération: ${result.op.toUpperCase()}`);

    // Informations sur le worker et les temps de traitement
    console.log(`🤖 Traité par: ${result.workerId}`);
    console.log(`⏱️  Temps de traitement: ${result.processingTime}ms`);
    console.log(`📨 Reçu à: ${result.receivedAt}`);
    console.log(`✅ Traité à: ${result.processedAt}`);

    // Calcul du temps total de la requête au résultat
    const receivedTime = new Date(result.receivedAt);
    const processedTime = new Date(result.processedAt);
    const totalTime = processedTime - receivedTime;
    console.log(`🕒 Temps total: ${totalTime}ms`);

    console.log("=".repeat(80));
  }

  getOperationSymbol(operation) {
    const symbols = {
      add: "+",
      sub: "-",
      mul: "×",
      div: "÷",
    };
    return symbols[operation] || operation;
  }

  async startConsuming() {
    log(
      `Consumer ${this.consumerId} démarre la consommation depuis la file: ${config.QUEUES.RESULTS}`
    );
    console.log(
      "\n🎯 En attente des résultats de calcul... (Ctrl+C pour quitter)\n"
    );

    await this.channel.consume(config.QUEUES.RESULTS, (msg) => {
      if (msg !== null) {
        try {
          const result = JSON.parse(msg.content.toString());
          this.displayResult(result);
          this.channel.ack(msg);
        } catch (error) {
          log(
            `Erreur du consumer ${this.consumerId} lors du traitement`,
            error.message
          );
          this.channel.nack(msg, false, false); // Rejette le message sans le remettre en file
        }
      }
    });
  }

  async close() {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
    log(`Connexion du consumer ${this.consumerId} fermée`);
  }

  printStatistics() {
    console.log("\n" + "=".repeat(50));
    console.log(`📈 STATISTIQUES DU CONSUMER`);
    console.log("=".repeat(50));
    console.log(`📊 Total des résultats traités: ${this.resultCount}`);
    console.log(`🎯 ID du consumer: ${this.consumerId}`);
    console.log("=".repeat(50));
  }
}

// Gestion de l'arrêt propre du processus
const consumer = new ResultConsumer();

process.on("SIGINT", async () => {
  console.log("\n");
  log(
    `Signal SIGINT reçu. Arrêt en cours du consumer ${consumer.consumerId}...`
  );
  consumer.printStatistics();
  await consumer.close();
  process.exit(0);
});

// Démarrage du consumer
async function main() {
  await consumer.connect();
  await consumer.startConsuming();
}

main().catch((error) => {
  log(`Erreur du consumer`, error.message);
  process.exit(1);
});
