const amqp = require("amqplib");
const config = require("./config");
const { generateOperands, getRandomOperation, log } = require("./utils");

class CalculationProducer {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.requestId = 0;
  }

  async connect() {
    try {
      log("Connexion au serveur RabbitMQ...");
      this.connection = await amqp.connect(config.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Déclaration de l'exchange pour router les messages
      await this.channel.assertExchange(config.EXCHANGE, "direct", {
        durable: true,
      });

      // Création des files d'attente pour chaque opération
      for (const queueName of Object.values(config.QUEUES)) {
        await this.channel.assertQueue(queueName, { durable: true });
      }

      // Liaison des files d'attente à l'exchange avec leurs clés de routage
      await this.channel.bindQueue(config.QUEUES.ADD, config.EXCHANGE, "add");
      await this.channel.bindQueue(config.QUEUES.SUB, config.EXCHANGE, "sub");
      await this.channel.bindQueue(config.QUEUES.MUL, config.EXCHANGE, "mul");
      await this.channel.bindQueue(config.QUEUES.DIV, config.EXCHANGE, "div");

      log("Connexion établie avec succès");
    } catch (error) {
      log("Échec de la connexion à RabbitMQ", error.message);
      process.exit(1);
    }
  }

  async sendCalculationRequest(operation, n1, n2) {
    const requestId = ++this.requestId;
    const message = {
      id: requestId,
      n1,
      n2,
      operation,
      timestamp: new Date().toISOString(),
    };

    try {
      if (operation === "all") {
        // Envoi vers toutes les files d'opérations
        const operations = ["add", "sub", "mul", "div"];
        for (const op of operations) {
          const allMessage = {
            ...message,
            operation: op,
            id: `${requestId}-${op}`,
          };
          await this.channel.publish(
            config.EXCHANGE,
            op,
            Buffer.from(JSON.stringify(allMessage)),
            { persistent: true }
          );
        }
        log(`Requête 'all' envoyée (ID: ${requestId}) vers tous les workers`, {
          n1,
          n2,
        });
      } else {
        // Envoi vers la file d'attente spécifique à l'opération
        await this.channel.publish(
          config.EXCHANGE,
          operation,
          Buffer.from(JSON.stringify(message)),
          { persistent: true }
        );
        log(`Requête ${operation} envoyée (ID: ${requestId})`, { n1, n2 });
      }
    } catch (error) {
      log("Erreur lors de l'envoi de la requête", error.message);
    }
  }

  async startProducing() {
    log(
      `Démarrage du producteur - envoi toutes les ${config.PRODUCER_INTERVAL}ms`
    );

    setInterval(async () => {
      const operands = generateOperands();
      const operation = getRandomOperation();

      await this.sendCalculationRequest(operation, operands.n1, operands.n2);
    }, config.PRODUCER_INTERVAL);
  }

  async close() {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
    log("Connexion du producteur fermée");
  }
}

// Gestion de l'arrêt propre du processus
process.on("SIGINT", async () => {
  log("Signal SIGINT reçu. Arrêt en cours du producteur...");
  if (producer) {
    await producer.close();
  }
  process.exit(0);
});

// Démarrage du producteur
const producer = new CalculationProducer();

async function main() {
  await producer.connect();
  await producer.startProducing();
}

main().catch((error) => {
  log("Erreur du producteur", error.message);
  process.exit(1);
});
