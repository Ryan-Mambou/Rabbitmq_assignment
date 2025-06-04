// Application JavaScript pour l'interface web RabbitMQ
class RabbitMQDashboard {
  constructor() {
    this.socket = io();
    this.logs = [];
    this.results = [];

    this.initEventListeners();
    this.initSocketListeners();
    this.initializeInterface();
  }

  initEventListeners() {
    // Formulaire de calcul
    document
      .getElementById("calculationForm")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        this.sendCalculation();
      });

    // Calcul aléatoire
    document.getElementById("randomCalc").addEventListener("click", () => {
      this.generateRandomCalculation();
    });

    // Effacer les résultats
    document.getElementById("clearResults").addEventListener("click", () => {
      this.clearResults();
    });

    // Effacer les logs
    document.getElementById("clearLogs").addEventListener("click", () => {
      this.clearLogs();
    });
  }

  initSocketListeners() {
    // Connexion Socket.IO
    this.socket.on("connect", () => {
      this.updateConnectionStatus(true);
      this.addLog("Connexion WebSocket établie", "success");
    });

    this.socket.on("disconnect", () => {
      this.updateConnectionStatus(false);
      this.addLog("Connexion WebSocket perdue", "error");
    });

    // Résultats de calcul
    this.socket.on("calculation-result", (result) => {
      this.addCalculationResult(result);
    });

    // Calcul envoyé
    this.socket.on("calculation-sent", (task) => {
      this.addLog(
        `Calcul envoyé: ${task.operand1} ${task.operation} ${task.operand2}`,
        "info"
      );
    });
  }

  initializeInterface() {
    // Remplir les champs avec des valeurs par défaut
    document.getElementById("operand1").value = "10";
    document.getElementById("operand2").value = "5";

    // Afficher le message initial
    this.addLog("Interface initialisée", "info");
  }

  updateConnectionStatus(connected) {
    const statusDot = document.getElementById("statusDot");
    const statusText = document.getElementById("statusText");

    if (connected) {
      statusDot.className = "status-dot connected";
      statusText.textContent = "Connecté";
    } else {
      statusDot.className = "status-dot disconnected";
      statusText.textContent = "Déconnecté";
    }
  }

  async sendCalculation() {
    const form = document.getElementById("calculationForm");
    const formData = new FormData(form);

    const calculation = {
      operation: formData.get("operation"),
      operand1: parseFloat(formData.get("operand1")),
      operand2: parseFloat(formData.get("operand2")),
    };

    try {
      const response = await fetch("/api/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(calculation),
      });

      const result = await response.json();

      if (response.ok) {
        this.showToast("Calcul envoyé avec succès!", "success");
        this.addLog(
          `Calcul envoyé: ${calculation.operand1} ${calculation.operation} ${calculation.operand2}`,
          "success"
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      this.showToast(`Erreur: ${error.message}`, "error");
      this.addLog(`Erreur d'envoi: ${error.message}`, "error");
    }
  }

  async generateRandomCalculation() {
    const operations = ["add", "sub", "mul", "div"];
    const randomOperation =
      operations[Math.floor(Math.random() * operations.length)];

    try {
      const response = await fetch("/api/calculate/random", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ operation: randomOperation }),
      });

      const result = await response.json();

      if (response.ok) {
        this.showToast("Calcul aléatoire envoyé!", "success");
        this.addLog(
          `Calcul aléatoire: ${result.task.operand1} ${result.task.operation} ${result.task.operand2}`,
          "success"
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      this.showToast(`Erreur: ${error.message}`, "error");
      this.addLog(`Erreur de calcul aléatoire: ${error.message}`, "error");
    }
  }

  addCalculationResult(result) {
    this.results.unshift(result);

    // Limiter le nombre de résultats affichés
    if (this.results.length > 50) {
      this.results = this.results.slice(0, 50);
    }

    this.updateResultsDisplay();
    this.addLog(
      `Résultat reçu: ${result.operand1} ${result.operation} ${
        result.operand2
      } = ${result.result || result.error}`,
      result.error ? "error" : "success"
    );
  }

  updateResultsDisplay() {
    const resultsContainer = document.getElementById("resultsContainer");

    if (this.results.length === 0) {
      resultsContainer.innerHTML =
        '<div class="no-results"><p>🔄 En attente de résultats...</p></div>';
      return;
    }

    resultsContainer.innerHTML = this.results
      .map((result) => {
        const isError = result.error;
        const operationEmoji = {
          add: "➕",
          sub: "➖",
          mul: "✖️",
          div: "➗",
        };

        const time = new Date(
          result.timestamp || result.processedAt
        ).toLocaleTimeString("fr-FR");

        return `
        <div class="result-item ${isError ? "error" : ""}">
          <div class="result-header">
            <span class="result-operation">
              ${
                operationEmoji[result.operation] || "🧮"
              } ${result.operation.toUpperCase()}
            </span>
            <span class="result-time">${time}</span>
          </div>
          <div class="result-calculation">
            ${result.operand1} ${result.operation} ${result.operand2} = 
            ${isError ? `❌ ${result.error}` : `✅ ${result.result}`}
          </div>
          <div class="result-details">
            ID: ${result.id} | Worker: ${result.workerId || "N/A"} | 
            Temps: ${
              result.processingTime ? `${result.processingTime}ms` : "N/A"
            }
          </div>
        </div>
      `;
      })
      .join("");
  }

  addLog(message, type = "info") {
    const timestamp = new Date().toLocaleTimeString("fr-FR");
    const logEntry = {
      message,
      type,
      timestamp,
    };

    this.logs.unshift(logEntry);

    // Limiter le nombre de logs
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(0, 100);
    }

    this.updateLogsDisplay();
  }

  updateLogsDisplay() {
    const logsContainer = document.getElementById("logsContainer");

    if (this.logs.length === 0) {
      logsContainer.innerHTML =
        '<div class="no-results"><p>📝 Aucun log disponible</p></div>';
      return;
    }

    logsContainer.innerHTML = this.logs
      .map((log) => {
        const typeEmoji = {
          info: "ℹ️",
          success: "✅",
          warning: "⚠️",
          error: "❌",
        };

        return `
        <div class="log-item ${log.type}">
          <span>${typeEmoji[log.type]} [${log.timestamp}] ${log.message}</span>
        </div>
      `;
      })
      .join("");
  }

  clearResults() {
    this.results = [];
    this.updateResultsDisplay();
    this.showToast("Résultats effacés", "info");
  }

  clearLogs() {
    this.logs = [];
    this.updateLogsDisplay();
    this.showToast("Logs effacés", "info");
  }

  showToast(message, type = "info") {
    const toastContainer = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const typeEmoji = {
      info: "ℹ️",
      success: "✅",
      warning: "⚠️",
      error: "❌",
    };

    toast.innerHTML = `${typeEmoji[type]} ${message}`;
    toastContainer.appendChild(toast);

    // Supprimer le toast après 4 secondes
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 4000);
  }
}

// Initialiser l'application quand le DOM est chargé
document.addEventListener("DOMContentLoaded", () => {
  new RabbitMQDashboard();
});

// Utilitaires globaux
window.formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleString("fr-FR");
};

window.formatNumber = (num) => {
  return new Intl.NumberFormat("fr-FR").format(num);
};
