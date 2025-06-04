const amqp = require("amqplib");
const config = require("../src/config");
const { performOperation, log } = require("../src/utils");

class SystemTester {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.testResults = [];
  }

  async connect() {
    try {
      log("Test: Connexion à RabbitMQ...");
      this.connection = await amqp.connect(config.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Déclaration de l'exchange et des files d'attente
      await this.channel.assertExchange(config.EXCHANGE, "direct", {
        durable: true,
      });

      for (const queueName of Object.values(config.QUEUES)) {
        await this.channel.assertQueue(queueName, { durable: true });
      }

      log("Test: Connexion à RabbitMQ réussie");
      return true;
    } catch (error) {
      log("Test: Échec de la connexion à RabbitMQ", error.message);
      return false;
    }
  }

  async testMathOperations() {
    log("Test: Vérification des opérations mathématiques...");

    const testCases = [
      { n1: 10, n2: 5, op: "add", expected: 15 },
      { n1: 10, n2: 5, op: "sub", expected: 5 },
      { n1: 10, n2: 5, op: "mul", expected: 50 },
      { n1: 10, n2: 5, op: "div", expected: 2 },
      { n1: 10, n2: 0, op: "div", expected: "Erreur: Division par zéro" },
    ];

    let passed = 0;
    let failed = 0;

    testCases.forEach((test) => {
      const result = performOperation(test.n1, test.n2, test.op);
      if (result === test.expected) {
        console.log(`✅ ${test.n1} ${test.op} ${test.n2} = ${result}`);
        passed++;
      } else {
        console.log(
          `❌ ${test.n1} ${test.op} ${test.n2} = ${result} (attendu: ${test.expected})`
        );
        failed++;
      }
    });

    log(
      `Test: Opérations mathématiques - ${passed} réussis, ${failed} échoués`
    );
    return failed === 0;
  }

  async testQueueConnection() {
    log("Test: Vérification de la connectivité des files d'attente...");

    try {
      // Test d'envoi d'un message vers chaque file d'attente
      const testMessage = {
        id: "test-001",
        n1: 5,
        n2: 3,
        operation: "add",
        timestamp: new Date().toISOString(),
      };

      const queues = ["ADD", "SUB", "MUL", "DIV"];
      for (const queue of queues) {
        const queueName = config.QUEUES[queue];
        await this.channel.sendToQueue(
          queueName,
          Buffer.from(
            JSON.stringify({ ...testMessage, operation: queue.toLowerCase() })
          ),
          { persistent: true }
        );
        console.log(
          `✅ Message de test envoyé avec succès vers la file ${queue}`
        );
      }

      // Test de la file des résultats
      await this.channel.sendToQueue(
        config.QUEUES.RESULTS,
        Buffer.from(
          JSON.stringify({
            ...testMessage,
            result: 8,
            workerId: "test-worker",
          })
        ),
        { persistent: true }
      );
      console.log(`✅ Message de test envoyé avec succès vers la file RESULTS`);

      log("Test: Connectivité des files d'attente - Tous les tests réussis");
      return true;
    } catch (error) {
      log("Test: Échec de la connectivité des files d'attente", error.message);
      return false;
    }
  }

  async testExchangeRouting() {
    log("Test: Vérification du routage par l'exchange...");

    try {
      // Liaison des files d'attente à l'exchange
      await this.channel.bindQueue(config.QUEUES.ADD, config.EXCHANGE, "add");
      await this.channel.bindQueue(config.QUEUES.SUB, config.EXCHANGE, "sub");
      await this.channel.bindQueue(config.QUEUES.MUL, config.EXCHANGE, "mul");
      await this.channel.bindQueue(config.QUEUES.DIV, config.EXCHANGE, "div");

      const testMessage = {
        id: "test-routing-001",
        n1: 12,
        n2: 4,
        timestamp: new Date().toISOString(),
      };

      // Test du routage vers les différentes files d'attente
      const operations = ["add", "sub", "mul", "div"];
      for (const op of operations) {
        await this.channel.publish(
          config.EXCHANGE,
          op,
          Buffer.from(JSON.stringify({ ...testMessage, operation: op })),
          { persistent: true }
        );
        console.log(`✅ Message ${op} routé avec succès via l'exchange`);
      }

      log("Test: Routage par l'exchange - Tous les tests réussis");
      return true;
    } catch (error) {
      log("Test: Échec du routage par l'exchange", error.message);
      return false;
    }
  }

  async checkRabbitMQStatus() {
    try {
      log("Test: Vérification du statut du serveur RabbitMQ...");

      // Tentative de récupération des infos de la file d'attente
      const queueInfo = await this.channel.checkQueue(config.QUEUES.RESULTS);
      console.log(`✅ Le serveur RabbitMQ fonctionne`);
      console.log(
        `📊 La file des résultats contient ${queueInfo.messageCount} messages`
      );

      return true;
    } catch (error) {
      log("Test: Échec de la vérification du serveur RabbitMQ", error.message);
      console.log(
        "❌ Assurez-vous que le serveur RabbitMQ fonctionne sur localhost:5672"
      );
      console.log("💡 Exécutez: docker-compose up -d pour démarrer RabbitMQ");
      return false;
    }
  }

  async runAllTests() {
    console.log("\n🧪 TESTS DU SYSTÈME DE CALCUL DISTRIBUÉ RABBITMQ");
    console.log("=".repeat(60));

    const tests = [
      { name: "Connexion RabbitMQ", test: () => this.connect() },
      { name: "Statut RabbitMQ", test: () => this.checkRabbitMQStatus() },
      {
        name: "Opérations mathématiques",
        test: () => this.testMathOperations(),
      },
      {
        name: "Connectivité des files",
        test: () => this.testQueueConnection(),
      },
      {
        name: "Routage par l'exchange",
        test: () => this.testExchangeRouting(),
      },
    ];

    let passed = 0;
    let failed = 0;

    for (const { name, test } of tests) {
      console.log(`\n🔍 Exécution du test: ${name}`);
      console.log("-".repeat(40));

      try {
        const result = await test();
        if (result) {
          console.log(`✅ ${name}: RÉUSSI`);
          passed++;
        } else {
          console.log(`❌ ${name}: ÉCHOUÉ`);
          failed++;
        }
      } catch (error) {
        console.log(`❌ ${name}: ERREUR - ${error.message}`);
        failed++;
      }
    }

    console.log("\n📊 RÉSUMÉ DES TESTS");
    console.log("=".repeat(30));
    console.log(`✅ Réussis: ${passed}`);
    console.log(`❌ Échoués: ${failed}`);
    console.log(
      `📈 Taux de réussite: ${Math.round((passed / (passed + failed)) * 100)}%`
    );

    if (failed === 0) {
      console.log(
        "\n🎉 Tous les tests sont réussis! Le système est prêt à être utilisé."
      );
    } else {
      console.log(
        "\n⚠️  Certains tests ont échoué. Veuillez vérifier la configuration."
      );
    }

    return failed === 0;
  }

  async close() {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }
}

// Exécution des tests
async function main() {
  const tester = new SystemTester();

  try {
    const success = await tester.runAllTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    log("Erreur du lanceur de tests", error.message);
    process.exit(1);
  } finally {
    await tester.close();
  }
}

main();
