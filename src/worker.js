const amqp = require("amqplib");
const config = require("./config");
const { performOperation, getRandomDelay, sleep, log } = require("./utils");

class CalculationWorker {
  constructor(operationType = "add") {
    this.connection = null;
    this.channel = null;
    this.operationType = operationType;
    this.workerId = `worker-${operationType}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  async connect() {
    try {
      log(`Worker ${this.workerId} se connecte à RabbitMQ...`);
      this.connection = await amqp.connect(config.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Déclaration de l'exchange
      await this.channel.assertExchange(config.EXCHANGE, "direct", {
        durable: true,
      });

      // Création des files d'attente
      for (const queueName of Object.values(config.QUEUES)) {
        await this.channel.assertQueue(queueName, { durable: true });
      }

      // Limite à 1 message par worker pour une distribution équitable
      await this.channel.prefetch(1);

      log(`Worker ${this.workerId} connecté avec succès`);
    } catch (error) {
      log(`Échec de connexion du worker ${this.workerId}`, error.message);
      process.exit(1);
    }
  }

  async processCalculation(message) {
    const { id, operand1, operand2, operation, timestamp } = message;

    log(`Worker ${this.workerId} traite le calcul`, {
      id,
      operand1,
      operand2,
      operation,
    });

    // Simulation d'un calcul complexe avec délai aléatoire
    const delay = getRandomDelay();
    log(`Worker ${this.workerId} simule un délai de calcul: ${delay}ms`);
    await sleep(delay);

    // Exécution du calcul
    const result = performOperation(operand1, operand2, operation);

    // Création du message de résultat
    const resultMessage = {
      id,
      operand1,
      operand2,
      operation,
      result,
      workerId: this.workerId,
      processedAt: new Date().toISOString(),
      receivedAt: timestamp,
      processingTime: delay,
    };

    // Envoi du résultat vers la file des résultats
    await this.channel.sendToQueue(
      config.QUEUES.RESULTS,
      Buffer.from(JSON.stringify(resultMessage)),
      { persistent: true }
    );

    log(`Worker ${this.workerId} a terminé le calcul`, { id, result });
  }

  async startWorking() {
    const queueName = config.QUEUES[this.operationType.toUpperCase()];

    if (!queueName) {
      log(`Type d'opération invalide: ${this.operationType}`);
      process.exit(1);
    }

    log(
      `Worker ${this.workerId} démarre le traitement des opérations ${this.operationType} depuis la file: ${queueName}`
    );

    await this.channel.consume(queueName, async (msg) => {
      if (msg !== null) {
        try {
          const message = JSON.parse(msg.content.toString());
          await this.processCalculation(message);
          this.channel.ack(msg);
        } catch (error) {
          log(
            `Erreur du worker ${this.workerId} lors du traitement`,
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
    log(`Connexion du worker ${this.workerId} fermée`);
  }
}

// Récupération du type d'opération depuis les arguments de la ligne de commande
const operationType = process.argv[2] || "add";

// Validation du type d'opération
const validOperations = ["add", "sub", "mul", "div"];
if (!validOperations.includes(operationType)) {
  console.error(`Type d'opération invalide: ${operationType}`);
  console.error(`Opérations valides: ${validOperations.join(", ")}`);
  process.exit(1);
}

// Gestion de l'arrêt propre du processus
const worker = new CalculationWorker(operationType);

process.on("SIGINT", async () => {
  log(`Signal SIGINT reçu. Arrêt en cours du worker ${worker.workerId}...`);
  await worker.close();
  process.exit(0);
});

// Démarrage du worker
async function main() {
  await worker.connect();
  await worker.startWorking();
}

main().catch((error) => {
  log(`Erreur du worker`, error.message);
  process.exit(1);
});
