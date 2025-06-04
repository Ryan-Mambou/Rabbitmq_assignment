const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const amqp = require("amqplib");
const config = require("./config");
const { generateOperands } = require("./utils");

class WebServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server);
    this.connection = null;
    this.channel = null;
    this.workers = new Map(); // Suivi des workers actifs

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, "../web")));
  }

  setupRoutes() {
    // Page principale
    this.app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "../web/index.html"));
    });

    // API de statut du système
    this.app.get("/api/status", async (req, res) => {
      try {
        const status = await this.getSystemStatus();
        res.json(status);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // API pour envoyer un calcul
    this.app.post("/api/calculate", async (req, res) => {
      try {
        const { operation, operand1, operand2 } = req.body;
        const result = await this.sendCalculation(
          operation,
          operand1,
          operand2
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // API pour envoyer un calcul aléatoire
    this.app.post("/api/calculate/random", async (req, res) => {
      try {
        const { operation } = req.body;
        const operands = generateOperands();
        console.log("Aleatoire -->", operands);
        const result = await this.sendCalculation(
          operation,
          operands.n1,
          operands.n2
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // API pour tester la connexion
    this.app.get("/api/test-connection", async (req, res) => {
      try {
        await this.testConnection();
        res.json({ success: true, message: "Connexion RabbitMQ réussie" });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  setupSocketIO() {
    this.io.on("connection", (socket) => {
      console.log("Client connecté:", socket.id);

      // Envoyer le statut initial
      this.getSystemStatus().then((status) => {
        socket.emit("system-status", status);
      });

      // Gérer la déconnexion
      socket.on("disconnect", () => {
        console.log("Client déconnecté:", socket.id);
      });
    });
  }

  async connectRabbitMQ() {
    try {
      this.connection = await amqp.connect(config.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Configurer l'exchange et les files
      await this.channel.assertExchange(config.EXCHANGE, "direct", {
        durable: true,
      });

      for (const queueName of Object.values(config.QUEUES)) {
        await this.channel.assertQueue(queueName, { durable: true });
      }

      // Bind les files à l'exchange
      await this.channel.bindQueue(config.QUEUES.ADD, config.EXCHANGE, "add");
      await this.channel.bindQueue(config.QUEUES.SUB, config.EXCHANGE, "sub");
      await this.channel.bindQueue(config.QUEUES.MUL, config.EXCHANGE, "mul");
      await this.channel.bindQueue(config.QUEUES.DIV, config.EXCHANGE, "div");

      // Écouter les résultats
      await this.listenForResults();

      console.log("✅ Connexion RabbitMQ établie");
    } catch (error) {
      console.error("❌ Erreur de connexion RabbitMQ:", error.message);
      throw error;
    }
  }

  async listenForResults() {
    await this.channel.consume(config.QUEUES.RESULTS, (message) => {
      if (message) {
        const result = JSON.parse(message.content.toString());

        // Diffuser le résultat à tous les clients connectés
        this.io.emit("calculation-result", {
          ...result,
          timestamp: new Date().toISOString(),
        });

        this.channel.ack(message);
      }
    });
  }

  async sendCalculation(operation, operand1, operand2) {
    if (!this.channel) {
      await this.connectRabbitMQ();
    }

    const taskId = Date.now().toString();
    const task = {
      id: taskId,
      operation,
      operand1: parseFloat(operand1),
      operand2: parseFloat(operand2),
      timestamp: new Date().toISOString(),
    };

    if (operation === "all") {
      // Envoyer à tous les types de workers
      const operations = ["add", "sub", "mul", "div"];
      for (const op of operations) {
        const specificTask = { ...task, operation: op, id: `${taskId}-${op}` };
        await this.channel.publish(
          config.EXCHANGE,
          op,
          Buffer.from(JSON.stringify(specificTask)),
          { persistent: true }
        );
      }
    } else {
      await this.channel.publish(
        config.EXCHANGE,
        operation,
        Buffer.from(JSON.stringify(task)),
        { persistent: true }
      );
    }

    // Diffuser l'envoi du calcul
    this.io.emit("calculation-sent", task);

    return { success: true, task };
  }

  async getSystemStatus() {
    const status = {
      rabbitmqConnected: !!this.connection,
      activeWorkers: this.workers.size,
      timestamp: new Date().toISOString(),
      queues: {},
    };

    if (this.channel) {
      try {
        // Vérifier les files d'attente
        for (const [key, queueName] of Object.entries(config.QUEUES)) {
          const queueInfo = await this.channel.checkQueue(queueName);
          status.queues[key] = {
            name: queueName,
            messageCount: queueInfo.messageCount,
            consumerCount: queueInfo.consumerCount,
          };
        }
      } catch (error) {
        status.error = error.message;
      }
    }

    return status;
  }

  async testConnection() {
    const testConnection = await amqp.connect(config.RABBITMQ_URL);
    await testConnection.close();
    return true;
  }

  async start(port = 3000) {
    try {
      await this.connectRabbitMQ();

      this.server.listen(port, () => {
        console.log(`🚀 Serveur web démarré sur http://localhost:${port}`);
        console.log(`📊 Interface d'administration disponible`);
      });

      // Mettre à jour le statut toutes les 5 secondes
      setInterval(async () => {
        const status = await this.getSystemStatus();
        this.io.emit("system-status", status);
      }, 5000);
    } catch (error) {
      console.error("❌ Erreur de démarrage du serveur:", error);
      process.exit(1);
    }
  }

  async stop() {
    if (this.connection) {
      await this.connection.close();
    }
    this.server.close();
  }
}

// Démarrer le serveur si ce fichier est exécuté directement
if (require.main === module) {
  const server = new WebServer();
  server.start(3000);

  // Gérer l'arrêt propre
  process.on("SIGINT", async () => {
    console.log("\n🛑 Arrêt du serveur...");
    await server.stop();
    process.exit(0);
  });
}

module.exports = WebServer;
